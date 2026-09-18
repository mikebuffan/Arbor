import 'environment_state.dart';
import 'work_queue.dart';

/// Read-only view contract between the Environment and future runtime adapters.
///
/// This deliberately does not know ARK persistence/API details. The exact ARK
/// checkpoint must be recovered and verified before a live implementation is
/// written.
abstract interface class EnvironmentRuntimeAdapter {
  Future<EnvironmentSnapshot> snapshot();
  Stream<EnvironmentSnapshot> watch();
}

class EnvironmentSnapshot {
  const EnvironmentSnapshot({
    required this.objective,
    required this.workItems,
    required this.source,
    required this.capturedAt,
    this.stale = false,
  });

  final EnvironmentObjectiveView objective;
  final List<WorkItemView> workItems;
  final String source;
  final DateTime capturedAt;
  final bool stale;
}

class DemoEnvironmentAdapter implements EnvironmentRuntimeAdapter {
  DemoEnvironmentAdapter();

  EnvironmentSnapshot _make() => EnvironmentSnapshot(
        objective: EnvironmentFixture.houseHasWalls(),
        workItems: const [
          WorkItemView('Design tokens and primitives', WorkItemState.complete),
          WorkItemView('Responsive environment shell', WorkItemState.complete),
          WorkItemView('Conversation room', WorkItemState.complete),
          WorkItemView('Environment observatory surfaces', WorkItemState.running),
          WorkItemView(
            'Connect live ARK adapter',
            WorkItemState.blocked,
            detail: 'Exact ARK checkpoint recovery required',
          ),
        ],
        source: 'DEMO DATA',
        capturedAt: DateTime.now(),
      );

  @override
  Future<EnvironmentSnapshot> snapshot() async => _make();

  @override
  Stream<EnvironmentSnapshot> watch() => Stream.value(_make());
}
