import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_ark_handoff.dart';
import 'package:frontend/environment/grove_ark_handoff_view.dart';

GroveArkHandoff saved(String project, {
  bool available = true,
  String? goal,
  String? status,
  String? next,
  String? blocker,
  bool decision = false,
}) => GroveArkHandoff(
  projectId: project,
  available: available,
  capturedAt: DateTime.utc(2026, 9, 21, 20),
  goal: goal,
  status: status,
  objectiveId: goal == null ? null : 'objective-1',
  nextAction: next,
  checkpoint: next == null ? null : 'Checkpoint #2 · ' + next,
  blocker: blocker,
  needsOwnerDecision: decision,
  completionEvidenceRecorded: false,
);

Future<void> showHandoff(
  WidgetTester tester,
  Future<GroveArkHandoff> Function() reader, {
  Stream<void>? invalidations,
}) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: SingleChildScrollView(
        child: GroveArkHandoffView(
          load: reader,
          invalidations: invalidations,
        ),
      ),
    ),
  ));
}

void main() {
  testWidgets('does not read or claim running in background before tap',
      (tester) async {
    var calls = 0;
    await showHandoff(tester, () async {
      calls++;
      return saved('project-a', goal: 'Continue', status: 'running');
    });
    expect(calls, 0);
    expect(find.textContaining('This does not resume'), findsOneWidget);
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(calls, 1);
    expect(find.text('Continue'), findsOneWidget);
    expect(find.textContaining('not a live worker heartbeat'), findsOneWidget);
  });

  testWidgets('real checkpoint and next recorded action appear as saved data',
      (tester) async {
    await showHandoff(tester, () async => saved('project-a',
      goal: 'Restore the Grove', status: 'checkpointed',
      next: 'Check page 7',
    ));
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(find.text('Restore the Grove'), findsOneWidget);
    expect(find.textContaining('Next recorded action: Check page 7'),
        findsOneWidget);
    expect(find.byKey(const ValueKey('handoff-checkpoint')), findsOneWidget);
  });

  testWidgets('owner decision appears only when explicitly marked',
      (tester) async {
    await showHandoff(tester, () async => saved('project-a',
      goal: 'Publish work', status: 'blocked',
      blocker: 'Owner approval before release', decision: true,
    ));
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(find.textContaining('DECISION REQUIRED'), findsOneWidget);
  });

  testWidgets('unavailable and empty are distinct from a successful objective',
      (tester) async {
    await showHandoff(tester, () async =>
        saved('project-a', available: false));
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(find.byKey(const ValueKey('handoff-unavailable')), findsOneWidget);
    await showHandoff(tester, () async => saved('project-b'));
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(find.byKey(const ValueKey('handoff-empty')), findsOneWidget);
  });

  testWidgets('failure clears prior objective without invented continuation',
      (tester) async {
    var calls = 0;
    await showHandoff(tester, () async {
      calls++;
      if (calls == 1) return saved('project-a', goal: 'Private objective');
      throw StateError('offline');
    });
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(find.text('Private objective'), findsOneWidget);
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(find.text('Private objective'), findsNothing);
    expect(find.byKey(const ValueKey('handoff-error')), findsOneWidget);
  });

  testWidgets('scope invalidation hides previous project immediately',
      (tester) async {
    final changes = StreamController<void>.broadcast(sync: true);
    final waiting = Completer<GroveArkHandoff>();
    var reads = 0;
    await showHandoff(tester, () {
      reads++;
      return reads == 1
          ? Future.value(saved('project-a', goal: 'A private goal'))
          : waiting.future;
    }, invalidations: changes.stream);
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    expect(find.text('A private goal'), findsOneWidget);
    changes.add(null);
    await tester.pump();
    expect(find.text('A private goal'), findsNothing);
    expect(find.text('Read saved handoff'), findsOneWidget);
    await tester.tap(find.text('Read saved handoff'));
    await tester.pump();
    waiting.complete(saved('project-b', goal: 'Another project'));
    await tester.pump();
    expect(find.text('A private goal'), findsNothing);
    expect(find.text('Another project'), findsOneWidget);
    await changes.close();
  });
}
