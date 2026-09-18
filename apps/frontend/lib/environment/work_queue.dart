import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

enum WorkItemState { queued, running, checkpointed, blocked, complete, failed, cancelled }

class WorkItemView {
  const WorkItemView(this.title, this.state, {this.detail, this.isDemo = true});
  final String title;
  final WorkItemState state;
  final String? detail;
  final bool isDemo;
}

class WorkQueueView extends StatelessWidget {
  const WorkQueueView({super.key, required this.items});
  final List<WorkItemView> items;

  @override
  Widget build(BuildContext context) => EnvironmentPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('WORK QUEUE', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
        const SizedBox(height: 12),
        if (items.isEmpty)
          const Text('Nothing queued.', style: TextStyle(color: ArborEnvironmentTokens.textMuted))
        else
          ...items.map((item) => _WorkRow(item: item)),
      ],
    ),
  );
}

class _WorkRow extends StatelessWidget {
  const _WorkRow({required this.item});
  final WorkItemView item;
  @override
  Widget build(BuildContext context) => Semantics(
    label: '${item.title}, ${item.state.name}',
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(children: [
        Icon(_icon, size: 16, color: _color),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(item.title, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
          if (item.detail != null) Text(item.detail!, style: const TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 12)),
        ])),
        if (item.isDemo) const Text('DEMO', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 10)),
      ]),
    ),
  );

  IconData get _icon => switch (item.state) {
    WorkItemState.queued => Icons.schedule,
    WorkItemState.running => Icons.play_arrow_rounded,
    WorkItemState.checkpointed => Icons.bookmark_added_outlined,
    WorkItemState.blocked => Icons.block,
    WorkItemState.complete => Icons.check_circle_outline,
    WorkItemState.failed => Icons.error_outline,
    WorkItemState.cancelled => Icons.cancel_outlined,
  };
  Color get _color => switch (item.state) {
    WorkItemState.running => ArborEnvironmentTokens.cyan,
    WorkItemState.blocked => ArborEnvironmentTokens.danger,
    WorkItemState.complete => ArborEnvironmentTokens.teal,
    WorkItemState.checkpointed => ArborEnvironmentTokens.violet,
    WorkItemState.queued => ArborEnvironmentTokens.textMuted,
    WorkItemState.failed => ArborEnvironmentTokens.danger,
    WorkItemState.cancelled => ArborEnvironmentTokens.textMuted,
  };
}
