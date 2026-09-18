import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

enum EvidenceKind { direct, derived, hypothesis, contradiction, unknown }

class EvidenceNodeView {
  const EvidenceNodeView({
    required this.label,
    required this.kind,
    required this.source,
    this.isDemo = true,
  });
  final String label;
  final EvidenceKind kind;
  final String source;
  final bool isDemo;
}

class EvidenceProvenanceView extends StatelessWidget {
  const EvidenceProvenanceView({super.key, required this.nodes});
  final List<EvidenceNodeView> nodes;

  @override
  Widget build(BuildContext context) => EnvironmentPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('EVIDENCE & PROVENANCE', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
        const SizedBox(height: 8),
        const Text(
          'Evidence is shown with source identity and epistemic class. Repetition is not corroboration.',
          style: TextStyle(color: ArborEnvironmentTokens.textMuted),
        ),
        const SizedBox(height: 16),
        ...nodes.map((node) => _EvidenceRow(node: node)),
      ],
    ),
  );
}

class _EvidenceRow extends StatelessWidget {
  const _EvidenceRow({required this.node});
  final EvidenceNodeView node;

  @override
  Widget build(BuildContext context) {
    final color = switch (node.kind) {
      EvidenceKind.direct => ArborEnvironmentTokens.teal,
      EvidenceKind.derived => ArborEnvironmentTokens.cyan,
      EvidenceKind.hypothesis => ArborEnvironmentTokens.violet,
      EvidenceKind.contradiction => ArborEnvironmentTokens.danger,
      EvidenceKind.unknown => ArborEnvironmentTokens.textMuted,
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 3, height: 42, color: color),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(node.label, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
          Text('${node.kind.name.toUpperCase()} • ${node.source}', style: TextStyle(color: color, fontSize: 11)),
        ])),
        if (node.isDemo) const Text('DEMO', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 10)),
      ]),
    );
  }
}
