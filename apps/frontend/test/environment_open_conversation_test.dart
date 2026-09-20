import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/environment_state.dart';

void main() {
  testWidgets('Firefly opens on Talk and keeps Home one tap away',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ArborEnvironmentShell(
          initialDestination: EnvironmentDestination.conversation,
          conversationLayer: Center(child: Text('CHAT READY')),
          objective: EnvironmentObjectiveView(
            title: 'No active ARK objective',
            state: EnvironmentRunState.idle,
          ),
          runtimeSource: 'ARK • READ ONLY',
        ),
      ),
    );
    await tester.pump();

    expect(find.text('CHAT READY'), findsOneWidget);
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 1);

    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 0);

    await tester.tap(find.text('Talk'));
    await tester.pumpAndSettle();
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 1);
    expect(find.text('CHAT READY'), findsOneWidget);
  });
}
