import 'package:flutter/material.dart';

import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_room_inventory.dart';
import 'grove_world_state.dart';

/// Visible catalog for the *known* room objects. This is not a live ARK file
/// browser, an evidence search, or a persistence layer. Source entries must be
/// supplied by an authenticated, project-scoped caller in a later integration.
class GroveRoomInventoryPanel extends StatefulWidget {
  const GroveRoomInventoryPanel({
    super.key,
    this.inventory,
    this.projectId,
    this.initialZone = GroveZone.observatory,
  });

  final GroveRoomInventory? inventory;
  final String? projectId;
  final GroveZone initialZone;

  @override
  State<GroveRoomInventoryPanel> createState() =>
      _GroveRoomInventoryPanelState();
}

class _GroveRoomInventoryPanelState extends State<GroveRoomInventoryPanel> {
  late GroveZone _zone = widget.initialZone;
  late GroveRoomInventory _previewInventory;
  String? _selectedFixtureId;
  bool _previewChanged = false;

  @override
  void initState() {
    super.initState();
    _resetPreview();
  }

  @override
  void didUpdateWidget(covariant GroveRoomInventoryPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A new project or inventory must never inherit a previous local preview.
    if (oldWidget.projectId != widget.projectId ||
        !identical(oldWidget.inventory, widget.inventory)) {
      _resetPreview();
    }
    if (oldWidget.initialZone != widget.initialZone) {
      _zone = widget.initialZone;
    }
  }

  void _resetPreview() {
    _previewInventory = widget.inventory ?? GroveRoomInventory.starter();
    _selectedFixtureId = null;
    _previewChanged = false;
  }

  void _stageFixture() {
    final id = _selectedFixtureId;
    if (id == null) return;
    final item = _previewInventory.find(id);
    // An existing source, device-local item, or Moss position must never
    // become an editable fixture or an implied ARK/user activity record.
    if (item == null ||
        item.kind != GroveInventoryKind.furnishing ||
        item.visibility != GroveInventoryVisibility.sharedScenery ||
        item.zone == GroveZone.workshop) {
      return;
    }
    setState(() {
      _previewInventory = _previewInventory.moved(id, GroveZone.workshop);
      _selectedFixtureId = null;
      _previewChanged = true;
    });
  }

  static const _rooms = <GroveZone>[
    GroveZone.observatory,
    GroveZone.library,
    GroveZone.workshop,
    GroveZone.kitchen,
    GroveZone.guestRoom,
    GroveZone.sofa,
    GroveZone.rug,
  ];

  static String _roomLabel(GroveZone zone) => switch (zone) {
    GroveZone.observatory => 'Observatory',
    GroveZone.library => 'Library',
    GroveZone.workshop => 'Workshop',
    GroveZone.kitchen => 'Kitchen',
    GroveZone.guestRoom => 'Guest Room',
    GroveZone.sofa => 'Sofa',
    GroveZone.rug => 'Rug',
  };

  @override
  Widget build(BuildContext context) {
    final entries =
        _previewInventory.inZone(_zone, projectId: widget.projectId);
    final movableFixtures = _previewInventory.items.where((item) =>
        item.kind == GroveInventoryKind.furnishing &&
        item.visibility == GroveInventoryVisibility.sharedScenery &&
        item.zone != GroveZone.workshop).toList(growable: false);
    return EnvironmentPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'THE GROVE · ROOM INVENTORY',
            style: TextStyle(
              color: ArborEnvironmentTokens.cyan,
              fontSize: 11,
              letterSpacing: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Known house objects · scenery only until a verified source is connected.',
            style: TextStyle(color: ArborEnvironmentTokens.textMuted),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final room in _rooms)
                ChoiceChip(
                  key: ValueKey('inventory-zone-' + room.name),
                  label: Text(_roomLabel(room)),
                  selected: _zone == room,
                  onSelected: (_) => setState(() => _zone = room),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _roomLabel(_zone) + ' · ' + entries.length.toString() + ' listed',
            style: const TextStyle(
              color: ArborEnvironmentTokens.textPrimary,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          if (_zone == GroveZone.workshop) ...[
            const Text(
              'WORKSHOP · UNSAVED SCENERY PREVIEW',
              key: ValueKey('workshop-preview-boundary'),
              style: TextStyle(color: ArborEnvironmentTokens.firefly),
            ),
            const SizedBox(height: 6),
            const Text(
              'Stage existing room furnishings here to explore a layout. '
              'Nothing is saved, moved in the real house, sent to ARK, '
              'or treated as evidence of work.',
              style: TextStyle(color: ArborEnvironmentTokens.textMuted),
            ),
            DropdownButton<String>(
              key: const ValueKey('workshop-fixture-select'),
              isExpanded: true,
              value: movableFixtures.any(
                      (item) => item.id == _selectedFixtureId)
                  ? _selectedFixtureId
                  : null,
              hint: const Text('Choose existing furnishing'),
              items: [
                for (final item in movableFixtures)
                  DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.label),
                  ),
              ],
              onChanged: movableFixtures.isEmpty
                  ? null
                  : (id) => setState(() => _selectedFixtureId = id),
            ),
            Wrap(
              spacing: 8,
              children: [
                FilledButton(
                  key: const ValueKey('workshop-stage-fixture'),
                  onPressed: _selectedFixtureId == null
                      ? null
                      : _stageFixture,
                  child: const Text('Stage in Workshop'),
                ),
                OutlinedButton(
                  key: const ValueKey('workshop-reset-preview'),
                  onPressed: !_previewChanged
                      ? null
                      : () => setState(_resetPreview),
                  child: const Text('Reset preview'),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          if (entries.isEmpty)
            const Text(
              'Nothing registered in this room yet. No items invented.',
              key: ValueKey('inventory-empty'),
              style: TextStyle(color: ArborEnvironmentTokens.textMuted),
            ),
          for (final item in entries)
            Padding(
              key: ValueKey('inventory-item-' + item.id),
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Icon(
                    switch (item.kind) {
                      GroveInventoryKind.furnishing =>
                        Icons.chair_alt_outlined,
                      GroveInventoryKind.mossPlace => Icons.pets_outlined,
                      GroveInventoryKind.source => Icons.description_outlined,
                    },
                    color: ArborEnvironmentTokens.firefly,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.label,
                          style: const TextStyle(
                            color: ArborEnvironmentTokens.textPrimary,
                          ),
                        ),
                        Text(
                          item.kind == GroveInventoryKind.source
                              ? 'SOURCE REFERENCE · NOT OPENED'
                              : 'HOUSE SCENERY · ' + item.id,
                          style: const TextStyle(
                            color: ArborEnvironmentTokens.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          const Text(
            'This catalog does not verify ARK memory, save room moves, or read files.',
            style: TextStyle(
              color: ArborEnvironmentTokens.firefly,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
