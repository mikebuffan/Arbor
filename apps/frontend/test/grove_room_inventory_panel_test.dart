import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_room_inventory.dart';
import 'package:frontend/environment/grove_room_inventory_panel.dart';
import 'package:frontend/environment/grove_world_state.dart';

Future<void> showInventory(
  WidgetTester tester, {
  GroveRoomInventory? inventory,
  String? projectId,
  GroveZone initialZone = GroveZone.observatory,
}) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: SingleChildScrollView(
        child: GroveRoomInventoryPanel(
          inventory: inventory,
          projectId: projectId,
          initialZone: initialZone,
        ),
      ),
    ),
  ));
}

GroveInventoryItem source(String id, String project) => GroveInventoryItem(
  id: id,
  label: 'Source for ' + project,
  zone: GroveZone.library,
  kind: GroveInventoryKind.source,
  visibility: GroveInventoryVisibility.projectScoped,
  projectId: project,
  sourceRef: 'document:' + id + '#page=1',
);

void main() {
  testWidgets('home shows known objects and no invented live files', (tester) async {
    await showInventory(tester);
    expect(find.text('Workstation'), findsOneWidget);
    expect(find.text('The Living Window'), findsOneWidget);
    expect(find.textContaining('Known house objects'), findsOneWidget);
    expect(find.textContaining('does not verify ARK memory'), findsOneWidget);
    expect(find.textContaining('SOURCE REFERENCE'), findsNothing);
  });

  testWidgets('room switch shows Library without changing catalog', (tester) async {
    await showInventory(tester);
    await tester.tap(find.byKey(const ValueKey('inventory-zone-library')));
    await tester.pump();
    expect(find.text('Library shelves'), findsOneWidget);
    expect(find.text('Workstation'), findsNothing);
    expect(find.text('Library · 1 listed'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('inventory-zone-kitchen')));
    await tester.pump();
    expect(find.byKey(const ValueKey('inventory-empty')), findsOneWidget);
    expect(find.textContaining('No items invented'), findsOneWidget);
  });

  testWidgets('unauthenticated shelf never displays project sources', (tester) async {
    final registry = GroveRoomInventory([
      GroveInventoryItem(
        id: 'library-shelves',
        label: 'Library shelves',
        zone: GroveZone.library,
        kind: GroveInventoryKind.furnishing,
        visibility: GroveInventoryVisibility.sharedScenery,
      ),
      source('source-a', 'project-a'),
      source('source-b', 'project-b'),
    ]);
    await showInventory(tester,
        inventory: registry, initialZone: GroveZone.library);
    expect(find.text('Library shelves'), findsOneWidget);
    expect(find.text('Source for project-a'), findsNothing);
    expect(find.text('Source for project-b'), findsNothing);
  });

  testWidgets('project scope displays only matching source references',
      (tester) async {
    final registry = GroveRoomInventory([
      source('source-a', 'project-a'),
      source('source-b', 'project-b'),
    ]);
    await showInventory(tester,
        inventory: registry,
        projectId: 'project-a',
        initialZone: GroveZone.library);
    expect(find.text('Source for project-a'), findsOneWidget);
    expect(find.text('Source for project-b'), findsNothing);
    expect(find.text('SOURCE REFERENCE · NOT OPENED'), findsOneWidget);
  });

  testWidgets('resting spots are listed, not confused with Moss activity',
      (tester) async {
    await showInventory(tester, initialZone: GroveZone.sofa);
    expect(find.text("Moss's sofa spot"), findsOneWidget);
    expect(find.textContaining('does not verify ARK memory'), findsOneWidget);
  });
}
