import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';

void main() {
  testWidgets('Kitchen desktop navigation warns, cancel preserves and confirm leaves',
      (tester) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell(
      conversationLayer: Center(child: Text('CHAT READY')),
    )));
    await tester.pump(const Duration(milliseconds: 150));
    final door = find.widgetWithText(OutlinedButton, 'Kitchen');
    await tester.ensureVisible(door);
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(door);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.enterText(find.byType(TextField), 'Keep this scene note');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.text('Projects').first);
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Leave Annabelle’s kitchen?'), findsOneWidget);
    await tester.tap(find.text('Keep writing'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Keep this scene note'), findsOneWidget);
    expect(find.text('THE GROVE / ANNABELLE’S KITCHEN'), findsOneWidget);

    await tester.tap(find.text('Projects').first);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Leave without saving'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / ANNABELLE’S KITCHEN'), findsNothing);
  });

  testWidgets('Kitchen mobile Talk guard and empty draft do not invent a save',
      (tester) async {
    tester.view.physicalSize = const Size(390, 850);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell(
      conversationLayer: Center(child: Text('CHAT READY')),
    )));
    await tester.pump(const Duration(milliseconds: 150));
    final door = find.widgetWithText(OutlinedButton, 'Kitchen');
    await tester.ensureVisible(door);
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(door);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.enterText(find.byType(TextField), 'An unsaved draft');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.text('Talk').last);
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Leave Annabelle’s kitchen?'), findsOneWidget);
    await tester.tap(find.text('Keep writing'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('An unsaved draft'), findsOneWidget);
    await tester.tap(find.text('Talk').last);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Leave without saving'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / ANNABELLE’S KITCHEN'), findsNothing);

    await tester.tap(find.text('Home').last);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.ensureVisible(door);
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(door);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Leave Annabelle’s kitchen?'), findsNothing);
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
  });

  testWidgets('Kitchen Android back also guards unsaved notes',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell(
      conversationLayer: Center(child: Text('CHAT READY')),
    )));
    await tester.pump(const Duration(milliseconds: 150));
    final door = find.widgetWithText(OutlinedButton, 'Kitchen');
    await tester.ensureVisible(door);
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(door);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.enterText(find.byType(TextField), 'Back button note');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.binding.handlePopRoute();
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Leave Annabelle’s kitchen?'), findsOneWidget);
    await tester.tap(find.text('Keep writing'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Back button note'), findsOneWidget);
  });
}
