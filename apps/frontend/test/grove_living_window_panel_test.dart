import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_living_window_panel.dart';

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
}
