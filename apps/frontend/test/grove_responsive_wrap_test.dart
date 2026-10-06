import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:frontend/environment/grove_responsive_wrap.dart';
import 'package:frontend/environment/objective_workspace.dart';

void main() {
  testWidgets('Grove cards shrink on a narrow phone and retain desktop widths',
      (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    Widget example() => MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: GroveResponsiveWrap(
                panels: [
                  GrovePanel(
                    preferredWidth: 560,
                    child: SizedBox(key: const ValueKey('first-card'),
                        height: 70, child: Container()),
                  ),
                  GrovePanel(
                    preferredWidth: 340,
                    child: SizedBox(key: const ValueKey('second-card'),
                        height: 70, child: Container()),
                  ),
                ],
              ),
            ),
          ),
        );

    await tester.pumpWidget(example());
    final first = find.byKey(const ValueKey('first-card'));
    final second = find.byKey(const ValueKey('second-card'));
    expect(tester.getSize(first).width, 320);
    expect(tester.getSize(second).width, 320);
    expect(tester.getTopLeft(second).dy,
        greaterThan(tester.getTopLeft(first).dy));
    expect(tester.takeException(), isNull);

    tester.view.physicalSize = const Size(1200, 800);
    await tester.pumpWidget(example());
    expect(tester.getSize(first).width, 560);
    expect(tester.getSize(second).width, 340);
    expect(tester.getTopLeft(second).dy, tester.getTopLeft(first).dy);
    expect(tester.takeException(), isNull);
  });

  testWidgets('saved ARK inspector stays within a 320px portrait viewport',
      (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: ObjectiveWorkspace(
            objective: EnvironmentObjectiveView(
              title: 'Saved objective',
              state: EnvironmentRunState.unavailable,
            ),
          ),
        ),
      ),
    ));
    expect(find.text('ARK · SAVED HANDOFF'), findsOneWidget);
    expect(find.text('OBJECTIVE'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
