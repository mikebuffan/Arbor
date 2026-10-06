import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_state.dart';
import 'environment_tokens.dart';
import 'grove_ark_handoff_view.dart';
import 'grove_responsive_wrap.dart';

class ObjectiveWorkspace extends StatelessWidget {
  const ObjectiveWorkspace({super.key, required this.objective});
  final EnvironmentObjectiveView objective;

  @override
  Widget build(BuildContext context) => GroveResponsiveWrap(
    panels: [
      const GrovePanel(preferredWidth: 560, child: GroveArkHandoffView()),
      GrovePanel(
        preferredWidth: 560,
        child: EnvironmentPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('OBJECTIVE', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
              const SizedBox(height: 12),
              Text(objective.title, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 24)),
              const SizedBox(height: 14),
              _Fact(label: 'State', value: objective.state.name.toUpperCase()),
              _Fact(label: 'Next action', value: objective.nextAction ?? 'Not reported'),
              _Fact(label: 'Blocker', value: objective.blocker ?? 'None reported'),
              _Fact(label: 'Checkpoint', value: objective.checkpointReceipt ?? 'None'),
              _Fact(label: 'Completion proof', value: objective.completionReceipt ?? 'None'),
              const SizedBox(height: 12),
              Text(
                objective.hasTruthfulState
                    ? 'State satisfies the Environment truth contract.'
                    : 'State is rejected by the Environment truth contract.',
                style: TextStyle(
                  color: objective.hasTruthfulState ? ArborEnvironmentTokens.teal : ArborEnvironmentTokens.danger,
                ),
              ),
            ],
          ),
        ),
      ),
      const GrovePanel(
        preferredWidth: 340,
        child: EnvironmentPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('WHY THIS EXISTS', style: TextStyle(color: ArborEnvironmentTokens.violet, fontSize: 11, letterSpacing: 1.4)),
              SizedBox(height: 12),
              Text(
                'One place to answer: What am I doing, why am I doing it, what remains, what proves progress, and what would actually stop me?',
                style: TextStyle(color: ArborEnvironmentTokens.textMuted, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 120, child: Text(label, style: const TextStyle(color: ArborEnvironmentTokens.textMuted))),
      Expanded(child: Text(value, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary))),
    ]),
  );
}
