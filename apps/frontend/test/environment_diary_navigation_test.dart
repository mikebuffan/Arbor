import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';

void main() {
  testWidgets('Grove diary is accessible without persisting a prior draft', (tester) async {
    tester.view.physicalSize = const Size(1400, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));

    await tester.tap(find.text('Diary'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('MANUAL DRAFT · NOT SAVED'), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('diary-entry')),
      'A temporary thought.',
    );
    await tester.tap(find.text('Projects'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Diary'));
    await tester.pump(const Duration(milliseconds: 300));

    final field = tester.widget<TextField>(
      find.byKey(const ValueKey('diary-entry')),
    );
    expect(field.controller?.text, isEmpty);
    expect(find.text('A temporary thought.'), findsNothing);
  });
}
