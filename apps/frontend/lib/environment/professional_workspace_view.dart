import 'package:flutter/material.dart';

import 'activity_view.dart';
import 'environment_panel.dart';
import 'environment_state.dart';
import 'environment_tokens.dart';
import 'grove_responsive_wrap.dart';
import 'project_view.dart';
import 'system_health_view.dart';
import 'work_queue.dart';

/// G09: one read-only professional view of existing Grove/ARK state.
///
/// This component does not authenticate, fetch, execute, store, or infer work.
/// Its owner-scoped inputs must come from the existing trusted environment host.
class ProfessionalWorkspaceView extends StatelessWidget {
  const ProfessionalWorkspaceView({
    super.key,
    required this.objective,
    required this.workItems,
    required this.activityEvents,
    required this.runtimeSource,
    required this.runtimeStale,
  });

  final EnvironmentObjectiveView objective;
  final List<WorkItemView> workItems;
  final List<ActivityEvent> activityEvents;
  final String runtimeSource;
  final bool runtimeStale;

  bool get _trustedSnapshot =>
      runtimeSource.startsWith('ARK') &&
      !runtimeStale &&
      !objective.isDemo &&
      objective.hasTruthfulState;

  @override
  Widget build(BuildContext context) {
    final trusted = _trustedSnapshot;
    final status = runtimeStale
        ? 'STALE / FALLBACK - LIVE WORK NOT VERIFIED'
        : trusted
            ? 'OWNED ARK SNAPSHOT - READ ONLY'
            : 'DEMO / UNVERIFIED - LIVE WORK NOT VERIFIED';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EnvironmentPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'PROFESSIONAL WORKSPACE',
                style: TextStyle(
                  color: ArborEnvironmentTokens.cyan,
                  fontSize: 11,
                  letterSpacing: 1.4,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                status,
                key: const ValueKey('professional-workspace-trust'),
                style: const TextStyle(
                  color: ArborEnvironmentTokens.firefly,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Existing projects, objective, queue and activity only. '
                'No tools, writes, worker control or completion claims are granted here.',
                style: TextStyle(color: ArborEnvironmentTokens.textMuted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const ProjectsView(),
        const SizedBox(height: 16),
        GroveResponsiveWrap(
          panels: [
            GrovePanel(
              preferredWidth: 520,
              child: EnvironmentPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CURRENT OBJECTIVE',
                      style: TextStyle(color: ArborEnvironmentTokens.cyan),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      objective.title,
                      style: const TextStyle(
                        color: ArborEnvironmentTokens.textPrimary,
                        fontSize: 17,
                      ),
                    ),
                    Text(
                      'State: ${objective.state.name.toUpperCase()}',
                      style: const TextStyle(color: ArborEnvironmentTokens.textMuted),
                    ),
                    if (objective.blocker != null)
                      Text('Blocker: ${objective.blocker}',
                          style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
                    if (objective.nextAction != null)
                      Text('Next: ${objective.nextAction}',
                          style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
                    if (objective.checkpointReceipt != null)
                      Text('Checkpoint: ${objective.checkpointReceipt}',
                          style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
                    if (objective.completionReceipt != null)
                      Text('Completion receipt: ${objective.completionReceipt}',
                          style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
                    if (!objective.hasTruthfulState)
                      const Text('INVALID OBJECTIVE STATE',
                          style: TextStyle(color: ArborEnvironmentTokens.danger)),
                  ],
                ),
              ),
            ),
            GrovePanel(
              preferredWidth: 520,
              child: trusted
                  ? WorkQueueView(items: workItems)
                  : const EnvironmentPanel(
                      child: Text(
                        'WORK QUEUE UNVERIFIED - the host has not supplied '
                        'a fresh trusted ARK snapshot.',
                        key: ValueKey('professional-workspace-queue-hidden'),
                        style: TextStyle(color: ArborEnvironmentTokens.firefly),
                      ),
                    ),
            ),
            GrovePanel(
              preferredWidth: 520,
              child: trusted
                  ? ActivityView(events: activityEvents)
                  : const EnvironmentPanel(
                      child: Text(
                        'ACTIVITY UNVERIFIED - no background work is implied.',
                        style: TextStyle(color: ArborEnvironmentTokens.firefly),
                      ),
                    ),
            ),
            GrovePanel(
              preferredWidth: 520,
              child: SystemHealthView(
                runtimeSource: runtimeSource,
                runtimeStale: runtimeStale,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
