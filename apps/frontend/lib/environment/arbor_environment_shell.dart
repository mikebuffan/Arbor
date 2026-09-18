import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'environment_panel.dart';
import 'environment_state.dart';
import 'environment_tokens.dart';
import 'objective_strip.dart';
import 'work_queue.dart';
import 'objective_workspace.dart';
import 'activity_view.dart';
import 'evidence_view.dart';
import 'system_health_view.dart';
import 'command_palette.dart';
import 'environment_atmosphere.dart';
import 'benchmark_view.dart';
import 'project_view.dart';
import '../pages/arbor_shell_page.dart';

enum EnvironmentDestination { home, conversation, objective, queue, projects, evidence, benchmarks, health, settings }

class ArborEnvironmentShell extends StatefulWidget {
  const ArborEnvironmentShell({super.key, this.objective});
  final EnvironmentObjectiveView? objective;

  @override
  State<ArborEnvironmentShell> createState() => _ArborEnvironmentShellState();
}

class _ArborEnvironmentShellState extends State<ArborEnvironmentShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  EnvironmentDestination selected = EnvironmentDestination.home;

  @override
  Widget build(BuildContext context) {
    final objective = widget.objective ?? EnvironmentFixture.houseHasWalls();
    return Shortcuts(
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.keyK, control: true): ActivateIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { _openPalette(context); return null; }),
        },
        child: Scaffold(
      key: _scaffoldKey,
      backgroundColor: ArborEnvironmentTokens.voidBlack,
      body: SafeArea(
        child: Column(children: [
          ObjectiveStrip(objective: objective),
          Expanded(
            child: LayoutBuilder(builder: (context, constraints) {
              final wide = constraints.maxWidth >= 900;
              return Row(children: [
                if (wide) _Navigation(selected: selected, onSelect: _select),
                Expanded(child: _Surface(selected: selected, objective: objective)),
              ]);
            }),
          ),
        ]),
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.small(
            heroTag: 'inspector',
            tooltip: 'Open inspector',
            onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
            child: const Icon(Icons.manage_search_outlined),
          ),
          const SizedBox(height: 10),
          FloatingActionButton(
            heroTag: 'commands',
            tooltip: 'Open command palette',
            onPressed: () => _openPalette(context),
            child: const Icon(Icons.auto_awesome_mosaic_outlined),
          ),
        ],
      ),
      endDrawer: Drawer(
        backgroundColor: ArborEnvironmentTokens.midnight,
        child: SafeArea(child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
            Text('INSPECTOR', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
            SizedBox(height: 14),
            Text('Select an objective, work item, evidence node, or event to inspect its provenance and state.', style: TextStyle(color: ArborEnvironmentTokens.textMuted, height: 1.5)),
            SizedBox(height: 16),
            Text('Live backend inspection remains disconnected until its adapter is proven.', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 12)),
          ]),
        )),
      ),
      bottomNavigationBar: MediaQuery.sizeOf(context).width < 900
          ? NavigationBar(
              selectedIndex: selected.index < 5 ? selected.index : 0,
              onDestinationSelected: (i) => _select(EnvironmentDestination.values[i]),
              destinations: const [
                NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
                NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'Talk'),
                NavigationDestination(icon: Icon(Icons.track_changes_outlined), label: 'Objective'),
                NavigationDestination(icon: Icon(Icons.view_list_outlined), label: 'Queue'),
                NavigationDestination(icon: Icon(Icons.folder_outlined), label: 'Projects'),
              ],
            )
          : null,
    )));
  }

  void _select(EnvironmentDestination value) => setState(() => selected = value);

  void _openPalette(BuildContext context) {
    showEnvironmentCommandPalette(context, [
      EnvironmentCommand('Go Home', () => _select(EnvironmentDestination.home)),
      EnvironmentCommand('Open Conversation', () => _select(EnvironmentDestination.conversation)),
      EnvironmentCommand('Open Current Objective', () => _select(EnvironmentDestination.objective)),
      EnvironmentCommand('Open Work Queue', () => _select(EnvironmentDestination.queue)),
      EnvironmentCommand('Open Evidence & Provenance', () => _select(EnvironmentDestination.evidence)),
      EnvironmentCommand('Open System Health', () => _select(EnvironmentDestination.health)),
    ]);
  }
}

class _Navigation extends StatelessWidget {
  const _Navigation({required this.selected, required this.onSelect});
  final EnvironmentDestination selected;
  final ValueChanged<EnvironmentDestination> onSelect;

  @override
  Widget build(BuildContext context) => NavigationRail(
        backgroundColor: ArborEnvironmentTokens.midnight,
        extended: MediaQuery.sizeOf(context).width >= 1180,
        selectedIndex: selected.index,
        onDestinationSelected: (i) => onSelect(EnvironmentDestination.values[i]),
        destinations: const [
          NavigationRailDestination(icon: Icon(Icons.home_outlined), label: Text('Home')),
          NavigationRailDestination(icon: Icon(Icons.chat_bubble_outline), label: Text('Conversation')),
          NavigationRailDestination(icon: Icon(Icons.track_changes_outlined), label: Text('Objective')),
          NavigationRailDestination(icon: Icon(Icons.view_list_outlined), label: Text('Work Queue')),
          NavigationRailDestination(icon: Icon(Icons.folder_outlined), label: Text('Projects')),
          NavigationRailDestination(icon: Icon(Icons.hub_outlined), label: Text('Evidence')),
          NavigationRailDestination(icon: Icon(Icons.speed_outlined), label: Text('Benchmarks')),
          NavigationRailDestination(icon: Icon(Icons.monitor_heart_outlined), label: Text('System Health')),
          NavigationRailDestination(icon: Icon(Icons.settings_outlined), label: Text('Settings')),
        ],
      );
}

