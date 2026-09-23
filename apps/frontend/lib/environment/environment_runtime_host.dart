import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/arbor_config.dart';
import 'arbor_environment_shell.dart';
import 'grove_app_mode.dart';
import 'environment_adapter.dart';
import 'environment_state.dart';

class EnvironmentRuntimeBootstrap extends StatefulWidget {
  const EnvironmentRuntimeBootstrap({super.key});

  @override
  State<EnvironmentRuntimeBootstrap> createState() =>
      _EnvironmentRuntimeBootstrapState();
}

class _EnvironmentRuntimeBootstrapState
    extends State<EnvironmentRuntimeBootstrap> {
  late final ArborApiClient _apiClient;
  late final EnvironmentRuntimeAdapter _adapter;

  @override
  void initState() {
    super.initState();
    _apiClient = ArborApiClient(baseUrl: ArborConfig.apiBaseUrl);
    _adapter = _SessionAwareEnvironmentAdapter(_apiClient);
  }

  @override
  void dispose() {
    _apiClient.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      EnvironmentRuntimeHost(
        adapter: _adapter,
        initialDestination: groveStandalone
            ? EnvironmentDestination.home
            : EnvironmentDestination.conversation,
      );
}

/// Keep the read-only ARK status feed alive across transient session or
/// network errors. Never substitute demo data for an unverified live result.
Stream<EnvironmentSnapshot> retryingEnvironmentSnapshots({
  required Future<EnvironmentSnapshot> Function() read,
  required Duration refreshInterval,
}) async* {
  while (true) {
    late final EnvironmentSnapshot next;
    try {
      next = await read();
    } catch (_) {
      next = await const UnavailableEnvironmentAdapter(
        'ARK status refresh failed. Retrying automatically.',
      ).snapshot();
    }
    yield next;
    await Future<void>.delayed(refreshInterval);
  }
}

/// A private home must never substitute a demo objective for inaccessible ARK.
/// The older Firefly/demo flavor keeps its independently labeled fallback.
Future<EnvironmentSnapshot> readPrivateGroveArkSnapshot({
  required EnvironmentRuntimeAdapter primary,
}) async {
  try {
    return await primary.snapshot();
  } catch (_) {
    return const UnavailableEnvironmentAdapter(
      'Private Grove ARK read failed. Retrying automatically.',
    ).snapshot();
  }
}

class _SessionAwareEnvironmentAdapter implements EnvironmentRuntimeAdapter {
  _SessionAwareEnvironmentAdapter(this.apiClient);

  final ArborApiClient apiClient;
  static const refreshInterval = Duration(seconds: 10);

  @override
  Future<EnvironmentSnapshot> snapshot() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      return const UnavailableEnvironmentAdapter(
        'No authenticated Arbor session is available.',
      ).snapshot();
    }

    final session = await ArborSession.instance.contextFor(user.id);
    if (session == null) {
      return const UnavailableEnvironmentAdapter(
        groveStandalone
            ? 'No private ARK project is currently granted. '
              'Your Grove room remains available.'
            : 'No Arbor project is selected yet.',
      ).snapshot();
    }

    final primary = ArkEnvironmentAdapter(
      reader: ArborApiArkStatusReader(apiClient),
      projectId: session.projectId,
    );
    final result = groveStandalone
        ? await readPrivateGroveArkSnapshot(primary: primary)
        : await FallbackEnvironmentAdapter(
            primary: primary,
            fallback: DemoEnvironmentAdapter(),
          ).snapshot();

    // A request started for the previous account/project must never repopulate
    // the Grove after the visitor switches context while I/O is in flight.
    final currentUser = Supabase.instance.client.auth.currentUser?.id;
    final currentSession = await ArborSession.instance.contextFor(user.id);
    if (currentUser != user.id ||
        currentSession?.projectId != session.projectId ||
        currentSession?.conversationId != session.conversationId) {
      return const UnavailableEnvironmentAdapter(
        'Account or project changed during ARK status refresh.',
      ).snapshot();
    }
    return result;
  }

  @override
  Stream<EnvironmentSnapshot> watch() =>
      retryingEnvironmentSnapshots(
        read: snapshot,
        refreshInterval: refreshInterval,
      );
}

class EnvironmentRuntimeHost extends StatefulWidget {
  const EnvironmentRuntimeHost({
    super.key,
    required this.adapter,
    this.initialDestination = EnvironmentDestination.home,
  });

  final EnvironmentRuntimeAdapter adapter;
  final EnvironmentDestination initialDestination;

  @override
  State<EnvironmentRuntimeHost> createState() => _EnvironmentRuntimeHostState();
}

class _EnvironmentRuntimeHostState extends State<EnvironmentRuntimeHost> {
  EnvironmentSnapshot? _snapshot;
  StreamSubscription<EnvironmentSnapshot>? _subscription;
  StreamSubscription<String>? _sessionChanges;
  StreamSubscription<dynamic>? _authChanges;
  Object? _streamError;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    // The existing context-change stream is synchronous: old project rows
    // disappear on the same event as an explicit project/thread switch.
    _sessionChanges =
        ArborSession.instance.contextChanges.listen((_) => _subscribe());
    try {
      _authChanges = Supabase.instance.client.auth.onAuthStateChange
          .listen((_) => _subscribe());
    } catch (_) {
      // Pure widget tests have no Supabase bootstrap. Production initializes
      // Supabase before constructing the runtime host.
    }
    _subscribe(rebuild: false);
  }

  @override
  void didUpdateWidget(EnvironmentRuntimeHost oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.adapter, widget.adapter)) {
      _subscribe(rebuild: false);
    }
  }

  void _subscribe({bool rebuild = true}) {
    final currentGeneration = ++_generation;
    _subscription?.cancel();

    void clear() {
      _snapshot = null;
      _streamError = null;
    }

    if (rebuild && mounted) {
      setState(clear);
    } else {
      clear();
    }

    _subscription = widget.adapter.watch().listen(
      (snapshot) {
        if (!mounted || currentGeneration != _generation) return;
        setState(() {
          _snapshot = snapshot;
          _streamError = null;
        });
      },
      onError: (Object error, StackTrace stackTrace) {
        if (!mounted || currentGeneration != _generation) return;
        setState(() => _streamError = error);
      },
    );
  }

  @override
  void dispose() {
    ++_generation;
    _subscription?.cancel();
    _sessionChanges?.cancel();
    _authChanges?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = _snapshot;

    if (snapshot == null) {
      return ArborEnvironmentShell(
        initialDestination: widget.initialDestination,
        objective: EnvironmentObjectiveView(
          title: _streamError == null
              ? 'Reading ARK state…'
              : 'ARK read failed',
          state: EnvironmentRunState.unavailable,
          blocker: _streamError?.toString(),
        ),
        runtimeSource:
            _streamError == null ? 'ARK • CONNECTING' : 'ARK • READ ERROR',
        runtimeStale: true,
      );
    }

    return ArborEnvironmentShell(
      initialDestination: widget.initialDestination,
      objective: snapshot.objective,
      workItems: snapshot.workItems,
      activityEvents: snapshot.activityEvents,
      runtimeSource: snapshot.source,
      runtimeStale: snapshot.stale,
    );
  }
}
