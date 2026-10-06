import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/grove_private_config.dart';
import '../config/grove_private_session.dart';
import '../environment/grove_private_conversations.dart';
import '../environment/grove_pending_turn_store.dart';

/// New-thread WRITE opt-in is separate from read-only private Text. Both are
/// compile-time OFF in ordinary phone builds, AND server flags are independent.
const bool _groveNewConversationEnabled = bool.fromEnvironment(
  'GROVE_PRIVATE_NEW_CONVERSATION_PREVIEW', defaultValue: false,
);

/// DRAFT Grove-only Text UI. It does not expose legacy Firefly chat/voice,
/// auto-create a Firefly conversation, issue project grants, or execute ARK work.
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
      pendingStore: GrovePendingTurnStore(
        userId: id, projectId: project,
        apiOrigin: GrovePrivateConfig.fromBuild.apiUrl,
        authOrigin: GrovePrivateConfig.fromBuild.authUrl,
      ),
      allowNewConversations: _groveNewConversationEnabled,
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
    this.pendingStore,
    this.allowNewConversations = false,
  });

  final GrovePrivateConversationClient client;
  final String projectId;
  final String? initialConversationId;
  final GrovePendingTurnStore? pendingStore;
  final bool allowNewConversations;
  final bool Function() sessionStillValid;
  final Future<void> Function(String conversationId) onConversationSelected;

  @override
  State<GrovePrivateTextPanel> createState() => _GrovePrivateTextPanelState();
}

