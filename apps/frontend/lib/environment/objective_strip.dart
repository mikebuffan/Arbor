import 'package:flutter/material.dart';
import 'environment_state.dart';
import 'attention_status.dart';
import 'environment_tokens.dart';

class ObjectiveStrip extends StatelessWidget {
  const ObjectiveStrip({super.key, required this.objective, this.runtimeStale = false});
  final EnvironmentObjectiveView objective;
  final bool runtimeStale;

  String get _label => switch (objective.state) {
        EnvironmentRunState.unavailable => 'UNAVAILABLE',
        EnvironmentRunState.idle => 'IDLE',
        EnvironmentRunState.working => 'WORKING',
        EnvironmentRunState.checkpointed => 'CHECKPOINTED',
        EnvironmentRunState.blocked => 'BLOCKED',
        EnvironmentRunState.complete => 'COMPLETE',
        EnvironmentRunState.degraded => 'DEGRADED',
      };

  String get _visibleLabel {
    if (attentionForObjective(
      objective: objective,
      runtimeStale: runtimeStale,
    ).level == AttentionLevel.needsYou) return 'NEEDS YOU';
    return _label;
  }

  @override
  Widget build(BuildContext context) {
    final truthful = objective.hasTruthfulState;
    return Semantics(
      label: 'Current objective: ${objective.title}. Status $_visibleLabel.',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: ArborEnvironmentTokens.midnight.withValues(alpha: .92),
          border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: .08))),
        ),
        child: Row(children: [
          if (objective.isDemo) ...[
            const _Tag('DEMO DATA', ArborEnvironmentTokens.firefly),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Text(objective.title,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
          ),
          const SizedBox(width: 12),
          _Tag(truthful ? _visibleLabel : 'INVALID STATE',
              truthful ? ArborEnvironmentTokens.cyan : ArborEnvironmentTokens.danger),
        ]),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.label, this.color);
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .10),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withValues(alpha: .42)),
        ),
        child: Text(label,
            style: TextStyle(color: color, fontSize: 10, letterSpacing: .8, fontWeight: FontWeight.w700)),
      );
}
