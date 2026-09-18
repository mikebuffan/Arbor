import 'package:flutter/material.dart';

import 'environment_panel.dart';
import 'environment_state.dart';
import 'environment_tokens.dart';
import 'objective_strip.dart';

enum EnvironmentDestination { home, conversation, objective, queue, projects, evidence, benchmarks, health, settings }

class ArborEnvironmentShell extends StatefulWidget {
  const ArborEnvironmentShell({super.key, this.objective});
  final EnvironmentObjectiveView? objective;

  @override
  State<ArborEnvironmentShell> createState() => _ArborEnvironmentShellState();
}

class _ArborEnvironmentShellState extends State<ArborEnvironmentShell> {
  EnvironmentDestination selected = EnvironmentDestination.home;

  @override
  Widget build(BuildContext context) {
    final objective = widget.objective ?? EnvironmentFixture.houseHasWalls();
    return Scaffold(
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
      bottomNavigationBar: MediaQuery.sizeOf(context).width < 900
          ? NavigationBar(
              selectedIndex: selected.index.clamp(0, 4),
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
    );
  }

  void _select(EnvironmentDestination value) => setState(() => selected = value);
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
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(.55, -.75),
          radius: 1.25,
          colors: [ArborEnvironmentTokens.deepForest, ArborEnvironmentTokens.midnight, ArborEnvironmentTokens.voidBlack],
        ),
      ),
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            color: ArborEnvironmentTokens.textPrimary, fontWeight: FontWeight.w300, letterSpacing: 1.2)),
          const SizedBox(height: 6),
          const Text('ARBOR ENVIRONMENT', style: TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 11, letterSpacing: 2)),
          const SizedBox(height: 24),
          if (selected == EnvironmentDestination.home) _Home(objective: objective) else _PlaceholderSurface(title: title),
        ],
      ),
    );
  }
}

class _Home extends StatelessWidget {
  const _Home({required this.objective});
  final EnvironmentObjectiveView objective;
  @override
  Widget build(BuildContext context) => Wrap(
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
              Text('Walls going up.', style: TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 20)),
              SizedBox(height: 8),
              Text('ARK boundary intact.', style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
            ],
          ))),
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