class _GrovePrivateTextPanelState extends State<GrovePrivateTextPanel>
    with WidgetsBindingObserver {
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
  Timer? _draftTimer;
  bool _keepDraft = false;
  bool _draftBlocked = false;
  bool _changingDraft = false;
  bool _settingInput = false;
  bool _disposed = false;
  String? _draftStatus;

  bool get _valid => mounted && !_disposed && widget.sessionStillValid();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _input.addListener(_draftChanged);
    unawaited(_discover());
  }

  void _setInput(String text) {
    _settingInput = true;
    _input.text = text;
    _settingInput = false;
  }

  void _draftChanged() {
    if (_settingInput || !_keepDraft || _pendingId != null || !_valid) return;
    _draftTimer?.cancel();
    setState(() => _draftStatus = 'Saving draft…');
    _draftTimer = Timer(const Duration(milliseconds: 300), () {
      unawaited(_saveDraftQuietly());
    });
  }

  Future<void> _saveDraft() async {
    _draftTimer?.cancel();
    final store = widget.pendingStore;
    final id = _selected;
    if (!_keepDraft || store == null || id == null || !_valid) return;
    if (_draftBlocked) throw StateError('Saved draft needs explicit recovery');
    // Capture scope and exact text before yielding, including on disposal.
    final turn = GrovePendingTurn(
      text: _pendingText ?? _input.text, requestId: _pendingId,
    );
    final generation = _generation;
    await store.save(id, turn);
    if (_valid && generation == _generation &&
        turn.text == (_pendingText ?? _input.text) &&
        turn.requestId == _pendingId) {
      setState(() => _draftStatus = 'Draft saved on this device.');
    }
  }

  Future<void> _saveDraftQuietly() async {
    final generation = _generation;
    try {
      await _saveDraft();
    } catch (_) {
      if (_valid && generation == _generation) setState(() => _draftStatus =
          'Draft could not be saved. Keep this screen open and retry.');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) unawaited(_saveDraftQuietly());
  }

  Future<void> _toggleDraft(bool enabled) async {
    if (!_valid || _sending || _loading || _changingDraft ||
        (_pendingId != null && !enabled) || _draftBlocked ||
        widget.pendingStore == null) return;
    final id = _selected;
    if (id == null) return;
    final generation = _generation;
    setState(() { _changingDraft = true; _keepDraft = enabled; });
    try {
      if (enabled) {
        await _saveDraft();
      } else {
        _draftTimer?.cancel();
        await widget.pendingStore!.erase(id);
        if (_valid && generation == _generation) {
          setState(() => _draftStatus = null);
        }
      }
    } catch (_) {
      if (_valid && generation == _generation) {
        setState(() {
          // Failed erase must not pretend the retained private draft is gone.
          _keepDraft = true;
          _draftStatus = 'Device draft storage failed. Retry or erase explicitly.';
        });
      }
    } finally {
      if (_valid && generation == _generation) {
        setState(() => _changingDraft = false);
      }
    }
  }

  Future<void> _discardDraft() async {
    if (!_valid || _sending || _loading || _changingDraft) return;
    final id = _selected;
    if (id == null) return;
    final generation = _generation;
    final confirmed = await showDialog<bool>(context: context, builder: (context) =>
      AlertDialog(
        title: const Text('Discard unfinished message?'),
        content: const Text('Arbor may already have received it. Discarding '
            'does not cancel that request. Sending it again as a new message '
            'may create a duplicate.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep message')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Discard message')),
        ],
      ),
    );
    if (confirmed != true || !_valid || generation != _generation) return;
    _draftTimer?.cancel();
    setState(() => _changingDraft = true);
    try {
      // Always attempt erasure when a store exists, including damaged bytes.
      await widget.pendingStore?.erase(id);
      if (!_valid || generation != _generation) return;
      setState(() {
        _pendingId = null; _pendingText = null;
        _keepDraft = false; _draftBlocked = false;
        _draftStatus = null; _error = null;
        _setInput('');
      });
    } catch (_) {
      if (_valid && generation == _generation) setState(() =>
        _error = 'The unfinished message could not be erased. Retry erasing.');
    } finally {
      if (_valid && generation == _generation) {
        setState(() => _changingDraft = false);
      }
    }
  }

  @override
  void didUpdateWidget(GrovePrivateTextPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.projectId != widget.projectId ||
        oldWidget.client != widget.client) {
      _draftTimer?.cancel();
      _generation++;
      _setInput('');
      _keepDraft = false; _draftBlocked = false;
      _changingDraft = false; _draftStatus = null; _sending = false;
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
    if (!_valid || _pendingId != null || _draftBlocked || _changingDraft ||
        (_loading && _choices != null)) return;
    final previousId = _selected;
    final generation = ++_generation;
    setState(() { _loading = true; _error = null; });
    try {
      await _saveDraft();
      if (!_valid || generation != _generation) return;
      final choices = await widget.client.listExisting(widget.projectId);
      if (!_valid || generation != _generation) return;
      final preferred = previousId ?? widget.initialConversationId;
      final selected = choices.conversations.any((c) =>
          c.conversationId == preferred)
          ? preferred
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
    if (!_valid || _sending || _pendingId != null || _draftBlocked || _changingDraft ||
        (generation != null && generation != _generation) ||
        !(_choices?.conversations.any((c) => c.conversationId == id) ?? false)) return;
    final current = generation ?? ++_generation;
    setState(() { _loading = true; _error = null; });
    try {
      await _saveDraft();
    } catch (_) {
      if (_valid && current == _generation) setState(() {
        _loading = false;
        _error = 'Save the device draft before switching.';
      });
      return;
    }
    if (!_valid || current != _generation) return;
    setState(() {
      _loading = true;
      _selected = null;
      _history = null;
      _pendingId = null;
      _pendingText = null;
      _unsavedReply = null;
      _error = null;
      _draftTimer?.cancel();
      _keepDraft = false; _draftBlocked = false; _draftStatus = null;
      _setInput('');
    });
    try {
      final history = await widget.client.loadRecent(
        projectId: widget.projectId, conversationId: id,
      );
      if (!_valid || current != _generation) return;
      if (history.projectId != widget.projectId || history.conversationId != id) {
        throw StateError('Private history scope changed');
      }
      await widget.onConversationSelected(id);
      if (!_valid || current != _generation) return;
      GrovePendingTurn? draft;
      try {
        draft = await widget.pendingStore?.load(id);
        if (!_valid || current != _generation) return;
        if (draft?.requestId != null) {
          final matching = history.turnsNewestFirst.where(
            (turn) => turn.requestId == draft!.requestId,
          );
          if (matching.isNotEmpty) {
            if (matching.single.userText != draft!.text) {
              throw StateError('Saved draft conflicts with verified history');
            }
            // A complete scoped history pair closes the pending turn without
            // another model request. Keep the explicit retention preference.
            await widget.pendingStore!.save(id, const GrovePendingTurn(text: ''),
              completedRequestId: draft!.requestId);
            draft = const GrovePendingTurn(text: '');
          }
        }
      } catch (_) {
        if (!_valid || current != _generation) return;
        setState(() {
          _selected = id; _history = history; _loading = false;
          _draftBlocked = true;
          _error = 'A saved device draft could not be recovered. '
              'Sending is blocked until you erase it explicitly.';
        });
        return;
      }
      if (!_valid || current != _generation) return;
      setState(() {
        _selected = id;
        _history = history;
        _keepDraft = draft != null;
        _pendingId = draft?.requestId;
        _pendingText = draft?.requestId == null ? null : draft!.text;
        _setInput(draft?.text ?? '');
        _draftStatus = draft == null ? null : 'Device draft restored. Nothing was resent.';
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

  Future<void> _createNew() async {
    if (!widget.allowNewConversations ||
        !_valid || _loading || _sending || _choices == null ||
        _pendingId != null || _draftBlocked || _changingDraft) return;
    final generation = ++_generation;
    setState(() { _loading = true; _error = null; });
    try {
      await _saveDraft();
      if (!_valid || generation != _generation) return;
      // This is the ONLY path that requests an empty new conversation.
      // Never auto-retry a POST with an uncertain network response.
      final created = await widget.client.createNew(widget.projectId);
      if (!_valid || generation != _generation) return;
      final current = _choices!;
      setState(() {
        _choices = GrovePrivateConversationChoices(
          projectId: widget.projectId,
          conversations: [
            created,
            ...current.conversations.where(
              (c) => c.conversationId != created.conversationId,
            ),
          ].take(20).toList(growable: false),
          mayBeTruncated: current.mayBeTruncated ||
              current.conversations.length >= 20,
        );
      });
      await _choose(created.conversationId, generation: generation);
    } catch (_) {
      if (!_valid || generation != _generation) return;
      setState(() {
        _loading = false;
        _error = 'Could not confirm the new private conversation. '
            'Refresh the list before creating another.';
      });
    }
  }

  Future<void> _send() async {
    final id = _selected;
    final message = _input.text.trim();
    if (_sending || _loading || _draftBlocked || _changingDraft || !_valid || id == null ||
        message.isEmpty || message.length > 3000) return;
    if (_pendingId != null && _pendingText != message) {
      setState(() => _error = 'Retry the original unchanged message, or discard it explicitly.');
      return;
    }
    if (_pendingId == null) {
      _pendingText = message;
      _pendingId = _newRequestId();
    }
    final requestId = _pendingId!;
    final generation = _generation;
    setState(() { _sending = true; _error = null; });
    try {
      // Persist original retry identity BEFORE model disclosure. Storage failure
      // makes zero network sends. Never auto-send a restored draft.
      await _saveDraft();
      if (!_valid || generation != _generation) return;
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
        // A successful POST is not proof that the reopened phone view
        // contains THIS turn. Do not clear the draft/retry label when an
        // authorized history read is stale, truncated, or mismatched.
        if (history.projectId != widget.projectId ||
            history.conversationId != id ||
            reply.requestId != requestId ||
            !history.turnsNewestFirst.any((turn) =>
              turn.requestId == requestId &&
              turn.userText == message &&
              turn.assistantText == reply.text)) {
          throw StateError('Saved Grove turn was not recovered');
        }
      }
      if (!_valid || generation != _generation) return;
      if (_keepDraft) {
        await widget.pendingStore!.save(id, const GrovePendingTurn(text: ''),
          completedRequestId: requestId);
      }
      if (!_valid || generation != _generation) return;
      setState(() {
        _history = history ?? _history;
        _unsavedReply = reply.persisted ? null : reply.text;
        _setInput('');
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
            'Retry the unchanged message, or discard it explicitly.';
      });
    }
  }

  @override
  void dispose() {
    // Best effort for unsent edits; abrupt OS kills can precede platform flush.
    unawaited(_saveDraftQuietly());
    _disposed = true;
    _draftTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    ++_generation;
    _input.removeListener(_draftChanged);
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
                onChanged: _sending || _loading || _pendingId != null ||
                    _draftBlocked || _changingDraft ? null : (id) {
                  if (id != null) unawaited(_choose(id));
                },
              ),
            if (!_loading && choices != null)
              Wrap(
                spacing: 8,
                children: [
                  if (widget.allowNewConversations)
                    OutlinedButton(
                      onPressed: _sending || _loading || _pendingId != null || _draftBlocked ||
                          _changingDraft ? null : _createNew,
                      child: const Text('New private conversation'),
                    ),
                  TextButton(
                    onPressed: _sending || _loading || _pendingId != null || _draftBlocked ||
                        _changingDraft ? null : _discover,
                    child: const Text('Refresh conversations'),
                  ),
                ],
              ),
            if (!_loading && choices != null &&
                choices.conversations.isEmpty &&
                !widget.allowNewConversations)
              const Text('New private conversations are not enabled in '
                  'this Grove build.',
                style: TextStyle(color: Colors.white70)),
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
              if (widget.pendingStore != null)
                CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Keep unfinished message on this device'),
                  subtitle: const Text('Stored locally without encryption until cleared.'),
                  value: _keepDraft,
                  onChanged: _sending || _loading || (_pendingId != null && _keepDraft) ||
                      _draftBlocked || _changingDraft ? null : (value) {
                    if (value != null) unawaited(_toggleDraft(value));
                  },
                ),
              if (_draftStatus != null)
                Text(_draftStatus!, style: const TextStyle(color: Colors.white70)),
              if (_pendingId != null || _draftBlocked)
                TextButton(
                  onPressed: _sending || _changingDraft ? null : _discardDraft,
                  child: const Text('Discard unfinished message'),
                ),
              TextField(
                controller: _input,
                enabled: !_sending && !_loading && !_draftBlocked &&
                    !_changingDraft && _pendingId == null,
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
                  onPressed: _sending || _loading || _draftBlocked ||
                      _changingDraft ? null : _send,
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
