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
import 'grove_living_window_panel.dart';
import 'grove_house_room.dart';
import 'grove_app_mode.dart';
import 'annabelle_kitchen_view.dart';
import 'benchmark_view.dart';
import 'project_view.dart';
import 'memory_state_view.dart';
import 'tools_view.dart';
import 'focus_view.dart';
import '../pages/arbor_shell_page.dart';

enum EnvironmentDestination { home, conversation, objective, queue, projects, memory, evidence, tools, benchmarks, focus, health, settings, kitchen }

class ArborEnvironmentShell extends StatefulWidget {
  const ArborEnvironmentShell({
    super.key,
    this.objective,
    this.workItems = const [],
    this.runtimeSource = 'DEMO DATA',
    this.runtimeStale = false,
    this.initialDestination = EnvironmentDestination.home,
    this.conversationLayer,
  });
  final EnvironmentObjectiveView? objective;
  final List<WorkItemView> workItems;
  final String runtimeSource;
  final bool runtimeStale;
  final EnvironmentDestination initialDestination;
  /// Optional only for embedding or testing the conversation surface.
  final Widget? conversationLayer;

  @override
  State<ArborEnvironmentShell> createState() => _ArborEnvironmentShellState();
}

class _ArborEnvironmentShellState extends State<ArborEnvironmentShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _focusNode = FocusNode();
  late EnvironmentDestination selected;

  @override
  void initState() {
    super.initState();
    selected = widget.initialDestination;
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final objective = widget.objective ?? EnvironmentFixture.houseHasWalls();
    return Focus(
      autofocus: true,
      focusNode: _focusNode,
      child: Shortcuts(
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
          // The Grove opens on its room even before ARK sign-in; keep the
          // detailed unavailable truth visible on the status panel below.
          if (!groveStandalone ||
              objective.state != EnvironmentRunState.unavailable)
            ObjectiveStrip(objective: objective),
          Expanded(
            child: LayoutBuilder(builder: (context, constraints) {
              final wide = constraints.maxWidth >= 900;
              return Row(children: [
                if (wide) _Navigation(selected: selected, onSelect: _select),
                Expanded(
                  child: _Surface(
                    selected: selected,
                    objective: objective,
                    workItems: widget.workItems,
                    runtimeSource: widget.runtimeSource,
                    runtimeStale: widget.runtimeStale,
                    conversationLayer: widget.conversationLayer,
                    onRoomAction: _openRoom,
                    onSelect: _select,
                  ),
                ),
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
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('INSPECTOR', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
            const SizedBox(height: 14),
            const Text('Select an objective, work item, evidence node, or event to inspect its provenance and state.', style: TextStyle(color: ArborEnvironmentTokens.textMuted, height: 1.5)),
            const SizedBox(height: 16),
            Text(
              'Runtime source: ${widget.runtimeSource}${widget.runtimeStale ? ' • STALE/FALLBACK' : ''}. ARK access is read-only.',
              style: const TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 12),
            ),
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
    ))));
  }

  void _select(EnvironmentDestination value) => setState(() => selected = value);

  void _openRoom(GroveRoomAction action) {
    switch (action) {
      case GroveRoomAction.arbor:
        _select(EnvironmentDestination.conversation);
      case GroveRoomAction.desk:
        _select(EnvironmentDestination.projects);
      case GroveRoomAction.shelves:
        _select(EnvironmentDestination.memory);
      case GroveRoomAction.kitchen:
        _select(EnvironmentDestination.kitchen);
      case GroveRoomAction.window:
        showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          backgroundColor: ArborEnvironmentTokens.midnight,
          builder: (sheetContext) => SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: const GroveLivingWindowPanel(),
            ),
          ),
        );
      case GroveRoomAction.stairs:
        showModalBottomSheet<void>(
          context: context,
          backgroundColor: ArborEnvironmentTokens.midnight,
          builder: (sheetContext) => SafeArea(child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.restaurant_menu),
                title: const Text('Annabelle’s Kitchen'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _select(EnvironmentDestination.kitchen);
                },
              ),
              ListTile(
                leading: const Icon(Icons.folder_outlined),
                title: const Text('Projects and work'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _select(EnvironmentDestination.projects);
                },
              ),
            ],
          )),
        );
      case GroveRoomAction.moss:
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Moss is the head of household. Obviously. 🐾'),
        ));
    }
  }

  void _openPalette(BuildContext context) {
    showEnvironmentCommandPalette(context, [
      EnvironmentCommand('Go Home', () => _select(EnvironmentDestination.home)),
      EnvironmentCommand('Enter Annabelle’s Kitchen', () => _select(EnvironmentDestination.kitchen)),
      EnvironmentCommand('Open Conversation', () => _select(EnvironmentDestination.conversation)),
      EnvironmentCommand('Open Current Objective', () => _select(EnvironmentDestination.objective)),
      EnvironmentCommand('Open Work Queue', () => _select(EnvironmentDestination.queue)),
      EnvironmentCommand('Open Memory & State', () => _select(EnvironmentDestination.memory)),
      EnvironmentCommand('Open Evidence & Provenance', () => _select(EnvironmentDestination.evidence)),
      EnvironmentCommand('Open Tools & Connectors', () => _select(EnvironmentDestination.tools)),
      EnvironmentCommand('Enter Focus Mode', () => _select(EnvironmentDestination.focus)),
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
          NavigationRailDestination(icon: Icon(Icons.memory_outlined), label: Text('Memory & State')),
          NavigationRailDestination(icon: Icon(Icons.hub_outlined), label: Text('Evidence')),
          NavigationRailDestination(icon: Icon(Icons.extension_outlined), label: Text('Tools')),
          NavigationRailDestination(icon: Icon(Icons.speed_outlined), label: Text('Benchmarks')),
          NavigationRailDestination(icon: Icon(Icons.center_focus_strong_outlined), label: Text('Focus')),
          NavigationRailDestination(icon: Icon(Icons.monitor_heart_outlined), label: Text('System Health')),
          NavigationRailDestination(icon: Icon(Icons.settings_outlined), label: Text('Settings')),
          NavigationRailDestination(icon: Icon(Icons.restaurant_menu), label: Text('Kitchen')),
        ],
      );
}

