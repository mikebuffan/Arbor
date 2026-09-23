import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/grove_house_room.dart';
import 'package:frontend/environment/grove_world_state.dart';
import 'package:frontend/environment/grove_world_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('house marker reflects local scene, not an ARK or artwork claim',
      (tester) async {
    final base = GroveWorldState.initial(DateTime.utc(2026, 9, 22));
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveHouseRoom(
        onOpen: (_) {},
        worldLoad: GroveWorldLoad(GroveWorldLoadStatus.newHouse, base),
      ))),
    ));
    expect(find.text('🐾 MOSS · SOFA · RESTING'), findsOneWidget);
    expect(find.textContaining('the approved painting stays unchanged'),
        findsOneWidget);
    expect(find.byType(Image), findsOneWidget);

    final moved = base.apply(GroveWorldAction.moveMoss,
        zone: GroveZone.rug, at: DateTime.utc(2026, 9, 22, 1));
    final awake = moved.apply(GroveWorldAction.wakeMoss,
        zone: GroveZone.rug, at: DateTime.utc(2026, 9, 22, 2));
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveHouseRoom(
        onOpen: (_) {},
        worldLoad: GroveWorldLoad(GroveWorldLoadStatus.restored, awake),
      ))),
    ));
    expect(find.text('🐾 MOSS · RUG · AWAKE'), findsOneWidget);
    expect(find.text('🐾 MOSS · SOFA · RESTING'), findsNothing);
    expect(find.byType(Image), findsOneWidget);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: GroveHouseRoom(
        onOpen: (_) {},
        worldLoad: const GroveWorldLoad(
            GroveWorldLoadStatus.incompatible, null),
      ))),
    ));
    expect(find.textContaining('🐾 MOSS ·'), findsNothing,
        reason: 'Unknown stored versions must not become invented scenery');
  });

  testWidgets('home updates Moss marker after actual saved panel interaction',
      (tester) async {
    tester.view.physicalSize = const Size(1050, 1900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
        const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('🐾 MOSS · SOFA · RESTING'), findsOneWidget);

    final rug = find.widgetWithText(OutlinedButton, 'Moss on rug');
    await tester.ensureVisible(rug);
    await tester.pump();
    await tester.tap(rug);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('🐾 MOSS · RUG · RESTING'), findsOneWidget);

    final wake = find.widgetWithText(OutlinedButton, 'Wake Moss');
    await tester.ensureVisible(wake);
    await tester.pump();
    await tester.tap(wake);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('🐾 MOSS · RUG · AWAKE'), findsOneWidget);

    final saved = await GroveWorldStore().load();
    expect(saved.status, GroveWorldLoadStatus.restored);
    expect(saved.state!.mossZone, GroveZone.rug);
    expect(saved.state!.mossResting, isFalse);
  });
}
