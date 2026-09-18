import 'package:flutter/material.dart';
import 'environment_state.dart';
import 'environment_tokens.dart';

class FocusView extends StatelessWidget {
  const FocusView({super.key, required this.objective});
  final EnvironmentObjectiveView objective;

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 760),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 72),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.blur_on_rounded, color: ArborEnvironmentTokens.cyan, size: 42),
            const SizedBox(height: 24),
            Text(objective.title, textAlign: TextAlign.center,
              style: const TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 30, fontWeight: FontWeight.w300)),
            const SizedBox(height: 16),
            Text(objective.nextAction ?? 'No next action reported.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 16, height: 1.5)),
            const SizedBox(height: 22),
            const Text('FOCUS MODE • EVERYTHING ELSE CAN WAIT', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 10, letterSpacing: 1.5)),
          ],
        ),
      ),
    ),
  );
}
