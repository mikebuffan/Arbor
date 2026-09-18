import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

class ActivityEvent {
  const ActivityEvent({
    required this.title,
    required this.detail,
    required this.kind,
    this.isDemo = true,
  });
  final String title;
  final String detail;
  final String kind;
  final bool isDemo;
}

class ActivityView extends StatelessWidget {
  const ActivityView({super.key, required this.events});
  final List<ActivityEvent> events;

  @override
  Widget build(BuildContext context) => EnvironmentPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('ACTIVITY', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
        const SizedBox(height: 12),
        ...events.map((event) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.only(top: 6),
              decoration: const BoxDecoration(shape: BoxShape.circle, color: ArborEnvironmentTokens.firefly),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(event.title, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
              Text(event.detail, style: const TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 12)),
            ])),
            if (event.isDemo) const Text('DEMO', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 10)),
          ]),
        )),
      ],
    ),
  );
}
