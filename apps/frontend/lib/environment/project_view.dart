import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_session.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_app_mode.dart';

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
  const ProjectsView({
    super.key,
    this.privateGrove = groveStandalone,
    this.selectedProjectId,
  });

  /// Injection supports widget tests. Real Grove uses its selected,
  /// previously verified owner grant, never a hard-coded project title.
  final bool privateGrove;
  final String? selectedProjectId;

  String? _selectedPrivateProject() {
    if (selectedProjectId != null) return selectedProjectId;
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) return null;
      return ArborSession.instance.peek(userId)?.projectId;
    } catch (_) {
      // Production initializes Grove Auth before the house is built.
      // Pure widget tests and logged-out UI fail closed.
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (privateGrove) {
      final id = _selectedPrivateProject();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('THE GROVE · AUTHORIZED PROJECT',
              style: TextStyle(color: ArborEnvironmentTokens.cyan,
                  fontSize: 11, letterSpacing: 1.3)),
          const SizedBox(height: 10),
          if (id == null || id.isEmpty)
            const EnvironmentPanel(
              child: Text(
                'No private project is selected. The owner grant must be '
                'verified before showing ARK project information.',
                style: TextStyle(color: ArborEnvironmentTokens.textMuted),
              ),
            )
          else ProjectCardView(
            name: 'Selected private ARK project',
            description: 'Project ID: $id. Selected from the private '
                'owner-grant list. Check Objective and Queue for the actual '
                'read-only ARK status; this card is not a work receipt.',
            status: 'SELECTED',
          ),
          const SizedBox(height: 12),
          const Text(
            'No project names, work activity, or completion states are '
            'invented from this local selection.',
            style: TextStyle(color: ArborEnvironmentTokens.textMuted,
                fontSize: 12),
          ),
        ],
      );
    }

    // Original Firefly environment keeps its preexisting visual placeholders.
    // This list is NOT the private Grove owner's discovered grants.
    return const Wrap(
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
}
