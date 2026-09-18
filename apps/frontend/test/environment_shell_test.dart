import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/environment_state.dart';

void main() {
  testWidgets('environment labels fixture operational state as demo data', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));
    expect(find.text('DEMO DATA'), findsOneWidget);
    expect(find.text('Build Arbor Environment — House Has Walls'), findsWidgets);
  });

  testWidgets('invalid complete state is visibly rejected', (tester) async {
    const invalid = EnvironmentObjectiveView(
      title: 'Impossible completion',
      state: EnvironmentRunState.complete,
    );
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell(objective: invalid)));
    expect(find.text('INVALID STATE'), findsOneWidget);
  });

  testWidgets('desktop environment exposes primary destinations', (tester) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell()));
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Conversation'), findsOneWidget);
    expect(find.text('Work Queue'), findsOneWidget);
    expect(find.text('Evidence'), findsOneWidget);
    expect(find.text('Benchmarks'), findsOneWidget);
  });
}
