import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

class SystemHealthView extends StatelessWidget {
  const SystemHealthView({super.key});

  @override
  Widget build(BuildContext context) => const EnvironmentPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('SYSTEM HEALTH', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
        SizedBox(height: 12),
        _HealthLine('Environment shell', 'AVAILABLE', ArborEnvironmentTokens.teal),
        _HealthLine('Conversation', 'EXISTING CLIENT', ArborEnvironmentTokens.teal),
        _HealthLine('Voice', 'EXISTING CLIENT', ArborEnvironmentTokens.teal),
        _HealthLine('ARK live adapter', 'DISCONNECTED', ArborEnvironmentTokens.firefly),
        _HealthLine('Production', 'UNTOUCHED', ArborEnvironmentTokens.violet),
      ],
    ),
  );
}

class _HealthLine extends StatelessWidget {
  const _HealthLine(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Expanded(child: Text(label, style: const TextStyle(color: ArborEnvironmentTokens.textMuted))),
      Text(value, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    ]),
  );
}