class _Surface extends StatelessWidget {
  const _Surface({
    required this.selected,
    required this.objective,
    required this.workItems,
    required this.runtimeSource,
    required this.runtimeStale,
    this.conversationLayer,
    required this.onRoomAction,
    required this.onSelect,
  });
  final EnvironmentDestination selected;
  final EnvironmentObjectiveView objective;
  final List<WorkItemView> workItems;
  final String runtimeSource;
  final bool runtimeStale;
  final Widget? conversationLayer;
  final ValueChanged<GroveRoomAction> onRoomAction;
  final ValueChanged<EnvironmentDestination> onSelect;

  @override
  Widget build(BuildContext context) {
    final title = switch (selected) {
      EnvironmentDestination.home => 'Home',
      EnvironmentDestination.conversation => 'Conversation',
      EnvironmentDestination.objective => 'Current Objective',
      EnvironmentDestination.queue => 'Work Queue',
      EnvironmentDestination.projects => 'Projects',
      EnvironmentDestination.memory => 'Memory & State',
      EnvironmentDestination.evidence => 'Evidence & Provenance',
      EnvironmentDestination.tools => 'Tools & Connectors',
      EnvironmentDestination.benchmarks => 'Testing & Benchmarks',
      EnvironmentDestination.focus => 'Focus',
      EnvironmentDestination.health => 'System Health',
      EnvironmentDestination.settings => 'Settings',
      EnvironmentDestination.kitchen => 'Annabelle’s Kitchen',
    };
    // Conversation needs the available phone height for Text, Voice, and the
    // keyboard; a fixed 720px panel nested inside a scrolling dashboard
    // can obscure input on shorter screens.
    if (selected == EnvironmentDestination.conversation) {
      return EnvironmentAtmosphere(
        child: conversationLayer ?? const ArborShellPage(),
      );
    }
    return EnvironmentAtmosphere(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            color: ArborEnvironmentTokens.textPrimary, fontWeight: FontWeight.w300, letterSpacing: 1.2)),
          const SizedBox(height: 6),
          Text(
            'ARBOR ENVIRONMENT • $runtimeSource${runtimeStale ? ' • STALE' : ''}',
            style: const TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 11, letterSpacing: 1.6),
          ),
          const SizedBox(height: 24),
          if (selected == EnvironmentDestination.home)
            _Home(
              objective: objective,
              runtimeSource: runtimeSource,
              runtimeStale: runtimeStale,
              onRoomAction: onRoomAction,
            )
          else if (selected == EnvironmentDestination.kitchen)
            AnnabelleKitchenView(
              onReturnHome: () => onSelect(EnvironmentDestination.home),
              onOpenConversation: () => onSelect(EnvironmentDestination.conversation),
            )
          else if (selected == EnvironmentDestination.objective)
            ObjectiveWorkspace(objective: objective)
          else if (selected == EnvironmentDestination.queue)
            WorkQueueView(items: workItems)
          else if (selected == EnvironmentDestination.projects)
            const ProjectsView()
          else if (selected == EnvironmentDestination.memory)
            const MemoryStateView()
          else if (selected == EnvironmentDestination.evidence)
            EvidenceProvenanceView(nodes: [
              EvidenceNodeView(
                label: 'Runtime snapshot source: $runtimeSource',
                kind: EvidenceKind.direct,
                source: 'read-only runtime adapter',
                isDemo: objective.isDemo,
              ),
              const EvidenceNodeView(
                label: 'Environment cannot execute or mutate ARK work',
                kind: EvidenceKind.direct,
                source: 'read-only adapter contract',
                isDemo: false,
              ),
              EvidenceNodeView(
                label: objective.hasTruthfulState
                    ? 'Displayed objective satisfies the Environment truth contract'
                    : 'Displayed objective violates the Environment truth contract',
                kind: objective.hasTruthfulState
                    ? EvidenceKind.derived
                    : EvidenceKind.contradiction,
                source: 'Environment state validation',
                isDemo: objective.isDemo,
              ),
            ])
          else if (selected == EnvironmentDestination.tools)
            const ToolsView()
          else if (selected == EnvironmentDestination.focus)
            FocusView(objective: objective)
          else if (selected == EnvironmentDestination.health)
            SystemHealthView(
              runtimeSource: runtimeSource,
              runtimeStale: runtimeStale,
            )
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
  const _Home({
    required this.objective,
    required this.runtimeSource,
    required this.runtimeStale,
    required this.onRoomAction,
  });
  final EnvironmentObjectiveView objective;
  final String runtimeSource;
  final bool runtimeStale;
  final ValueChanged<GroveRoomAction> onRoomAction;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GroveHouseRoom(onOpen: onRoomAction),
          const SizedBox(height: 16),
          const GroveLivingWindowPanel(),
          const SizedBox(height: 16),
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
                    const Text('DEMO FALLBACK — live ARK state is unavailable.', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 11)),
                  ],
                ],
              ))),
              SizedBox(width: 340, child: EnvironmentPanel(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('HOUSE STATUS', style: TextStyle(color: ArborEnvironmentTokens.violet, fontSize: 11, letterSpacing: 1.4)),
                  const SizedBox(height: 12),
                  Text(runtimeSource, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 20)),
                  const SizedBox(height: 8),
                  Text(
                    runtimeStale
                        ? 'Snapshot is stale/fallback. ARK remains read-only.'
                        : 'Live snapshot is read-only. Environment cannot mutate ARK.',
                    style: const TextStyle(color: ArborEnvironmentTokens.textMuted),
                  ),
                ],
              ))),
            ],
          ),
          const SizedBox(height: 16),
          ActivityView(events: [
            const ActivityEvent(
              title: 'Environment branch isolated',
              detail: 'No production mutation.',
              kind: 'boundary',
              isDemo: false,
            ),
            ActivityEvent(
              title: 'Runtime snapshot',
              detail: '$runtimeSource${runtimeStale ? ' • stale/fallback' : ''}',
              kind: 'runtime',
              isDemo: objective.isDemo,
            ),
            const ActivityEvent(
              title: 'Read-only boundary active',
              detail: 'Environment observes ARK but has no execution controls.',
              kind: 'safety',
              isDemo: false,
            ),
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
