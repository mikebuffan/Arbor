import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_memory_shelf.dart';
import 'package:frontend/environment/grove_memory_shelf_view.dart';

GroveSavedMemory saved(String id) => GroveSavedMemory(
  id: id,
  key: 'fact.' + id,
  text: 'Actually saved content ' + id,
  scope: 'project',
  updatedAt: DateTime.utc(2026, 9, 21),
);

GroveMemoryShelfSnapshot snapshot(
  String project, {
  List<GroveSavedMemory> memories = const [],
  bool partial = false,
}) => GroveMemoryShelfSnapshot(
  projectId: project,
  memories: memories,
  rowsReceived: memories.length,
  possiblyMoreOnServer: partial,
);

Future<void> showShelf(
  WidgetTester tester,
  Future<GroveMemoryShelfSnapshot> Function() loader, {
  Stream<void>? invalidations,
}) => tester.pumpWidget(MaterialApp(
  home: Scaffold(
    body: SingleChildScrollView(
      child: GroveMemoryShelfView(
        load: loader,
        invalidations: invalidations,
      ),
    ),
  ),
));

void main() {
  testWidgets('shows only actual loaded saved memory cards', (tester) async {
    await showShelf(tester, () async => snapshot(
      'project-a', memories: [saved('one')],
    ));
    await tester.pump();
    expect(find.text('fact.one'), findsOneWidget);
    expect(find.text('Actually saved content one'), findsOneWidget);
    expect(find.text('Project: project-a'), findsOneWidget);
    expect(find.textContaining('Not original documents'), findsOneWidget);
    expect(find.textContaining('SAVED MEMORY · project · ID one'),
        findsOneWidget);
  });

  testWidgets('missing/failed read shows unavailability, never demo facts',
      (tester) async {
    await showShelf(tester, () async {
      throw const GroveMemoryShelfUnavailable('No project selected.');
    });
    await tester.pump();
    expect(find.text('No project selected.'), findsOneWidget);
    expect(find.textContaining('Actually saved content'), findsNothing);
  });

  testWidgets('empty scoped response never claims a complete archive',
      (tester) async {
    await showShelf(tester, () async => snapshot('project-a'));
    await tester.pump();
    expect(find.byKey(const ValueKey('grove-memory-empty')),
        findsOneWidget);
    expect(find.textContaining('does not mean no other memories exist'),
        findsOneWidget);
  });

  testWidgets('500-row results show clear partial marker', (tester) async {
    await showShelf(tester, () async => snapshot(
      'project-a', memories: [saved('one')], partial: true,
    ));
    await tester.pump();
    expect(find.textContaining('SERVER RESULT MAY BE PARTIAL'),
        findsOneWidget);
  });

  testWidgets('failed refresh clears prior project data', (tester) async {
    var calls = 0;
    await showShelf(tester, () async {
      calls++;
      if (calls == 1) return snapshot('project-a', memories: [saved('a')]);
      throw StateError('offline');
    });
    await tester.pump();
    expect(find.text('Actually saved content a'), findsOneWidget);
    await tester.tap(find.text('Refresh saved memory'));
    await tester.pump();
    expect(find.text('Actually saved content a'), findsNothing);
    expect(find.byKey(const ValueKey('grove-memory-unavailable')),
        findsOneWidget);
  });

  testWidgets('slow stale request cannot overwrite newer project result',
      (tester) async {
    final first = Completer<GroveMemoryShelfSnapshot>();
    await showShelf(tester, () => first.future);
    expect(find.byKey(const ValueKey('grove-memory-loading')),
        findsOneWidget);
    await showShelf(tester, () async =>
        snapshot('project-b', memories: [saved('b')]));
    await tester.pump();
    first.complete(snapshot('project-a', memories: [saved('a')]));
    await tester.pump();
    expect(find.text('Project: project-b'), findsOneWidget);
    expect(find.text('Actually saved content a'), findsNothing);
    expect(find.text('Actually saved content b'), findsOneWidget);
  });

  testWidgets('scope change immediately hides old project while reload waits',
      (tester) async {
    final changes = StreamController<void>.broadcast(sync: true);
    final pending = Completer<GroveMemoryShelfSnapshot>();
    var reads = 0;
    await showShelf(tester, () {
      reads++;
      if (reads == 1) {
        return Future.value(snapshot('project-a',
            memories: [saved('a')]));
      }
      return pending.future;
    }, invalidations: changes.stream);
    await tester.pump();
    expect(find.text('Actually saved content a'), findsOneWidget);

    changes.add(null);
    await tester.pump();
    expect(find.text('Actually saved content a'), findsNothing);
    expect(find.byKey(const ValueKey('grove-memory-loading')),
        findsOneWidget);
    pending.complete(snapshot('project-b', memories: [saved('b')]));
    await tester.pump();
    expect(find.text('Actually saved content a'), findsNothing);
    expect(find.text('Actually saved content b'), findsOneWidget);
    await changes.close();
  });

}
