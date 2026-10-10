import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/professional_workspace_view.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:frontend/environment/work_queue.dart';
import 'package:frontend/environment/activity_view.dart';

void main() {
  const objective = EnvironmentObjectiveView(
    title: 'Owned scope-check objective',
    state: EnvironmentRunState.checkpointed,
    checkpointReceipt: 'checkpoint-2',
  );

  testWidgets('fresh ARK input composes the existing read-only queue and activity', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: ProfessionalWorkspaceView(
            objective: objective,
            runtimeSource: 'ARK read adapter',
            runtimeStale: false,
            workItems: [
              WorkItemView('Resume known task', WorkItemState.checkpointed, isDemo: false),
            ],
            activityEvents: [
              ActivityEvent(title: 'Receipt recorded', detail: 'checkpoint-2', kind: 'receipt', isDemo: false),
            ],
          ),
        ),
      ),
    ));
    expect(find.text('PROFESSIONAL WORKSPACE'), findsOneWidget);
    expect(find.text('OWNED ARK SNAPSHOT - READ ONLY'), findsOneWidget);
    expect(find.text('Resume known task'), findsOneWidget);
    expect(find.text('Receipt recorded'), findsOneWidget);
  });

  testWidgets('stale state does not display supplied task/activity as live', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: ProfessionalWorkspaceView(
            objective: objective,
            runtimeSource: 'ARK read adapter',
            runtimeStale: true,
            workItems: [
              WorkItemView('Potentially stale task', WorkItemState.running, isDemo: false),
            ],
            activityEvents: [
              ActivityEvent(title: 'Potentially stale event', detail: 'unverified', kind: 'event', isDemo: false),
            ],
          ),
        ),
      ),
    ));
    expect(find.text('STALE / FALLBACK - LIVE WORK NOT VERIFIED'), findsOneWidget);
    expect(find.text('Potentially stale task'), findsNothing);
    expect(find.text('Potentially stale event'), findsNothing);
    expect(find.byKey(const ValueKey('professional-workspace-queue-hidden')), findsOneWidget);
  });

  testWidgets('demo snapshot cannot show task activity as verified work', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: ProfessionalWorkspaceView(
            objective: EnvironmentObjectiveView(
              title: 'Mock objective',
              state: EnvironmentRunState.working,
              nextAction: 'Demo only',
              isDemo: true,
            ),
            runtimeSource: 'ARK read adapter',
            runtimeStale: false,
            workItems: [WorkItemView('Fake completion', WorkItemState.complete)],
            activityEvents: [],
          ),
        ),
      ),
    ));
    expect(find.text('DEMO / UNVERIFIED - LIVE WORK NOT VERIFIED'), findsOneWidget);
    expect(find.text('Fake completion'), findsNothing);
  });

  testWidgets('a claimed completion without a receipt cannot unlock ARK work',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: ProfessionalWorkspaceView(
            objective: EnvironmentObjectiveView(
              title: 'Unverified claimed completion',
              state: EnvironmentRunState.complete,
            ),
            runtimeSource: 'ARK read adapter',
            runtimeStale: false,
            workItems: [
              WorkItemView('Unreceipted victory', WorkItemState.complete,
                  isDemo: false),
            ],
            activityEvents: [
              ActivityEvent(title: 'Unreceipted event', detail: 'no proof',
                  kind: 'receipt', isDemo: false),
            ],
          ),
        ),
      ),
    ));
    expect(find.text('DEMO / UNVERIFIED - LIVE WORK NOT VERIFIED'),
        findsOneWidget);
    expect(find.text('INVALID OBJECTIVE STATE'), findsOneWidget);
    expect(find.text('Unreceipted victory'), findsNothing);
    expect(find.text('Unreceipted event'), findsNothing);
  });

}
