import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_world_panel.dart';
import 'package:frontend/environment/grove_world_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('Moss interaction persists across a remounted panel', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveWorldPanel())),
    ));
    await tester.pumpAndSettle();
    expect(find.textContaining('Moss is resting on the sofa'), findsOneWidget);
    await tester.tap(find.text('Moss on rug'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Moss is resting on the rug'), findsOneWidget);
    expect(find.textContaining('1 recent visitor interactions'), findsOneWidget);

    // Discard the widget entirely; next widget must load from preferences.
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveWorldPanel())),
    ));
    await tester.pumpAndSettle();
    expect(find.text('RESTORED FROM THIS DEVICE'), findsOneWidget);
    expect(find.textContaining('Moss is resting on the rug'), findsOneWidget);
  });

  testWidgets('unfamiliar storage remains locked and intact', (tester) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(GroveWorldStore.storageKey,
        '{"schemaVersion":999}');
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveWorldPanel())),
    ));
    await tester.pumpAndSettle();
    expect(find.textContaining('NEWER/UNKNOWN FORMAT'), findsOneWidget);
    expect(find.text('Moss on rug'), findsNothing);
    expect(prefs.getString(GroveWorldStore.storageKey),
        '{"schemaVersion":999}');
  });
}
