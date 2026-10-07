import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_room_inventory.dart';
import 'package:frontend/environment/grove_room_inventory_panel.dart';
import 'package:frontend/environment/grove_world_state.dart';

Widget screen({
  GroveRoomInventory? inventory,
  String? projectId,
  GroveZone initialZone = GroveZone.workshop,
}) =>
    MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: GroveRoomInventoryPanel(
            inventory: inventory,
            projectId: projectId,
            initialZone: initialZone,
          ),
        ),
      ),
    );

Future<void> stageWorkstation(WidgetTester tester) async {
  final chooser = find.byKey(const ValueKey('workshop-fixture-select'));
  await tester.ensureVisible(chooser);
  await tester.tap(chooser);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Workstation').last);
  await tester.pumpAndSettle();
  final stage = find.byKey(const ValueKey('workshop-stage-fixture'));
  await tester.ensureVisible(stage);
  await tester.tap(stage);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('workshop starts empty, truthfully says unsaved, then stages existing decor',
      (tester) async {
    await tester.pumpWidget(screen());
    expect(find.byKey(const ValueKey('workshop-preview-boundary')),
        findsOneWidget);
    expect(find.text('Workshop · 0 listed'), findsOneWidget);
    await stageWorkstation(tester);
    expect(find.text('Workshop · 1 listed'), findsOneWidget);
    expect(find.byKey(const ValueKey('inventory-item-observatory-desk')),
        findsOneWidget);
    expect(find.textContaining('Nothing is saved'), findsOneWidget);
    expect(find.textContaining('does not verify ARK memory'), findsOneWidget);
  });

  testWidgets('reset restores original room fixture and does not persist changes',
      (tester) async {
    final original = GroveRoomInventory.starter();
    await tester.pumpWidget(screen(inventory: original));
    await stageWorkstation(tester);
    expect(original.find('observatory-desk')?.zone, GroveZone.observatory);
    final reset = find.byKey(const ValueKey('workshop-reset-preview'));
    await tester.ensureVisible(reset);
    await tester.tap(reset);
    await tester.pumpAndSettle();
    expect(find.text('Workshop · 0 listed'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(screen(inventory: original));
    expect(find.text('Workshop · 0 listed'), findsOneWidget);
    expect(original.find('observatory-desk')?.zone, GroveZone.observatory);
  });

  testWidgets('source documents and Moss positions cannot be staged as furnishings',
      (tester) async {
    final items = GroveRoomInventory([
      GroveInventoryItem(
        id: 'moss-sofa', label: 'Moss spot',
        zone: GroveZone.sofa, kind: GroveInventoryKind.mossPlace,
        visibility: GroveInventoryVisibility.sharedScenery,
      ),
      GroveInventoryItem(
        id: 'project-source', label: 'Private document',
        zone: GroveZone.library, kind: GroveInventoryKind.source,
        visibility: GroveInventoryVisibility.projectScoped,
        projectId: 'project-a', sourceRef: 'source:a',
      ),
    ]);
    await tester.pumpWidget(screen(inventory: items, projectId: 'project-a'));
    expect(find.text('Private document'), findsNothing);
    expect(find.text('Moss spot'), findsNothing);
    final stage = tester.widget<FilledButton>(
      find.byKey(const ValueKey('workshop-stage-fixture')),
    );
    expect(stage.onPressed, isNull);
    expect(find.text('Workshop · 0 listed'), findsOneWidget);
    expect(items.find('project-source')?.zone, GroveZone.library);
  });

  testWidgets('scope/inventory replacement discards unsaved preview immediately',
      (tester) async {
    final original = GroveRoomInventory.starter();
    await tester.pumpWidget(screen(inventory: original, projectId: 'project-a'));
    await stageWorkstation(tester);
    expect(find.text('Workshop · 1 listed'), findsOneWidget);
    // Keep the widget at the same tree location to exercise didUpdateWidget.
    await tester.pumpWidget(screen(inventory: original, projectId: 'project-b'));
    await tester.pumpAndSettle();
    expect(find.text('Workshop · 0 listed'), findsOneWidget);
    expect(tester.widget<OutlinedButton>(
      find.byKey(const ValueKey('workshop-reset-preview')),
    ).onPressed, isNull);
  });

  testWidgets('real inventory remains scoped when browsing other rooms',
      (tester) async {
    final fixture = GroveRoomInventory([
      GroveInventoryItem(
        id: 'shared-shelf', label: 'Shared shelves',
        zone: GroveZone.library, kind: GroveInventoryKind.furnishing,
        visibility: GroveInventoryVisibility.sharedScenery,
      ),
      GroveInventoryItem(
        id: 'private-a', label: 'Project A source',
        zone: GroveZone.library, kind: GroveInventoryKind.source,
        visibility: GroveInventoryVisibility.projectScoped,
        projectId: 'a', sourceRef: 'doc:a',
      ),
      GroveInventoryItem(
        id: 'private-b', label: 'Project B source',
        zone: GroveZone.library, kind: GroveInventoryKind.source,
        visibility: GroveInventoryVisibility.projectScoped,
        projectId: 'b', sourceRef: 'doc:b',
      ),
    ]);
    await tester.pumpWidget(screen(inventory: fixture, projectId: 'a'));
    await tester.tap(find.byKey(const ValueKey('inventory-zone-library')));
    await tester.pumpAndSettle();
    expect(find.text('Shared shelves'), findsOneWidget);
    expect(find.text('Project A source'), findsOneWidget);
    expect(find.text('Project B source'), findsNothing);
    await tester.pumpWidget(screen(inventory: fixture, projectId: 'b'));
    await tester.pumpAndSettle();
    expect(find.text('Project A source'), findsNothing);
    expect(find.text('Project B source'), findsOneWidget);
  });
}