class _Surface extends StatelessWidget {
  const _Surface({required this.selected, required this.objective});
  final EnvironmentDestination selected;
  final EnvironmentObjectiveView objective;

  @override
  Widget build(BuildContext context) {
    final title = switch (selected) {
      EnvironmentDestination.home => 'Home',
      EnvironmentDestination.conversation => 'Conversation',
      EnvironmentDestination.objective => 'Current Objective',
      EnvironmentDestination.queue => 'Work Queue',
      EnvironmentDestination.projects => 'Projects',
      EnvironmentDestination.evidence => 'Evidence & Provenance',
      EnvironmentDestination.benchmarks => 'Testing & Benchmarks',
      EnvironmentDestination.health => 'System Health',
      EnvironmentDestination.settings => 'Settings',
    };
    return EnvironmentAtmosphere(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            color: ArborEnvironmentTokens.textPrimary, fontWeight: FontWeight.w300, letterSpacing: 1.2)),
          const SizedBox(height: 6),
          const Text('ARBOR ENVIRONMENT', style: TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 11, letterSpacing: 2)),
          const SizedBox(height: 24),
          if (selected == EnvironmentDestination.home)
            _Home(objective: objective)
          else if (selected == EnvironmentDestination.conversation)
            const SizedBox(height: 720, child: ArborShellPage())
          else if (selected == EnvironmentDestination.objective)
            ObjectiveWorkspace(objective: objective)
          else if (selected == EnvironmentDestination.queue)
            const WorkQueueView(items: [
              WorkItemView('Design tokens and primitives', WorkItemState.complete),
              WorkItemView('Responsive environment shell', WorkItemState.complete),
              WorkItemView('Integrate conversation surface', WorkItemState.running, detail: 'Preserve shared text/voice continuity'),
              WorkItemView('Connect live ARK adapter', WorkItemState.blocked, detail: 'Exact ARK checkpoint recovery required'),
            ])
          else if (selected == EnvironmentDestination.projects)
            const ProjectsView()
          else if (selected == EnvironmentDestination.evidence)
            const EvidenceProvenanceView(nodes: [
              EvidenceNodeView(label: 'Existing client is Flutter cross-platform', kind: EvidenceKind.direct, source: 'repository'),
              EvidenceNodeView(label: 'Environment must not imply ARK execution', kind: EvidenceKind.derived, source: 'truth contract'),
              EvidenceNodeView(label: 'Live ARK adapter can be connected after recovery', kind: EvidenceKind.hypothesis, source: 'planned boundary'),
            ])
          else if (selected == EnvironmentDestination.health)
            const SystemHealthView()
          else if (selected == EnvironmentDestination.benchmarks)
            const BenchmarkView(metrics: [
              BenchmarkMetric('Displayed work time', '—', note: 'Populate only from captured run evidence.'),
              BenchmarkMetric('Wall time', '—', note: 'Measured from objective handoff to finished deliverable.'),
              BenchmarkMetric('Human interventions', '—', note: 'Count only genuine required user inputs.'),
              BenchmarkMetric('Completion proof', 'REQUIRED', note: 'No benchmark pass without evidence.'),
            ])
          else
            _PlaceholderSurface(title: title),
        ],
      ),
    );
  }
}

class _Home extends StatelessWidget {
  const _Home({required this.objective});
  final EnvironmentObjectiveView objective;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              SizedBox(width: 520, child: EnvironmentPanel(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('CURRENT OBJECTIVE', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
                  const SizedBox(height: 12),
                  Text(objective.title, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 20)),
                  const SizedBox(height: 10),
                  Text(objective.nextAction ?? 'No next action reported.', style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
                  if (objective.isDemo) ...[
                    const SizedBox(height: 16),
                    const Text('DEMO DATA — live ARK adapter intentionally disconnected.', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 11)),
                  ],
                ],
              ))),
              const SizedBox(width: 300, child: EnvironmentPanel(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('HOUSE STATUS', style: TextStyle(color: ArborEnvironmentTokens.violet, fontSize: 11, letterSpacing: 1.4)),
                  SizedBox(height: 12),
                  Text('The observatory is online.', style: TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 20)),
                  SizedBox(height: 8),
                  Text('ARK boundary intact. Production untouched.', style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
                ],
              ))),
            ],
          ),
          const SizedBox(height: 16),
          const ActivityView(events: [
            ActivityEvent(title: 'Environment branch isolated', detail: 'No production or ARK mutation.', kind: 'boundary'),
            ActivityEvent(title: 'Truth contract active', detail: 'Operational claims require supporting state.', kind: 'verification'),
            ActivityEvent(title: 'Conversation room preserved', detail: 'Existing text and voice shell lives inside the Environment.', kind: 'integration'),
            ActivityEvent(title: 'Observatory atmosphere added', detail: 'Reduced-motion aware ambient layer.', kind: 'design'),
          ]),
        ],
      );
}

class _PlaceholderSurface extends StatelessWidget {
  const _PlaceholderSurface({required this.title});
  final String title;
  @override
  Widget build(BuildContext context) => EnvironmentPanel(
    child: Text('$title surface reserved. No live operational data connected yet.',
      style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
  );
}
