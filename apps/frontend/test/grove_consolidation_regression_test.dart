import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('integrated Grove retains house, sundial, Moss and ARK attention',
      (tester) async {
    tester.view.physicalSize = const Size(1100, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell(
      objective: EnvironmentObjectiveView(
        title: 'Authorized research task',
        state: EnvironmentRunState.blocked,
        blocker: 'Owner review needed.',
        requiresUserAction: true,
      ),
      runtimeSource: 'ARK • READ ONLY',
    )));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('THE GROVE • HOME'), findsOneWidget);
    expect(find.text('THE GROVE · LIVING WORLD'), findsOneWidget);
    expect(find.text('THE LIVING WINDOW'), findsOneWidget);
    expect(find.text('NEEDS YOU'), findsWidgets);
    expect(find.textContaining('Moss is resting on the sofa'), findsOneWidget);

    await tester.ensureVisible(find.text('Moss on rug'));
    await tester.tap(find.text('Moss on rug'));
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.textContaining('Moss is resting on the rug'), findsOneWidget);

    // The inventory makes Home taller. Restore the scroll position before
    // checking the top-of-page ARK attention banner on the next snapshot.
    await tester.drag(find.byType(ListView).first, const Offset(0, 1800));
    await tester.pump(const Duration(milliseconds: 500));

    // A present-but-stale blocker must no longer demand an owner decision.
    await tester.pumpWidget(const MaterialApp(home: ArborEnvironmentShell(
      objective: EnvironmentObjectiveView(
        title: 'Authorized research task',
        state: EnvironmentRunState.blocked,
        blocker: 'Owner review needed.',
        requiresUserAction: true,
      ),
      runtimeSource: 'ARK • STALE',
      runtimeStale: true,
    )));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('NEEDS YOU'), findsNothing);
    expect(find.text('UNVERIFIED'), findsOneWidget);
    expect(find.textContaining('Moss is resting on the rug'), findsOneWidget);
    expect(find.text('THE LIVING WINDOW'), findsOneWidget);
  });
}
