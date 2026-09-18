import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:frontend/environment/work_queue.dart';

void main() {
  testWidgets('live ARK snapshot never masquerades as demo data', (tester) async {
    const objective = EnvironmentObjectiveView(
      title: 'Live ARK objective',
      state: EnvironmentRunState.checkpointed,
      checkpointReceipt: 'Checkpoint #2 • interruption • Resume at cursor 7',
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: ArborEnvironmentShell(
          objective: objective,
          workItems: [
            WorkItemView(
              'Resume extraction',
              WorkItemState.checkpointed,
              detail: 'attempt 2/3 • checkpoint #2',
              isDemo: false,
            ),
          ],
          runtimeSource: 'ARK • READ ONLY',
        ),
      ),
    );

    expect(find.text('CHECKPOINTED'), findsOneWidget);
    expect(find.text('DEMO DATA'), findsNothing);
    expect(find.textContaining('ARK • READ ONLY'), findsOneWidget);
  });

  testWidgets('work queue renders the real ARK task state', (tester) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: ArborEnvironmentShell(
          objective: EnvironmentObjectiveView(
            title: 'Canary',
            state: EnvironmentRunState.working,
            nextAction: 'Execute canary',
          ),
          workItems: [
            WorkItemView(
              'Execute canary',
              WorkItemState.running,
              detail: 'arbor.agency-tool • attempt 1/3',
              isDemo: false,
            ),
          ],
          runtimeSource: 'ARK • READ ONLY',
        ),
      ),
    );

    await tester.tap(find.text('Work Queue'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Execute canary'), findsOneWidget);
    expect(find.textContaining('attempt 1/3'), findsOneWidget);
    expect(find.text('DEMO'), findsNothing);
  });

  testWidgets('blocked ARK objective is not labeled complete', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ArborEnvironmentShell(
          objective: EnvironmentObjectiveView(
            title: 'Blocked objective',
            state: EnvironmentRunState.blocked,
            blocker: 'authorization required',
          ),
          runtimeSource: 'ARK • READ ONLY',
        ),
      ),
    );

    expect(find.text('BLOCKED'), findsOneWidget);
    expect(find.text('COMPLETE'), findsNothing);
  });
}
