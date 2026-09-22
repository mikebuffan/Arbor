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

  testWidgets('no grants leave the private house inaccessible',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: GrovePrivateProjectGate(
        loadProjects: () async => [],
        selectProject: (_) async {},
        child: const Text('PRIVATE HOUSE READY'),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.textContaining('No private ARK projects are granted yet.'),
        findsOneWidget);
    expect(find.text('PRIVATE HOUSE READY'), findsNothing);
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
