import 'package:flutter/material.dart';

import 'attention_status.dart';
import 'environment_panel.dart';
import 'environment_state.dart';
import 'environment_tokens.dart';

/// Read-only operator handoff. No buttons: this surface does not authorize
/// or execute research work and never treats a demo as a human request.
class AttentionBanner extends StatelessWidget {
  const AttentionBanner({
    super.key,
    required this.objective,
    required this.runtimeStale,
  });

  final EnvironmentObjectiveView objective;
  final bool runtimeStale;

  @override
  Widget build(BuildContext context) {
    final summary = attentionForObjective(
      objective: objective,
      runtimeStale: runtimeStale,
    );
    final (label, color, icon) = switch (summary.level) {
      AttentionLevel.needsYou => (
        'NEEDS YOU',
        ArborEnvironmentTokens.firefly,
        Icons.priority_high,
      ),
      AttentionLevel.systemBlocked => (
        'SYSTEM BLOCKED',
        ArborEnvironmentTokens.danger,
        Icons.report_problem_outlined,
      ),
      AttentionLevel.noRequestRecorded => (
        'NO REQUEST RECORDED',
        ArborEnvironmentTokens.teal,
        Icons.check_circle_outline,
      ),
      AttentionLevel.unknown => (
        'UNVERIFIED',
        ArborEnvironmentTokens.textMuted,
        Icons.help_outline,
      ),
    };
    return Semantics(
      label: '$label. ${summary.headline}. ${summary.explanation}',
      child: EnvironmentPanel(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, semanticLabel: label),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(
                    color: color,
                    fontSize: 11,
                    letterSpacing: 1.3,
                    fontWeight: FontWeight.w700,
                  )),
                  const SizedBox(height: 5),
                  Text(summary.headline, style: const TextStyle(
                    color: ArborEnvironmentTokens.textPrimary,
                    fontSize: 17,
                  )),
                  const SizedBox(height: 5),
                  Text(summary.explanation, style: const TextStyle(
                    color: ArborEnvironmentTokens.textMuted,
                  )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
