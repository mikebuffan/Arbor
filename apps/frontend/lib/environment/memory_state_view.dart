import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_room_inventory_panel.dart';
import 'grove_memory_shelf_view.dart';
import 'grove_document_shelf_view.dart';
import 'grove_world_state.dart';
import 'grove_responsive_wrap.dart';

class MemoryStateView extends StatelessWidget {
  const MemoryStateView({super.key});

  @override
  Widget build(BuildContext context) => const Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      GroveRoomInventoryPanel(initialZone: GroveZone.library),
      SizedBox(height: 16),
      GroveMemoryShelfView(),
      SizedBox(height: 16),
      GroveDocumentShelfView(),
      SizedBox(height: 16),
      GroveResponsiveWrap(
        panels: [
          GrovePanel(preferredWidth: 380, child: EnvironmentPanel(child: _MemorySection(
            title: 'CONTINUITY',
            body: 'Conversation/project continuity is visible as state, not implied by tone. Corrections and unresolved work must remain traceable.',
          ))),
          GrovePanel(preferredWidth: 380, child: EnvironmentPanel(child: _MemorySection(
            title: 'CONTEXT CODEX',
            body: 'Historical and provenance-sensitive claims require retrieval before assertion. Unknown stays unknown.',
          ))),
          GrovePanel(preferredWidth: 380, child: EnvironmentPanel(child: _MemorySection(
            title: 'PATTERN HOP',
            body: 'Evidence-driven traversal stays bounded, deduplicated, chronological, and contradiction-aware.',
          ))),
        ],
      ),
    ],
  );
}

class _MemorySection extends StatelessWidget {
  const _MemorySection({required this.title, required this.body});
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: const TextStyle(color: ArborEnvironmentTokens.violet, fontSize: 11, letterSpacing: 1.4)),
      const SizedBox(height: 10),
      Text(body, style: const TextStyle(color: ArborEnvironmentTokens.textMuted, height: 1.5)),
      const SizedBox(height: 12),
      const Text('LIVE INSPECTION NOT CONNECTED', style: TextStyle(color: ArborEnvironmentTokens.firefly, fontSize: 10)),
    ],
  );
}
