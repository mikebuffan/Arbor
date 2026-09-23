import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_document_shelf.dart';
import 'package:frontend/environment/grove_document_shelf_view.dart';

GroveDocument file(String id, String project) => GroveDocument(
  id: id, projectId: project, conversationId: 'conversation-1',
  displayName: 'Report $id.pdf',
);

GroveDocumentPage page(String project,
    {List<GroveDocument> docs = const [], String? cursor}) =>
    GroveDocumentPage(projectId: project, documents: docs,
      nextCursor: cursor);

Future<void> show(
  WidgetTester tester,
  Future<GroveDocumentPage> Function(String? after) load, {
  Stream<void>? invalidations,
}) async {
  await tester.pumpWidget(MaterialApp(home: Scaffold(
    body: SingleChildScrollView(
      child: GroveDocumentShelfView(
        load: load,
        invalidations: invalidations,
      ),
    ),
  )));
  await tester.pump();
}

void main() {
  testWidgets('shows real metadata as unopened attachments', (tester) async {
    await show(tester, (_) async => page('project-a',
      docs: [file('one', 'project-a')]));
    expect(find.text('Report one.pdf'), findsOneWidget);
    expect(find.textContaining('UNOPENED ATTACHMENT'), findsOneWidget);
    expect(find.textContaining('Not all project files'), findsOneWidget);
    expect(find.text('Project: project-a'), findsOneWidget);
  });

  testWidgets('empty list does not claim there are no other project files',
      (tester) async {
    await show(tester, (_) async => page('project-a'));
    expect(find.byKey(const ValueKey('grove-document-empty')), findsOneWidget);
    expect(find.textContaining('chat attachments'), findsWidgets);
  });

  testWidgets('pagination appends only the next page', (tester) async {
    final calls = <String?>[];
    await show(tester, (after) async {
      calls.add(after);
      return after == null
          ? page('project-a', docs: [file('one', 'project-a')], cursor: 'one')
          : page('project-a', docs: [file('two', 'project-a')]);
    });
    await tester.tap(find.text('Load more attachments'));
    await tester.pump();
    expect(calls, [null, 'one']);
    expect(find.text('Report one.pdf'), findsOneWidget);
    expect(find.text('Report two.pdf'), findsOneWidget);
    expect(find.text('Load more attachments'), findsNothing);
  });

  testWidgets('a mismatched project on next page clears previous documents',
      (tester) async {
    await show(tester, (after) async => after == null
        ? page('project-a', docs: [file('one', 'project-a')], cursor: 'one')
        : page('project-b', docs: [file('other', 'project-b')]));
    await tester.tap(find.text('Load more attachments'));
    await tester.pump();
    expect(find.text('Report one.pdf'), findsNothing);
    expect(find.byKey(const ValueKey('grove-document-error')), findsOneWidget);
  });

  testWidgets('failed refresh clears previously visible project data',
      (tester) async {
    var count = 0;
    await show(tester, (_) async {
      count++;
      if (count == 1) return page('project-a', docs: [file('one', 'project-a')]);
      throw StateError('offline');
    });
    expect(find.text('Report one.pdf'), findsOneWidget);
    await tester.tap(find.text('Refresh attachments'));
    await tester.pump();
    expect(find.text('Report one.pdf'), findsNothing);
    expect(find.byKey(const ValueKey('grove-document-error')), findsOneWidget);
  });

  testWidgets('outdated requests cannot overwrite the newer screen',
      (tester) async {
    final old = Completer<GroveDocumentPage>();
    await show(tester, (_) => old.future);
    await show(tester, (_) async =>
        page('project-b', docs: [file('new', 'project-b')]));
    old.complete(page('project-a', docs: [file('old', 'project-a')]));
    await tester.pump();
    expect(find.text('Report new.pdf'), findsOneWidget);
    expect(find.text('Report old.pdf'), findsNothing);
  });

  testWidgets('scope change hides document names until new project is loaded',
      (tester) async {
    final changes = StreamController<void>.broadcast(sync: true);
    final pending = Completer<GroveDocumentPage>();
    var reads = 0;
    await show(tester, (_) {
      reads++;
      if (reads == 1) {
        return Future.value(
            page('project-a', docs: [file('old', 'project-a')]));
      }
      return pending.future;
    }, invalidations: changes.stream);
    expect(find.text('Report old.pdf'), findsOneWidget);
    changes.add(null);
    await tester.pump();
    expect(find.text('Report old.pdf'), findsNothing);
    expect(find.byKey(const ValueKey('grove-document-loading')),
        findsOneWidget);
    pending.complete(
        page('project-b', docs: [file('new', 'project-b')]));
    await tester.pump();
    expect(find.text('Report old.pdf'), findsNothing);
    expect(find.text('Report new.pdf'), findsOneWidget);
    await changes.close();
  });

}
