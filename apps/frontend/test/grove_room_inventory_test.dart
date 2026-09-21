import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_room_inventory.dart';
import 'package:frontend/environment/grove_world_state.dart';

void main() {
  GroveInventoryItem item({
    String id = 'one',
    GroveZone zone = GroveZone.library,
    GroveInventoryKind kind = GroveInventoryKind.furnishing,
    GroveInventoryVisibility visibility =
        GroveInventoryVisibility.sharedScenery,
    String? projectId,
    String? sourceRef,
  }) =>
      GroveInventoryItem(
        id: id,
        label: 'A labeled item',
        zone: zone,
        kind: kind,
        visibility: visibility,
        projectId: projectId,
        sourceRef: sourceRef,
      );

  test('default house is an inventory of scenery, not invented documents', () {
    final inventory = GroveRoomInventory.starter();
    expect(inventory.find('observatory-desk')?.zone, GroveZone.observatory);
    expect(inventory.find('moss-sofa')?.kind, GroveInventoryKind.mossPlace);
    expect(inventory.items, isNotEmpty);
    expect(inventory.items.where((e) => e.kind == GroveInventoryKind.source),
        isEmpty);
    expect(inventory.find('nonexistent'), isNull);
  });

  test('project sources need explicit scope and locator', () {
    expect(
      () => item(kind: GroveInventoryKind.source),
      throwsArgumentError,
    );
    expect(
      () => item(
        kind: GroveInventoryKind.source,
        visibility: GroveInventoryVisibility.projectScoped,
        projectId: 'project-a',
      ),
      throwsArgumentError,
    );
    expect(
      () => item(
        kind: GroveInventoryKind.source,
        visibility: GroveInventoryVisibility.projectScoped,
        projectId: ' ',
        sourceRef: 'document:42#page=7',
      ),
      throwsArgumentError,
    );
    final source = item(
      kind: GroveInventoryKind.source,
      visibility: GroveInventoryVisibility.projectScoped,
      projectId: 'project-a',
      sourceRef: 'document:42#page=7',
    );
    expect(source.projectId, 'project-a');
    expect(source.sourceRef, 'document:42#page=7');
  });

  test('project-scoped entries do not leak into other room views', () {
    final inventory = GroveRoomInventory([
      item(),
      item(
        id: 'document-a',
        kind: GroveInventoryKind.source,
        visibility: GroveInventoryVisibility.projectScoped,
        projectId: 'project-a',
        sourceRef: 'doc:a#page=1',
      ),
      item(
        id: 'document-b',
        kind: GroveInventoryKind.source,
        visibility: GroveInventoryVisibility.projectScoped,
        projectId: 'project-b',
        sourceRef: 'doc:b#page=2',
      ),
    ]);
    expect(inventory.inZone(GroveZone.library).map((e) => e.id), ['one']);
    expect(
      inventory.inZone(GroveZone.library, projectId: 'project-a')
          .map((e) => e.id),
      ['one', 'document-a'],
    );
    expect(
      inventory.inZone(GroveZone.library, projectId: 'project-b')
          .map((e) => e.id),
      ['one', 'document-b'],
    );
  });

  test('IDs are stable, unique, and valid; scenery cannot claim provenance', () {
    expect(
      () => GroveRoomInventory([item(), item()]),
      throwsArgumentError,
    );
    expect(() => item(id: 'Not A Stable ID!'), throwsArgumentError);
    expect(
      () => item(sourceRef: 'pretend-evidence'),
      throwsArgumentError,
    );
    expect(
      () => item(projectId: 'project-a'),
      throwsArgumentError,
    );
  });

  test('moving an item returns a new catalog and keeps the old one intact', () {
    final before = GroveRoomInventory([item()]);
    final after = before.moved('one', GroveZone.workshop);
    expect(before.find('one')!.zone, GroveZone.library);
    expect(after.find('one')!.zone, GroveZone.workshop);
    expect(after.find('one')!.id, before.find('one')!.id);
    expect(() => before.moved('absent', GroveZone.kitchen),
        throwsArgumentError);
    expect(() => before.items.clear(), throwsUnsupportedError);
    expect(() => before.inZone(GroveZone.library).clear(),
        throwsUnsupportedError);
  });

  test('room inventory does not create visitor events or work receipts', () {
    final t0 = DateTime.utc(2026, 9, 21);
    final world = GroveWorldState.initial(t0);
    GroveRoomInventory.starter().moved('observatory-desk', GroveZone.workshop);
    expect(world.revision, 0);
    expect(world.events, isEmpty);
  });
}
