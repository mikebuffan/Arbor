import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_astronomy.dart';
import 'package:frontend/environment/grove_house_clock.dart';
import 'package:frontend/environment/grove_house_room.dart';
import 'package:frontend/environment/grove_living_window_panel.dart';
import 'package:frontend/environment/grove_window_time_selection.dart';

void main() {
  testWidgets('sundial controls really change the ROOM WINDOW while clock stays live',
      (tester) async {
    tester.view.physicalSize = const Size(1100, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final real = DateTime(2026, 9, 21, 21, 30);
    final house = GroveHouseClock(now: () => real, autoStart: false);
    final preview = GroveWindowTimeSelection();
    addTearDown(house.dispose);
    addTearDown(preview.dispose);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: Column(
        children: [
          GroveHouseRoom(
            clock: house,
            windowPreview: preview,
            onOpen: (_) {},
          ),
          GroveLivingWindowPanel(
            clock: () => real,
            windowPreview: preview,
          ),
        ],
      ))),
    ));

    expect(find.textContaining('LIVE • Night'), findsOneWidget);
    expect(preview.isPreviewing, isFalse);
    expect(house.localNow, real);

    await tester.ensureVisible(find.text('Preview another time'));
    await tester.tap(find.text('Preview another time'));
    await tester.pump();
    expect(find.textContaining('WINDOW PREVIEW'), findsOneWidget);
    expect(preview.isPreviewing, isTrue);

    // Drive the actual sundial slider handler to noon.
    final slider = tester.widget<Slider>(find.byType(Slider));
    slider.onChanged!(12 * 60.0);
    await tester.pump();
    expect(preview.previewAt!.hour, 12);
    expect(GroveAstronomy.at(preview.previewAt!).phase,
      GroveDayPhase.daylight);
    expect(find.textContaining('WINDOW PREVIEW • Daylight'),
      findsOneWidget);
    expect(house.localNow, real,
      reason: 'Preview must never change real House Clock');

    await tester.ensureVisible(find.text('Day →'));
    await tester.tap(find.text('Day →'));
    await tester.pump();
    expect(preview.previewAt!.day, 22);
    expect(house.localNow.day, 21);

    await tester.ensureVisible(find.text('Return to Now'));
    await tester.tap(find.text('Return to Now'));
    await tester.pump();
    expect(preview.isPreviewing, isFalse);
    expect(find.textContaining('LIVE • Night'), findsOneWidget);
    expect(house.localNow, real);
  });

  testWidgets('room can return window to live time without opening panel',
      (tester) async {
    final real = DateTime(2026, 9, 21, 21);
    final house = GroveHouseClock(now: () => real, autoStart: false);
    final preview = GroveWindowTimeSelection();
    addTearDown(house.dispose);
    addTearDown(preview.dispose);
    preview.show(DateTime(2026, 9, 21, 12));

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveHouseRoom(
        clock: house,
        windowPreview: preview,
        onOpen: (_) {},
      ))),
    ));

    expect(find.textContaining('WINDOW PREVIEW • Daylight'),
      findsOneWidget);
    await tester.ensureVisible(find.text('Return window to Now'));
    await tester.tap(find.text('Return window to Now'));
    await tester.pump();
    expect(preview.isPreviewing, isFalse);
    expect(find.textContaining('LIVE • Night'), findsOneWidget);
    expect(house.localNow, real);
  });
}
