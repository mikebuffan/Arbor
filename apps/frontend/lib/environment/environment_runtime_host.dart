import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/arbor_config.dart';
import 'arbor_environment_shell.dart';
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
        initialDestination: EnvironmentDestination.conversation,
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
        'No Arbor project is selected yet.',
      ).snapshot();
    }

    return FallbackEnvironmentAdapter(
      primary: ArkEnvironmentAdapter(
        reader: ArborApiArkStatusReader(apiClient),
        projectId: session.projectId,
      ),
      fallback: DemoEnvironmentAdapter(),
    ).snapshot();
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
  Object? _streamError;

  @override
  void initState() {
    super.initState();
    _subscribe();
  }

  @override
  void didUpdateWidget(EnvironmentRuntimeHost oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.adapter, widget.adapter)) {
      _subscribe();
    }
  }

  void _subscribe() {
    _subscription?.cancel();
    _streamError = null;
    _subscription = widget.adapter.watch().listen(
      (snapshot) {
        if (!mounted) return;
        setState(() {
          _snapshot = snapshot;
          _streamError = null;
        });
      },
      onError: (Object error, StackTrace stackTrace) {
        if (!mounted) return;
        setState(() => _streamError = error);
      },
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
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
