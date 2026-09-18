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
  ArborApiClient? _apiClient;
  late final Future<EnvironmentRuntimeAdapter> _adapter;

  @override
  void initState() {
    super.initState();
    _adapter = _resolveAdapter();
  }

  Future<EnvironmentRuntimeAdapter> _resolveAdapter() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      return const UnavailableEnvironmentAdapter(
        'No authenticated Arbor session is available.',
      );
    }

    final session = await ArborSession.instance.contextFor(user.id);
    if (session == null) {
      return const UnavailableEnvironmentAdapter(
        'No Arbor project is selected yet.',
      );
    }

    final apiClient = ArborApiClient(baseUrl: ArborConfig.apiBaseUrl);
    _apiClient = apiClient;

    return FallbackEnvironmentAdapter(
      primary: ArkEnvironmentAdapter(
        reader: ArborApiArkStatusReader(apiClient),
        projectId: session.projectId,
      ),
      fallback: DemoEnvironmentAdapter(),
    );
  }

  @override
  void dispose() {
    _apiClient?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<EnvironmentRuntimeAdapter>(
        future: _adapter,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return ArborEnvironmentShell(
              objective: EnvironmentObjectiveView(
                title: 'Environment runtime unavailable',
                state: EnvironmentRunState.unavailable,
                blocker: snapshot.error.toString(),
              ),
              runtimeSource: 'NO RUNTIME',
              runtimeStale: true,
            );
          }

          final adapter = snapshot.data;
          if (adapter == null) {
            return const ArborEnvironmentShell(
              objective: EnvironmentObjectiveView(
                title: 'Connecting to ARK…',
                state: EnvironmentRunState.unavailable,
              ),
              runtimeSource: 'ARK • CONNECTING',
              runtimeStale: true,
            );
          }

          return EnvironmentRuntimeHost(adapter: adapter);
        },
      );
}

class EnvironmentRuntimeHost extends StatefulWidget {
  const EnvironmentRuntimeHost({
    super.key,
    required this.adapter,
  });

  final EnvironmentRuntimeAdapter adapter;

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
      objective: snapshot.objective,
      workItems: snapshot.workItems,
      runtimeSource: snapshot.source,
      runtimeStale: snapshot.stale,
    );
  }
}
