import 'dart:collection';

import 'grove_world_state.dart';

/// A small *house* catalog, not ARK memory, document storage, or a claim that
/// the illustrated room reflects unattended activity.
///
/// Source items require an explicit project and an actual source locator.
/// There are no fabricated documents in the default house inventory.
enum GroveInventoryKind { furnishing, mossPlace, source }
enum GroveInventoryVisibility { sharedScenery, deviceLocal, projectScoped }

class GroveInventoryItem {
  GroveInventoryItem({
    required this.id,
    required this.label,
    required this.zone,
    required this.kind,
    required this.visibility,
    this.projectId,
    this.sourceRef,
  }) {
    if (!RegExp(r'^[a-z0-9][a-z0-9_-]{0,63}$').hasMatch(id)) {
      throw ArgumentError.value(id, 'id', 'Invalid stable object ID');
    }
    if (label.trim().isEmpty || label.length > 120) {
      throw ArgumentError.value(label, 'label', 'Invalid item label');
    }
    if (visibility == GroveInventoryVisibility.projectScoped) {
      if (projectId == null || projectId!.trim().isEmpty) {
        throw ArgumentError('Project-scoped inventory requires a project ID');
      }
    } else if (projectId != null) {
      throw ArgumentError('Unscoped scenery cannot carry a project ID');
    }
    if (kind == GroveInventoryKind.source) {
      if (visibility != GroveInventoryVisibility.projectScoped ||
          sourceRef == null || sourceRef!.trim().isEmpty) {
        throw ArgumentError(
          'Sources require project scope and an explicit source reference',
        );
      }
    } else if (sourceRef != null) {
      throw ArgumentError('Scenery cannot masquerade as source evidence');
    }
  }

  final String id;
  final String label;
  final GroveZone zone;
  final GroveInventoryKind kind;
  final GroveInventoryVisibility visibility;
  final String? projectId;
  /// Opaque locator provided by an actual source system, never invented here.
  final String? sourceRef;

  GroveInventoryItem movedTo(GroveZone destination) => GroveInventoryItem(
    id: id,
    label: label,
    zone: destination,
    kind: kind,
    visibility: visibility,
    projectId: projectId,
    sourceRef: sourceRef,
  );
}

/// Immutable registry. It does not save user data, mutate the Grove world
/// journal, infer user presence, or open a source without separate auth.
class GroveRoomInventory {
  GroveRoomInventory(Iterable<GroveInventoryItem> items)
      : _items = UnmodifiableListView(items.toList()) {
    final ids = _items.map((item) => item.id).toSet();
    if (ids.length != _items.length) {
      throw ArgumentError('Duplicate Grove inventory object ID');
    }
  }

  final UnmodifiableListView<GroveInventoryItem> _items;

  UnmodifiableListView<GroveInventoryItem> get items => _items;

  GroveInventoryItem? find(String id) {
    for (final item in _items) {
      if (item.id == id) return item;
    }
    return null;
  }

  List<GroveInventoryItem> inZone(
    GroveZone zone, {
    String? projectId,
  }) => List.unmodifiable(_items.where((item) =>
      item.zone == zone &&
      (item.visibility != GroveInventoryVisibility.projectScoped ||
          item.projectId == projectId)));

  /// Movement is a pure proposed change, NOT a persisted activity record.
  GroveRoomInventory moved(String id, GroveZone destination) {
    if (find(id) == null) {
      throw ArgumentError.value(id, 'id', 'Unknown inventory object');
    }
    return GroveRoomInventory(_items.map(
      (item) => item.id == id ? item.movedTo(destination) : item,
    ));
  }

  /// Only existing, decorative objects. The approved image remains the
  /// visual authority; this catalog does not create new room art.
  factory GroveRoomInventory.starter() => GroveRoomInventory([
    GroveInventoryItem(
      id: 'observatory-desk',
      label: 'Workstation',
      zone: GroveZone.observatory,
      kind: GroveInventoryKind.furnishing,
      visibility: GroveInventoryVisibility.sharedScenery,
    ),
    GroveInventoryItem(
      id: 'observatory-window',
      label: 'The Living Window',
      zone: GroveZone.observatory,
      kind: GroveInventoryKind.furnishing,
      visibility: GroveInventoryVisibility.sharedScenery,
    ),
    GroveInventoryItem(
      id: 'library-shelves',
      label: 'Library shelves',
      zone: GroveZone.library,
      kind: GroveInventoryKind.furnishing,
      visibility: GroveInventoryVisibility.sharedScenery,
    ),
    GroveInventoryItem(
      id: 'moss-sofa',
      label: "Moss's sofa spot",
      zone: GroveZone.sofa,
      kind: GroveInventoryKind.mossPlace,
      visibility: GroveInventoryVisibility.sharedScenery,
    ),
    GroveInventoryItem(
      id: 'moss-rug',
      label: "Moss's rug spot",
      zone: GroveZone.rug,
      kind: GroveInventoryKind.mossPlace,
      visibility: GroveInventoryVisibility.sharedScenery,
    ),
  ]);
}
