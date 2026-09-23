import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/grove_house_clock.dart';
import 'package:frontend/environment/grove_observatory_view.dart';
import 'package:frontend/environment/grove_window_time_selection.dart';

void main() {
  testWidgets('observatory follows sundial but never changes real house time',
      (tester) async {
    tester.view.physicalSize = const Size(1000, 1900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final real = DateTime(2026, 9, 22, 21, 30);
    final house = GroveHouseClock(now: () => real, autoStart: false);
    final preview = GroveWindowTimeSelection();
    addTearDown(house.dispose);
    addTearDown(preview.dispose);
    var homeRequested = false;

    await tester.pumpWidget(MaterialApp(home: Scaffold(
      body: SingleChildScrollView(child: GroveObservatoryView(
        clock: house,
        windowPreview: preview,
        onReturnHome: () => homeRequested = true,
      )),
    )));
    expect(find.text('THE GROVE / OBSERVATORY'), findsOneWidget);
    expect(find.text('LIVE • Night'), findsOneWidget);
    expect(find.text('THE LIVING WINDOW'), findsOneWidget);
    expect(house.localNow, real);

    await tester.ensureVisible(find.text('Preview another time'));
    await tester.tap(find.text('Preview another time'));
    await tester.pump();
    expect(preview.isPreviewing, isTrue);

    final slider = tester.widget<Slider>(find.byType(Slider));
    slider.onChanged!(12 * 60.0);
    await tester.pump();
    expect(find.text('WINDOW PREVIEW • Daylight'), findsOneWidget);
    expect(house.localNow, real,
        reason: 'A virtual sky must not move the actual House Clock');

    await tester.ensureVisible(find.text('Return to Now'));
    await tester.tap(find.text('Return to Now'));
    await tester.pump();
    expect(find.text('LIVE • Night'), findsOneWidget);

    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.tap(find.text('Back to the Grove'));
    expect(homeRequested, isTrue);
  });

  testWidgets('upstairs opens Observatory, which returns to the same house',
      (tester) async {
    tester.view.physicalSize = const Size(1000, 1900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
        const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 100));

    await tester.ensureVisible(
        find.widgetWithText(OutlinedButton, 'Stairs'));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Stairs'));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.ensureVisible(find.text('The Observatory'));
    await tester.pump();
    await tester.tap(find.text('The Observatory'));
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.text('THE GROVE / OBSERVATORY'), findsOneWidget);
    expect(find.text('THE LIVING WINDOW'), findsOneWidget);

    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.tap(find.text('Back to the Grove'));
    await tester.pump();
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
  });
}
