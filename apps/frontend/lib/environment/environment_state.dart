enum EnvironmentRunState { unavailable, idle, working, checkpointed, blocked, complete, degraded }

class EnvironmentObjectiveView {
  const EnvironmentObjectiveView({
    required this.title,
    required this.state,
    this.nextAction,
    this.blocker,
    this.checkpointReceipt,
    this.completionReceipt,
    this.isDemo = false,
    this.requiresUserAction = false,
    this.updatedAt,
  });

  final String title;
  final EnvironmentRunState state;
  final String? nextAction;
  final String? blocker;
  final String? checkpointReceipt;
  final String? completionReceipt;
  final bool isDemo;
  /// True only for an explicit persisted decision/authority blocker, never inferred
  /// from generic failure, a stale snapshot, or a demo fixture.
  final bool requiresUserAction;
  final DateTime? updatedAt;

  bool get hasTruthfulState {
    switch (state) {
      case EnvironmentRunState.working:
        return nextAction != null && nextAction!.trim().isNotEmpty;
      case EnvironmentRunState.checkpointed:
        return checkpointReceipt != null && checkpointReceipt!.trim().isNotEmpty;
      case EnvironmentRunState.blocked:
        return blocker != null && blocker!.trim().isNotEmpty;
      case EnvironmentRunState.complete:
        return completionReceipt != null && completionReceipt!.trim().isNotEmpty;
      case EnvironmentRunState.unavailable:
      case EnvironmentRunState.idle:
      case EnvironmentRunState.degraded:
        return true;
    }
  }
}

class EnvironmentFixture {
  static EnvironmentObjectiveView houseHasWalls() => EnvironmentObjectiveView(
        title: 'Build Arbor Environment — House Has Walls',
        state: EnvironmentRunState.working,
        nextAction: 'Build environment shell and truthful state primitives',
        isDemo: true,
        updatedAt: DateTime.now(),
      );
}
