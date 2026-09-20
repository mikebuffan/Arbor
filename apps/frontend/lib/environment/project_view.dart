import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

class ProjectCardView extends StatelessWidget {
  const ProjectCardView({
    super.key,
    required this.name,
    required this.description,
    required this.status,
  });
  final String name;
  final String description;
  final String status;

  @override
  Widget build(BuildContext context) => EnvironmentPanel(
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Text(name, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 18))),
        Text(status, style: const TextStyle(color: ArborEnvironmentTokens.teal, fontSize: 10, letterSpacing: 1)),
      ]),
      const SizedBox(height: 8),
      Text(description, style: const TextStyle(color: ArborEnvironmentTokens.textMuted, height: 1.45)),
    ]),
  );
}

class ProjectsView extends StatelessWidget {
  const ProjectsView({super.key});

  @override
  Widget build(BuildContext context) => const Wrap(
    spacing: 16,
    runSpacing: 16,
    children: [
      SizedBox(width: 360, child: ProjectCardView(
        name: 'Arbor Environment',
        description: 'The persistent place where conversation, work, memory, evidence, tools, and benchmarks meet.',
        status: 'BUILDING',
      )),
      SizedBox(width: 360, child: ProjectCardView(
        name: 'ARK',
        description: 'Autonomous work continuity layer. Intentionally isolated from Environment implementation until exact recovery.',
        status: 'PROTECTED',
      )),
      SizedBox(width: 360, child: ProjectCardView(
        name: 'Epstein Evidence Project',
        description: 'Large evidence-driven investigation workload reserved for the post-ARK benchmark.',
        status: 'QUEUED',
      )),
    ],
  );
}
