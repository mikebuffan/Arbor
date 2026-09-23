import 'environment_state.dart';

/// A conservative, source-bound answer to "do I have to do anything?"
/// It never infers human intervention from generic failure or stale state.
enum AttentionLevel { needsYou, systemBlocked, noRequestRecorded, unknown }

class AttentionSummary {
  const AttentionSummary(this.level, this.headline, this.explanation);
  final AttentionLevel level;
  final String headline;
  final String explanation;
}

AttentionSummary attentionForObjective({
  required EnvironmentObjectiveView objective,
  required bool runtimeStale,
}) {
  if (objective.isDemo) {
    return const AttentionSummary(
      AttentionLevel.unknown,
      'Demo only',
      'This is sample data, not a live request for you.',
    );
  }
  if (runtimeStale || !objective.hasTruthfulState) {
    return const AttentionSummary(
      AttentionLevel.unknown,
      'Live status not verified',
      'The current snapshot is stale or incomplete. No decision request can be confirmed.',
    );
  }

  if (objective.state == EnvironmentRunState.blocked) {
    if (objective.requiresUserAction) {
      return AttentionSummary(
        AttentionLevel.needsYou,
        'Your decision is needed',
        objective.blocker ?? 'A specific authorization or preference is required.',
      );
    }
    return AttentionSummary(
      AttentionLevel.systemBlocked,
      'Blocked — no request for you recorded',
      objective.blocker ?? 'A blocker is recorded without a verified human decision.',
    );
  }

  switch (objective.state) {
    case EnvironmentRunState.working:
    case EnvironmentRunState.checkpointed:
      return const AttentionSummary(
        AttentionLevel.noRequestRecorded,
        'No request for you recorded',
        'Check the objective and work queue for the latest reported next action.',
      );
    case EnvironmentRunState.idle:
      return const AttentionSummary(
        AttentionLevel.noRequestRecorded,
        'No active objective reported',
        'The current ARK snapshot does not show work requiring a decision.',
      );
    case EnvironmentRunState.complete:
      return const AttentionSummary(
        AttentionLevel.noRequestRecorded,
        'Objective reports completion',
        'Review the recorded completion evidence in the objective workspace.',
      );
    case EnvironmentRunState.unavailable:
    case EnvironmentRunState.degraded:
      return const AttentionSummary(
        AttentionLevel.unknown,
        'Action need unknown',
        'ARK is unavailable or degraded. Do not assume the work is continuing.',
      );
    case EnvironmentRunState.blocked:
      // Handled above.
      throw StateError('Unreachable blocked objective');
  }
}
