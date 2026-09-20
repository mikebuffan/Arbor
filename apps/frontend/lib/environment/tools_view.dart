import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

class ToolsView extends StatelessWidget {
  const ToolsView({super.key});

  @override
  Widget build(BuildContext context) => const EnvironmentPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('TOOLS & CONNECTORS', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
        SizedBox(height: 12),
        _ToolLine('GitHub', 'Repository work and verification', 'ENVIRONMENT ADAPTER PENDING'),
        _ToolLine('Supabase', 'Durable state/data backend', 'CLIENT BOOTSTRAP CONFIGURED'),
        _ToolLine('Web', 'Public-source research', 'ENVIRONMENT ADAPTER PENDING'),
        _ToolLine('Files', 'Artifacts and evidence', 'ENVIRONMENT ADAPTER PENDING'),
      ],
    ),
  );
}

class _ToolLine extends StatelessWidget {
  const _ToolLine(this.name, this.purpose, this.status);
  final String name;
  final String purpose;
  final String status;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      SizedBox(width: 110, child: Text(name, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary))),
      Expanded(child: Text(purpose, style: const TextStyle(color: ArborEnvironmentTokens.textMuted))),
      Text(status, style: const TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 9)),
    ]),
  );
}
