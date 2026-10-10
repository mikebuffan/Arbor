import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:frontend/environment/grove_diary_draft_view.dart';
import 'package:frontend/environment/professional_workspace_view.dart';

void main() {
  testWidgets('nonempty diary cannot be erased without confirming discard',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(child: GroveDiaryDraftView()),
      ),
    ));
    const entry = ValueKey('diary-entry');
    const clear = ValueKey('diary-clear-button');
    await tester.enterText(find.byKey(entry), 'An unsaved scene note');
    await tester.pump();
    tester.testTextInput.hide();
    await tester.ensureVisible(find.byKey(clear));
    await tester.pump();
    await tester.tap(find.byKey(clear));
    await tester.pumpAndSettle();

    expect(find.text('Discard unsaved diary draft?'), findsOneWidget);
    expect(tester.widget<TextField>(find.byKey(entry)).controller!.text,
        'An unsaved scene note');

    await tester.tap(find.text('Keep draft'));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byKey(entry)).controller!.text,
        'An unsaved scene note');

    await tester.ensureVisible(find.byKey(clear));
    await tester.tap(find.byKey(clear));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Discard draft'));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byKey(entry)).controller!.text,
        isEmpty);
    expect(find.text('UNSAVED PREVIEW'), findsNothing);
  });

  testWidgets('professional workspace does not present demo queue as live',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: ProfessionalWorkspaceView(
            objective: EnvironmentFixture.houseHasWalls(),
            workItems: const [],
            activityEvents: const [],
            runtimeSource: 'DEMO DATA',
            runtimeStale: false,
          ),
        ),
      ),
    ));
    await tester.pump();
    expect(find.text('DEMO / UNVERIFIED - LIVE WORK NOT VERIFIED'),
        findsOneWidget);
    expect(find.byKey(const ValueKey('professional-workspace-queue-hidden')),
        findsOneWidget);
    expect(find.text('ACTIVITY UNVERIFIED - no background work is implied.'),
        findsOneWidget);
  });
}
