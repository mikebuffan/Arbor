import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/arbor_config.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_memory_shelf.dart';

/// One foreground read of the current signed-in project's memory items.
Future<GroveMemoryShelfSnapshot> readCurrentGroveMemoryShelf() async {
  final userId = Supabase.instance.client.auth.currentUser?.id;
  if (userId == null) {
    throw const GroveMemoryShelfUnavailable(
      'Sign in to view the saved memory shelf.',
    );
  }
  final session = await ArborSession.instance.contextFor(userId);
  if (session == null || session.projectId.isEmpty) {
    throw const GroveMemoryShelfUnavailable(
      'Select a project in Talk to view its saved memories.',
    );
  }
  if (Supabase.instance.client.auth.currentUser?.id != userId) {
    throw const GroveMemoryShelfUnavailable('The signed-in user changed.');
  }
  final api = ArborApiClient(baseUrl: ArborConfig.apiBaseUrl);
  try {
    final result = await GroveMemoryShelfReader(api).load(
      projectId: session.projectId,
      conversationId: session.conversationId,
    );
    final currentUserId = Supabase.instance.client.auth.currentUser?.id;
    final current = await ArborSession.instance.contextFor(userId);
    if (currentUserId != userId ||
        current?.projectId != session.projectId ||
        current?.conversationId != session.conversationId) {
      throw const GroveMemoryShelfUnavailable(
        'The active conversation changed. Refresh the shelf.',
      );
    }
    return result;
  } finally {
    api.close();
  }
}

/// Read-only Firefly memory cards, not original evidence documents.
class GroveMemoryShelfView extends StatefulWidget {
  const GroveMemoryShelfView({super.key, this.load});

  /// Injected only for tests or controlled embedding.
  final Future<GroveMemoryShelfSnapshot> Function()? load;

  @override
  State<GroveMemoryShelfView> createState() => _GroveMemoryShelfViewState();
}

class _GroveMemoryShelfViewState extends State<GroveMemoryShelfView> {
  GroveMemoryShelfSnapshot? _snapshot;
  String? _unavailable;
  bool _loading = true;
  int _request = 0;
  int _displayCount = 15;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void didUpdateWidget(GroveMemoryShelfView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.load != widget.load) _refresh();
  }

  @override
  void dispose() {
    _request++;
    super.dispose();
  }

  Future<void> _refresh() async {
    final request = ++_request;
    setState(() {
      _loading = true;
      _snapshot = null; // Never leave a previous project's facts visible.
      _unavailable = null;
      _displayCount = 15;
    });
    try {
      final next = await (widget.load ?? readCurrentGroveMemoryShelf)();
      if (!mounted || request != _request) return;
      setState(() {
        _snapshot = next;
        _loading = false;
      });
    } on GroveMemoryShelfUnavailable catch (error) {
      if (!mounted || request != _request) return;
      setState(() {
        _unavailable = error.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || request != _request) return;
      setState(() {
        _unavailable = 'Memory read unavailable. No saved facts were assumed.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = _snapshot;
    final memories = snapshot?.memories ?? const <GroveSavedMemory>[];
    final visible = memories.take(_displayCount).toList();
    return EnvironmentPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'LIBRARY · LIVE SAVED MEMORY',
            style: TextStyle(
              color: ArborEnvironmentTokens.cyan,
              fontSize: 11,
              letterSpacing: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Firefly memory claims from the selected project. '
            'Not original documents or independently verified evidence.',
            style: TextStyle(color: ArborEnvironmentTokens.textMuted),
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Text(
              'Reading saved memory…',
              key: ValueKey('grove-memory-loading'),
              style: TextStyle(color: ArborEnvironmentTokens.firefly),
            ),
          if (_unavailable != null)
            Text(
              _unavailable!,
              key: const ValueKey('grove-memory-unavailable'),
              style: const TextStyle(color: ArborEnvironmentTokens.firefly),
            ),
          if (snapshot != null) ...[
            Text(
              'Project: ' + snapshot.projectId,
              key: const ValueKey('grove-memory-project'),
              style: const TextStyle(
                color: ArborEnvironmentTokens.textMuted,
                fontSize: 11,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${memories.length} visible saved memories'
              '${snapshot.possiblyMoreOnServer ? ' · SERVER RESULT MAY BE PARTIAL' : ''}',
              style: const TextStyle(
                color: ArborEnvironmentTokens.textPrimary,
                fontSize: 15,
              ),
            ),
            if (memories.isEmpty)
              const Text(
                'No eligible saved memories returned for this project/conversation. '
                'This does not mean no other memories exist.',
                key: ValueKey('grove-memory-empty'),
                style: TextStyle(color: ArborEnvironmentTokens.textMuted),
              ),
            for (final memory in visible)
              Padding(
                key: ValueKey('grove-memory-' + memory.id),
                padding: const EdgeInsets.symmetric(vertical: 9),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      memory.key,
                      style: const TextStyle(
                        color: ArborEnvironmentTokens.firefly,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      memory.text,
                      style: const TextStyle(
                        color: ArborEnvironmentTokens.textPrimary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'SAVED MEMORY · ${memory.scope} · ID ${memory.id}',
                      style: const TextStyle(
                        color: ArborEnvironmentTokens.textMuted,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            if (_displayCount < memories.length)
              TextButton(
                onPressed: () => setState(() => _displayCount += 15),
                child: Text(
                  'Show more (${visible.length}/${memories.length})',
                ),
              ),
          ],
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh saved memory'),
          ),
          const Text(
            'Read only · no memory edited · sensitive and trigger-only '
            'entries are not shown here.',
            style: TextStyle(
              color: ArborEnvironmentTokens.textMuted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
