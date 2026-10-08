import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_diary_draft_view.dart';

void main() {
  testWidgets('manual diary preview is explicitly unsaved', (tester) async {
    tester.view.physicalSize = const Size(1200, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveDiaryDraftView())),
    ));

    expect(find.text('MANUAL DRAFT · NOT SAVED'), findsOneWidget);
    expect(find.byKey(const ValueKey('diary-preview-label')), findsNothing);

    await tester.enterText(
      find.byKey(const ValueKey('diary-entry')),
      'Today was busy but I got things done.',
    );
    await tester.ensureVisible(find.byKey(const ValueKey('diary-preview-button')));
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('diary-preview-button'))).onPressed, isNotNull);
    await tester.tap(find.byKey(const ValueKey('diary-preview-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('diary-preview-label')), findsOneWidget);
    expect(find.text('Today was busy but I got things done.'), findsWidgets);
  });

  testWidgets('editing invalidates old preview and clearing erases draft', (tester) async {
    tester.view.physicalSize = const Size(1200, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveDiaryDraftView())),
    ));
    await tester.enterText(find.byKey(const ValueKey('diary-entry')), 'First wording.');
    await tester.ensureVisible(find.byKey(const ValueKey('diary-preview-button')));
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('diary-preview-button'))).onPressed, isNotNull);
    await tester.tap(find.byKey(const ValueKey('diary-preview-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('diary-preview-label')), findsOneWidget);

    await tester.enterText(find.byKey(const ValueKey('diary-entry')), 'Revised wording.');
    await tester.pump();
    expect(find.byKey(const ValueKey('diary-preview-label')), findsNothing);

    await tester.ensureVisible(find.byKey(const ValueKey('diary-clear-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('diary-clear-button')));
    await tester.pumpAndSettle();
    expect(find.text('Revised wording.'), findsNothing);
    expect(find.byKey(const ValueKey('diary-preview-label')), findsNothing);
  });

  testWidgets('a new screen does not restore an old diary draft', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveDiaryDraftView())),
    ));
    await tester.enterText(find.byKey(const ValueKey('diary-entry')), 'Private first draft.');
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Text('Elsewhere'))));
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveDiaryDraftView())),
    ));
    await tester.pump();
    final field = tester.widget<TextField>(find.byKey(const ValueKey('diary-entry')));
    expect(field.controller?.text, isEmpty);
    expect(find.text('Private first draft.'), findsNothing);
  });
}
