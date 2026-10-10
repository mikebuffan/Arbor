import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_living_window_panel.dart';
import 'package:frontend/environment/grove_house_room.dart';
import 'package:frontend/environment/grove_house_clock.dart';

void main() {
  testWidgets('Living Window starts live and returns from preview', (tester) async {
    final frozen = DateTime(2026, 6, 21, 12);
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(
        child: GroveLivingWindowPanel(clock: () => frozen),
      )),
    ));
    expect(find.text('THE LIVING WINDOW'), findsOneWidget);
    expect(find.textContaining('LOCAL TIME · LIVE'), findsOneWidget);
    expect(find.text('Daylight'), findsOneWidget);

    await tester.tap(find.text('Preview another time'));
    await tester.pump();
    expect(find.textContaining('PREVIEW TIME'), findsOneWidget);
    expect(find.text('Return to Now'), findsOneWidget);

    await tester.tap(find.text('Return to Now'));
    await tester.pump();
    expect(find.textContaining('LOCAL TIME · LIVE'), findsOneWidget);
    expect(find.text('Return to Now'), findsNothing);
  });

  testWidgets('opening shared Living Window after a minute change never rebuilds another room mid-frame',
      (tester) async {
    var current = DateTime(2026, 6, 21, 12, 0);
    final clock = GroveHouseClock(now: () => current, autoStart: false);
    addTearDown(clock.dispose);
    var opened = false;
    await tester.pumpWidget(MaterialApp(home: StatefulBuilder(
      builder: (context, change) => Scaffold(
        body: SingleChildScrollView(child: Column(children: [
          TextButton(
            onPressed: () {
              current = DateTime(2026, 6, 21, 12, 1);
              change(() => opened = true);
            },
            child: const Text('Open shared window'),
          ),
          GroveHouseRoom(clock: clock, onOpen: (_) {}),
          if (opened) GroveLivingWindowPanel(houseClock: clock),
        ])),
      ),
    )));
    await tester.pump();
    await tester.tap(find.text('Open shared window'));
    await tester.pump();
    expect(tester.takeException(), isNull,
      reason: 'Shared clock must not notify the Home listener during the Window build');
    expect(find.text('THE LIVING WINDOW'), findsOneWidget);
    expect(clock.localNow.minute, 1);
    await tester.pumpWidget(const SizedBox());
  });

}
