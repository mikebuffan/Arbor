import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pages/grove_private_project_gate.dart';

const projectA = '00000000-0000-4000-8000-000000000003';
const projectB = '00000000-0000-4000-8000-000000000004';

void main() {
  test('granted project response parser rejects stale or malformed lists', () {
    expect(parseGroveGrantedProjectIds({
      'ok': true, 'projects': [projectA, projectB],
    }), [projectA, projectB]);
    for (final bad in <Map<String, dynamic>?>[
      null,
      {'ok': false, 'projects': [projectA]},
      {'ok': true, 'projects': null},
      {'ok': true, 'projects': [projectA, projectA]},
      {'ok': true, 'projects': ['arbitrary-project']},
      {'ok': true, 'projects': List.filled(51, projectA)},
    ]) {
      expect(() => parseGroveGrantedProjectIds(bad),
          throwsA(isA<FormatException>()));
    }
  });

  test('same UUID in different hexadecimal case cannot duplicate project access', () {
    const id = 'abcdefab-1234-4000-8000-abcdef123456';
    expect(() => parseGroveGrantedProjectIds({
      'ok': true, 'projects': [id, id.toUpperCase()],
    }), throwsFormatException);
  });

  testWidgets('one verified private grant opens the room exactly once',
      (tester) async {
    final chosen = <String>[];
    await tester.pumpWidget(MaterialApp(
      home: GrovePrivateProjectGate(
        loadProjects: () async => [projectA],
        selectProject: (id) async { chosen.add(id); },
        child: const Text('PRIVATE HOUSE READY'),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.text('PRIVATE HOUSE READY'), findsOneWidget);
    expect(chosen, [projectA]);
  });

  testWidgets('multiple private grants demand explicit project selection',
      (tester) async {
    final chosen = <String>[];
    await tester.pumpWidget(MaterialApp(
      home: GrovePrivateProjectGate(
        loadProjects: () async => [projectA, projectB],
        selectProject: (id) async { chosen.add(id); },
        child: const Text('PRIVATE HOUSE READY'),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.textContaining('Choose an authorized project'),
        findsOneWidget);
    expect(find.text('PRIVATE HOUSE READY'), findsNothing);
    expect(chosen, isEmpty);
    expect(find.text('Project 00000000…0003'), findsOneWidget);
    expect(find.text('Project 00000000…0004'), findsOneWidget);
    await tester.tap(find.text('Project 00000000…0004'));
    await tester.pumpAndSettle();
    expect(chosen, [projectB]);
    expect(find.text('PRIVATE HOUSE READY'), findsOneWidget);
  });

  testWidgets('invited owner can enter house without an ARK grant',
      (tester) async {
    final chosen = <String>[];
    await tester.pumpWidget(MaterialApp(
      home: GrovePrivateProjectGate(
        loadProjects: () async => [],
        selectProject: (id) async { chosen.add(id); },
        child: const Text('PRIVATE HOUSE READY'),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.text('PRIVATE HOUSE READY'), findsOneWidget);
    expect(chosen, isEmpty,
      reason: 'Opening the room cannot manufacture an ARK project grant');
  });

  testWidgets('zero grants clears old local ARK scope before room opens',
      (tester) async {
    final cleared = Completer<void>();
    var clearCalls = 0;
    await tester.pumpWidget(MaterialApp(
      home: GrovePrivateProjectGate(
        loadProjects: () async => [],
        clearSelection: () async {
          clearCalls++;
          await cleared.future;
        },
        selectProject: (_) async {
          fail('No project may be selected without a verified grant');
        },
        child: const Text('PRIVATE HOUSE READY'),
      ),
    ));
    await tester.pump();
    await tester.pump();
    expect(clearCalls, 1);
    expect(find.text('PRIVATE HOUSE READY'), findsNothing,
      reason: 'Stale device-local ARK context must clear before entry');
    cleared.complete();
    await tester.pumpAndSettle();
    expect(find.text('PRIVATE HOUSE READY'), findsOneWidget);
  });

  testWidgets('resuming private Grove rechecks project grants before exposing room',
      (tester) async {
    final blockedRead = Completer<List<String>>();
    var reads = 0;
    await tester.pumpWidget(MaterialApp(
      home: GrovePrivateProjectGate(
        loadProjects: () {
          reads++;
          return reads == 1 ? Future.value([projectA]) : blockedRead.future;
        },
        selectProject: (_) async {},
        child: const Text('PRIVATE HOUSE READY'),
      ),
    ));
    await tester.pumpAndSettle();
    expect(reads, 1);
    expect(find.text('PRIVATE HOUSE READY'), findsOneWidget);

    // A project grant could have been revoked while the app was asleep.
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(reads, 2);
    expect(find.text('PRIVATE HOUSE READY'), findsNothing,
        reason: 'Never keep previously authorized private content visible '
            'while foreground revalidation is pending.');

    blockedRead.completeError(StateError('synthetic revoked access'));
    await tester.pumpAndSettle();
    expect(find.text('PRIVATE HOUSE READY'), findsNothing);
    expect(find.text('Private Grove project access could not be verified.'),
        findsOneWidget);
  });

  testWidgets('failed grant fetch denies access and offers retry',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: GrovePrivateProjectGate(
        loadProjects: () async => throw StateError('do not leak credential'),
        selectProject: (_) async {},
        child: const Text('PRIVATE HOUSE READY'),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.text('PRIVATE HOUSE READY'), findsNothing);
    expect(find.text('Private Grove project access could not be verified.'),
        findsOneWidget);
    expect(find.textContaining('do not leak credential'), findsNothing);
    expect(find.text('Check private project access again'), findsOneWidget);
  });
}
