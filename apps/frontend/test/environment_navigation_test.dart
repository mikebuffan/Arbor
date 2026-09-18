import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';

void main() {
  testWidgets('desktop navigation opens objective and evidence surfaces', (tester) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));

    await tester.tap(find.text('Objective'));
    await tester.pumpAndSettle();
    expect(find.text('WHY THIS EXISTS'), findsOneWidget);

    await tester.tap(find.text('Evidence'));
    await tester.pumpAndSettle();
    expect(find.text('EVIDENCE & PROVENANCE'), findsOneWidget);
    expect(find.textContaining('Repetition is not corroboration'), findsOneWidget);
  });

  testWidgets('command palette is reachable from visible control', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));
    await tester.tap(find.byTooltip('Open command palette'));
    await tester.pumpAndSettle();

    expect(find.text('COMMAND PALETTE'), findsOneWidget);
    expect(find.text('Open Current Objective'), findsOneWidget);
    expect(find.text('Open Evidence & Provenance'), findsOneWidget);
  });

  testWidgets('inspector is reachable from visible control', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));
    await tester.tap(find.byTooltip('Open inspector'));
    await tester.pumpAndSettle();

    expect(find.text('INSPECTOR'), findsOneWidget);
    expect(find.textContaining('Live backend inspection remains disconnected'), findsOneWidget);
  });
}
