import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';

void main() {
  testWidgets('Diary navigation protects a draft until explicit discard',
      (tester) async {
    tester.view.physicalSize = const Size(1400, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));
    await tester.tap(find.text('Diary'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('MANUAL DRAFT · NOT SAVED'), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('diary-entry')), 'A temporary thought.',
    );
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();
    await tester.tap(find.text('Projects'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Leave unsaved diary draft?'), findsOneWidget);
    await tester.tap(find.text('Keep writing'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('A temporary thought.'), findsOneWidget);
    expect(find.text('MANUAL DRAFT · NOT SAVED'), findsOneWidget);

    await tester.tap(find.text('Projects'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Leave without saving'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Diary'));
    await tester.pump(const Duration(milliseconds: 300));
    final field = tester.widget<TextField>(
      find.byKey(const ValueKey('diary-entry')),
    );
    expect(field.controller?.text, isEmpty);
    expect(find.text('A temporary thought.'), findsNothing);
  });

  testWidgets('Diary system back also protects an unsaved draft',
      (tester) async {
    tester.view.physicalSize = const Size(1400, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));
    await tester.tap(find.text('Diary'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.enterText(
      find.byKey(const ValueKey('diary-title')), 'Do not lose this',
    );
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();

    await tester.binding.handlePopRoute();
    await tester.pump(const Duration(milliseconds: 250));
    expect(find.text('Leave unsaved diary draft?'), findsOneWidget);
    await tester.tap(find.text('Keep writing'));
    await tester.pump(const Duration(milliseconds: 250));
    expect(find.text('Do not lose this'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(find.text('Leave without saving'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
  });

  testWidgets('Empty Diary draft can leave without a confirmation',
      (tester) async {
    tester.view.physicalSize = const Size(1400, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));
    await tester.tap(find.text('Diary'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Projects'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Leave unsaved diary draft?'), findsNothing);
    expect(find.text('MANUAL DRAFT · NOT SAVED'), findsNothing);
  });
}
