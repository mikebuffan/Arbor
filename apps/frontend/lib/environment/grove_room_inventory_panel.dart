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

  static const _rooms = <GroveZone>[
    GroveZone.observatory,
    GroveZone.library,
    GroveZone.workshop,
    GroveZone.kitchen,
    GroveZone.sofa,
    GroveZone.rug,
  ];

  static String _roomLabel(GroveZone zone) => switch (zone) {
    GroveZone.observatory => 'Observatory',
    GroveZone.library => 'Library',
    GroveZone.workshop => 'Workshop',
    GroveZone.kitchen => 'Kitchen',
    GroveZone.sofa => 'Sofa',
    GroveZone.rug => 'Rug',
  };

  @override
  Widget build(BuildContext context) {
    final inventory = widget.inventory ?? GroveRoomInventory.starter();
    final entries = inventory.inZone(_zone, projectId: widget.projectId);
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
