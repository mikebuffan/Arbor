import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';

void main() {
  testWidgets('Grove kitchen door opens a distinct shared-clock room',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / ANNABELLE’S KITCHEN'), findsOneWidget);
    expect(find.textContaining('Same house clock'), findsOneWidget);
    expect(find.textContaining('writing/voice-mode switch is not yet wired'),
        findsOneWidget);
    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
  });

  testWidgets('Grove window door opens live temporal controls',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 150));
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Window'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Window'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE LIVING WINDOW'), findsWidgets);
    expect(find.text('Preview another time'), findsWidgets);
  });
}
