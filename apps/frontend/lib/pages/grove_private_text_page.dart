import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/grove_private_config.dart';
import '../config/grove_private_session.dart';
import '../environment/grove_private_conversations.dart';

/// DRAFT Grove-only Text UI. It does not expose legacy Firefly chat/voice,
/// create a Firefly conversation, issue project grants, or execute ARK work.
/// The caller MUST first pass GrovePrivateAuthGate/ProjectGate and use a
/// separately configured Grove host. Build flag remains OFF by default.
class GrovePrivateTextHost extends StatefulWidget {
  const GrovePrivateTextHost({super.key});

  @override
  State<GrovePrivateTextHost> createState() => _GrovePrivateTextHostState();
}

class _GrovePrivateTextHostState extends State<GrovePrivateTextHost> {
  StreamSubscription<AuthState>? _auth;
  StreamSubscription<String>? _scopeChange;
  ArborApiClient? _api;
  String? _userId;
  String? _token;
  String? _projectId;
  String? _selectedId;
  bool _loading = true;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _auth = Supabase.instance.client.auth.onAuthStateChange.listen(
      (_) => unawaited(_reload()),
    );
    _scopeChange = ArborSession.instance.contextChanges.listen(
      (_) => unawaited(_reload()),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_reload());
    });
  }

  bool _sameSession(String id, String token, String projectId) {
    final s = Supabase.instance.client.auth.currentSession;
    return s != null && s.user.id == id && s.accessToken == token &&
        GrovePrivateSession.belongsToRealm(
          token: token, authUrl: GrovePrivateConfig.fromBuild.authUrl,
        ) && ArborSession.instance.peek(id)?.projectId == projectId;
  }

  Future<void> _reload() async {
    final generation = ++_generation;
    _api?.close();
    _api = null;
    if (!mounted) return;
    // Unmount private content IMMEDIATELY when account/project changes.
    setState(() {
      _loading = true;
      _userId = null;
      _token = null;
      _projectId = null;
      _selectedId = null;
    });
    try {
      final config = GrovePrivateConfig.fromBuild;
      final session = Supabase.instance.client.auth.currentSession;
      if (!config.ready || session == null ||
          !GrovePrivateSession.belongsToRealm(
            token: session.accessToken, authUrl: config.authUrl,
          )) throw StateError('Private realm not authorized');
      final id = session.user.id;
      final token = session.accessToken;
      final scope = await ArborSession.instance.contextFor(id);
      if (!mounted || generation != _generation) return;
      if (scope == null || scope.projectId.isEmpty ||
          !_sameSession(id, token, scope.projectId)) {
        throw StateError('No verified Grove project');
      }
      final api = ArborApiClient(baseUrl: config.apiUrl);
      if (!mounted || generation != _generation) {
        api.close();
        return;
      }
      _api = api;
      setState(() {
        _userId = id;
        _token = token;
        _projectId = scope.projectId;
        _selectedId = scope.conversationId;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || generation != _generation) return;
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    ++_generation;
    _auth?.cancel();
    _scopeChange?.cancel();
    _api?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    final id = _userId;
    final token = _token;
    final project = _projectId;
    final api = _api;
    if (id == null || token == null || project == null || api == null) {
      return const Center(child: Text(
        'Private Grove project access is not ready.',
        style: TextStyle(color: Colors.white70),
      ));
    }
    return GrovePrivateTextPanel(
      // Do not put a private bearer token in widget keys or diagnostics.
      // The auth listener unmounts the entire panel on token rotation.
      key: ValueKey('$id:$project'),
      client: GrovePrivateConversationClient(
        api: api, config: GrovePrivateConfig.fromBuild, enabled: true,
      ),
      projectId: project,
      initialConversationId: _selectedId,
      sessionStillValid: () => _sameSession(id, token, project),
      onConversationSelected: (conversationId) async {
        if (!_sameSession(id, token, project)) {
          throw StateError('Private scope changed');
        }
        // The panel only passes IDs returned by the approved Grove API.
        // Avoid a session-change/list-reload loop for an already-adopted ID.
        if (ArborSession.instance.peek(id)?.conversationId == conversationId) {
          return;
        }
        // The backend checks ownership AGAIN for every private model turn.
        await ArborSession.instance.adopt(
          userId: id, projectId: project,
          conversationId: conversationId,
        );
      },
    );
  }
}

String _newRequestId() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final h = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return h.substring(0, 8) + '-' + h.substring(8, 12) + '-' +
      h.substring(12, 16) + '-' + h.substring(16, 20) + '-' +
      h.substring(20);
}

