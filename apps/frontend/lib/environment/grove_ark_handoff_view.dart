import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/arbor_config.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_ark_handoff.dart';

/// Foreground-only read of the active user's selected project's saved work.
/// This neither claims an active worker nor starts one.
Future<GroveArkHandoff> readCurrentGroveArkHandoff() async {
  final userId = Supabase.instance.client.auth.currentUser?.id;
  if (userId == null) throw StateError('Sign in to inspect the saved handoff.');
  final session = await ArborSession.instance.contextFor(userId);
  if (session == null || session.projectId.isEmpty) {
    throw StateError('Select a project in Talk to inspect its saved handoff.');
  }
  if (Supabase.instance.client.auth.currentUser?.id != userId) {
    throw StateError('Signed-in user changed before handoff read.');
  }
  final api = ArborApiClient(baseUrl: ArborConfig.apiBaseUrl);
  try {
    final result = await GroveArkHandoffReader(api).read(session.projectId);
    final activeUser = Supabase.instance.client.auth.currentUser?.id;
    final activeSession = await ArborSession.instance.contextFor(userId);
    if (activeUser != userId ||
        activeSession?.projectId != session.projectId ||
        activeSession?.conversationId != session.conversationId) {
      throw StateError('Project or conversation changed during the handoff read.');
    }
    return result;
  } finally {
    api.close();
  }
}

/// Inspect persisted ARK state without enrolling a worker, changing an
/// objective, or mistaking a stored "running" label for active execution.
class GroveArkHandoffView extends StatefulWidget {
  const GroveArkHandoffView({super.key, this.load, this.invalidations});

  /// Replaces authenticated I/O in deterministic widget tests.
  final Future<GroveArkHandoff> Function()? load;
  final Stream<void>? invalidations;

  @override
  State<GroveArkHandoffView> createState() => _GroveArkHandoffViewState();
}

class _GroveArkHandoffViewState extends State<GroveArkHandoffView> {
  GroveArkHandoff? _snapshot;
  String? _error;
  bool _loading = false;
  int _generation = 0;
  StreamSubscription<dynamic>? _authChanges;
  StreamSubscription<String>? _sessionChanges;
  StreamSubscription<void>? _extraChanges;

  @override
  void initState() {
    super.initState();
    _subscribeExternal();
  }

  @override
  void didUpdateWidget(GroveArkHandoffView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.load != widget.load ||
        oldWidget.invalidations != widget.invalidations) {
      _authChanges?.cancel();
      _sessionChanges?.cancel();
      _subscribeExternal();
      _invalidate();
    }
  }

  void _subscribeExternal() {
    _extraChanges?.cancel();
    if (widget.invalidations != null) {
      _extraChanges = widget.invalidations!.listen((_) => _invalidate());
    }
  }

  void _subscribeProduction() {
    if (widget.load != null || _authChanges != null) return;
    _authChanges = Supabase.instance.client.auth.onAuthStateChange
        .listen((_) => _invalidate());
    _sessionChanges = ArborSession.instance.contextChanges
        .listen((_) => _invalidate());
  }

  void _invalidate() {
    _generation++;
    if (!mounted) return;
    setState(() {
      _snapshot = null;
      _error = null;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _generation++;
    _authChanges?.cancel();
    _sessionChanges?.cancel();
    _extraChanges?.cancel();
    super.dispose();
  }

  Future<void> _read() async {
    final request = ++_generation;
    // Fake-loader tests never need to initialize Supabase.
    if (widget.load == null) {
      try {
        _subscribeProduction();
      } catch (_) {
        setState(() {
          _snapshot = null;
          _error = 'ARK handoff not connected on this device.';
        });
        return;
      }
    }
    setState(() {
      _snapshot = null;
      _error = null;
      _loading = true;
    });
    try {
      final next = await (widget.load ?? readCurrentGroveArkHandoff)();
      if (!mounted || request != _generation) return;
      setState(() {
        _snapshot = next;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || request != _generation) return;
      setState(() {
        _snapshot = null;
        _error = 'Saved ARK handoff unavailable. No next action was assumed.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final handoff = _snapshot;
    return EnvironmentPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ARK · SAVED HANDOFF', style: TextStyle(
            color: ArborEnvironmentTokens.cyan,
            fontSize: 11,
            letterSpacing: 1.3,
          )),
          const SizedBox(height: 8),
          const Text(
            'Inspect the selected project’s persisted objective and checkpoint. '
            'This does not resume or authorize a job.',
            style: TextStyle(color: ArborEnvironmentTokens.textMuted),
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Text('Reading persisted ARK work…',
              key: ValueKey('handoff-loading'),
              style: TextStyle(color: ArborEnvironmentTokens.firefly)),
          if (_error != null)
            Text(_error!, key: const ValueKey('handoff-error'),
              style: const TextStyle(color: ArborEnvironmentTokens.firefly)),
          if (handoff != null) ...[
            Text('Project: ' + handoff.projectId,
              key: const ValueKey('handoff-project'),
              style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
            const SizedBox(height: 7),
            if (!handoff.available)
              const Text('ARK reports this project’s saved state unavailable.',
                key: ValueKey('handoff-unavailable'),
                style: TextStyle(color: ArborEnvironmentTokens.firefly))
            else if (handoff.objectiveId == null)
              const Text('No persisted objective returned for this project.',
                key: ValueKey('handoff-empty'),
                style: TextStyle(color: ArborEnvironmentTokens.textMuted))
            else ...[
              Text(handoff.goal!,
                key: const ValueKey('handoff-goal'),
                style: const TextStyle(color: ArborEnvironmentTokens.textPrimary,
                  fontSize: 17)),
              const SizedBox(height: 5),
              Text('Stored status: ' + handoff.status!,
                style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
              if (handoff.nextAction != null)
                Text('Next recorded action: ' + handoff.nextAction!,
                  key: const ValueKey('handoff-next-action'),
                  style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
              if (handoff.checkpoint != null)
                Text(handoff.checkpoint!,
                  key: const ValueKey('handoff-checkpoint'),
                  style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
              if (handoff.blocker != null)
                Text('Blocker: ' + handoff.blocker! +
                    (handoff.needsOwnerDecision ? ' · DECISION REQUIRED' : ''),
                  key: const ValueKey('handoff-blocker'),
                  style: const TextStyle(color: ArborEnvironmentTokens.firefly)),
              if (handoff.status == 'completed')
                Text(handoff.completionEvidenceRecorded
                    ? 'Completion evidence recorded; independent verification not implied.'
                    : 'Completion evidence not recorded.',
                  style: const TextStyle(color: ArborEnvironmentTokens.firefly)),
            ],
            const SizedBox(height: 6),
            Text('Captured: ' + handoff.capturedAt.toIso8601String() +
                ' · saved state, not a live worker heartbeat',
              style: const TextStyle(color: ArborEnvironmentTokens.textMuted,
                  fontSize: 11)),
          ],
          const SizedBox(height: 10),
          TextButton.icon(
            onPressed: _loading ? null : _read,
            icon: const Icon(Icons.refresh),
            label: const Text('Read saved handoff'),
          ),
        ],
      ),
    );
  }
}