/// Private scoped Text surface: no browser-selected owner, model roles,
/// knowledge payloads or tool permission. A changed session unmounts the UI.
class GrovePrivateTextPanel extends StatefulWidget {
  const GrovePrivateTextPanel({
    super.key,
    required this.client,
    required this.projectId,
    required this.sessionStillValid,
    required this.onConversationSelected,
    this.initialConversationId,
  });

  final GrovePrivateConversationClient client;
  final String projectId;
  final String? initialConversationId;
  final bool Function() sessionStillValid;
  final Future<void> Function(String conversationId) onConversationSelected;

  @override
  State<GrovePrivateTextPanel> createState() => _GrovePrivateTextPanelState();
}

class _GrovePrivateTextPanelState extends State<GrovePrivateTextPanel> {
  final _input = TextEditingController();
  GrovePrivateConversationChoices? _choices;
  GrovePrivateHistory? _history;
  String? _selected;
  String? _pendingId;
  String? _pendingText;
  String? _unsavedReply;
  String? _error;
  bool _loading = true;
  bool _sending = false;
  int _generation = 0;

  bool get _valid => mounted && widget.sessionStillValid();

  @override
  void initState() {
    super.initState();
    unawaited(_discover());
  }

  @override
  void didUpdateWidget(GrovePrivateTextPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.projectId != widget.projectId ||
        oldWidget.client != widget.client) {
      _generation++;
      _input.clear();
      _choices = null;
      _history = null;
      _selected = null;
      _pendingId = null;
      _pendingText = null;
      _unsavedReply = null;
      _error = null;
      unawaited(_discover());
    }
  }

  Future<void> _discover() async {
    final generation = ++_generation;
    if (!_valid) return;
    setState(() { _loading = true; _error = null; });
    try {
      final choices = await widget.client.listExisting(widget.projectId);
      if (!_valid || generation != _generation) return;
      final selected = choices.conversations.any((c) =>
          c.conversationId == widget.initialConversationId)
          ? widget.initialConversationId
          : choices.conversations.length == 1
              ? choices.conversations.single.conversationId : null;
      setState(() { _choices = choices; _loading = selected != null; });
      if (selected != null) await _choose(selected, generation: generation);
    } catch (_) {
      if (!_valid || generation != _generation) return;
      setState(() {
        _loading = false;
        _error = 'Private Grove conversations could not be verified.';
      });
    }
  }

  Future<void> _choose(String id, {int? generation}) async {
    final current = generation ?? ++_generation;
    if (!_valid || !(_choices?.conversations.any(
      (c) => c.conversationId == id,
    ) ?? false)) return;
    setState(() {
      _loading = true;
      _selected = null;
      _history = null;
      _pendingId = null;
      _pendingText = null;
      _unsavedReply = null;
      _error = null;
      _input.clear();
    });
    try {
      final history = await widget.client.loadRecent(
        projectId: widget.projectId, conversationId: id,
      );
      if (!_valid || current != _generation) return;
      await widget.onConversationSelected(id);
      if (!_valid || current != _generation) return;
      setState(() {
        _selected = id;
        _history = history;
        _loading = false;
      });
    } catch (_) {
      if (!_valid || current != _generation) return;
      setState(() {
        _loading = false;
        _error = 'Grove could not open that private conversation.';
      });
    }
  }

  Future<void> _send() async {
    final id = _selected;
    final message = _input.text.trim();
    if (_sending || _loading || !_valid || id == null ||
        message.isEmpty || message.length > 3000) return;
    if (_pendingText != message || _pendingId == null) {
      _pendingText = message;
      _pendingId = _newRequestId();
    }
    final requestId = _pendingId!;
    final generation = _generation;
    setState(() { _sending = true; _error = null; });
    try {
      final reply = await widget.client.send(
        projectId: widget.projectId, conversationId: id,
        requestId: requestId, text: message,
      );
      if (!_valid || generation != _generation) return;
      GrovePrivateHistory? history;
      if (reply.persisted) {
        history = await widget.client.loadRecent(
          projectId: widget.projectId, conversationId: id,
        );
      }
      if (!_valid || generation != _generation) return;
      setState(() {
        _history = history ?? _history;
        _unsavedReply = reply.persisted ? null : reply.text;
        _input.clear();
        _pendingId = null;
        _pendingText = null;
        _sending = false;
      });
    } catch (_) {
      if (!_valid || generation != _generation) return;
      // Keep the original ID + text on uncertain network outcomes.
      setState(() {
        _sending = false;
        _error = 'Grove could not confirm that reply. '
            'Retry unchanged text or change it to start a new turn.';
      });
    }
  }

  @override
  void dispose() {
    ++_generation;
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.sessionStillValid()) {
      return const Center(child: Text(
        'Private Grove access changed. Recheck your invitation.',
        style: TextStyle(color: Colors.white70),
      ));
    }
    final choices = _choices;
    return ColoredBox(
      color: const Color(0xFF0A1819),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            const Text('THE GROVE · PRIVATE TEXT',
              style: TextStyle(color: Color(0xFF91DAD2),
                  fontWeight: FontWeight.w600, letterSpacing: 1.1)),
            if (_loading) const LinearProgressIndicator(),
            if (!_loading && choices != null && choices.conversations.isEmpty)
              const Text('No existing conversation is approved for this '
                  'project. Grove will not invent one.',
                style: TextStyle(color: Colors.white70)),
            if (!_loading && choices != null &&
                choices.conversations.isNotEmpty)
              DropdownButton<String>(
                isExpanded: true,
                value: _selected,
                hint: const Text('Choose an existing conversation'),
                items: choices.conversations.map((c) =>
                  DropdownMenuItem<String>(
                    value: c.conversationId,
                    child: Text(c.updatedAt.toLocal().toString() + ' · ' +
                      c.conversationId.substring(0, 8) + '…',
                      overflow: TextOverflow.ellipsis),
                  ),
                ).toList(),
                onChanged: _sending ? null : (id) {
                  if (id != null) unawaited(_choose(id));
                },
              ),
            if (choices?.mayBeTruncated == true)
              const Text('Showing the latest 20 conversations only.',
                  style: TextStyle(color: Colors.white70)),
            if (_error != null)
              Text(_error!, style: const TextStyle(
                  color: Colors.orangeAccent)),
            Expanded(
              child: _history == null
                ? const Center(child: Text(
                    'Choose an authorized private conversation.',
                    style: TextStyle(color: Colors.white70)))
                : ListView(
                    key: ValueKey(_selected),
                    children: [
                      if (_history!.mayBeTruncated)
                        const Text('Showing six recent complete turns only.',
                          style: TextStyle(color: Colors.white70)),
                      for (final turn in _history!.turnsNewestFirst.reversed)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Card(child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(turn.userText))),
                            Card(child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(turn.assistantText))),
                          ],
                        ),
                      if (_unsavedReply != null)
                        Card(child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(_unsavedReply! +
                              '\nThis reply was not saved.'))),
                    ],
                  ),
            ),
            if (_selected != null) ...[
              TextField(
                controller: _input,
                enabled: !_sending && !_loading,
                maxLength: 3000,
                maxLines: 4,
                minLines: 1,
                decoration: const InputDecoration(
                  labelText: 'Talk to Arbor privately',
                  border: OutlineInputBorder(),
                ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: _sending || _loading ? null : _send,
                  child: Text(_sending ? 'Waiting for Arbor…' : 'Send'),
                ),
              ),
              const Text(
                'Model text is not a verified ARK action. '
                'Private Voice and autonomous execution remain OFF.',
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
