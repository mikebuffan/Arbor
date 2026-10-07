import 'package:flutter/material.dart';

import 'environment_panel.dart';
import 'environment_tokens.dart';

/// G11: manually written, session-only diary draft.
///
/// This screen deliberately has NO storage/API connection. No user text is
/// captured by ARK or transmitted, and no save receipt is claimed.
class GroveDiaryDraftView extends StatefulWidget {
  const GroveDiaryDraftView({super.key});

  @override
  State<GroveDiaryDraftView> createState() => _GroveDiaryDraftViewState();
}

class _GroveDiaryDraftViewState extends State<GroveDiaryDraftView> {
  final _title = TextEditingController();
  final _entry = TextEditingController();
  final _context = TextEditingController();
  bool _previewVisible = false;

  @override
  void dispose() {
    _title.dispose();
    _entry.dispose();
    _context.dispose();
    super.dispose();
  }

  void _edited(String _) {
    // A preview must never masquerade as the latest draft after editing.
    setState(() => _previewVisible = false);
  }

  void _preview() {
    if (_entry.text.trim().isEmpty) return;
    setState(() => _previewVisible = true);
  }

  void _clear() {
    _title.clear();
    _entry.clear();
    _context.clear();
    setState(() => _previewVisible = false);
  }

  @override
  Widget build(BuildContext context) => EnvironmentPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'THE GROVE · DIARY',
              style: TextStyle(
                color: ArborEnvironmentTokens.cyan,
                fontSize: 11,
                letterSpacing: 1.4,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'MANUAL DRAFT · NOT SAVED',
              key: ValueKey('diary-storage-truth'),
              style: TextStyle(
                color: ArborEnvironmentTokens.firefly,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Type only what you choose. This draft remains on this screen '
              'until you leave or clear it. It is not saved to your device, '
              'your account, or ARK. Do not rely on it as a permanent record.',
              style: TextStyle(color: ArborEnvironmentTokens.textMuted),
            ),
            const SizedBox(height: 16),
            TextField(
              key: const ValueKey('diary-title'),
              controller: _title,
              onChanged: _edited,
              maxLength: 100,
              decoration: const InputDecoration(
                labelText: 'Title (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              key: const ValueKey('diary-entry'),
              controller: _entry,
              onChanged: _edited,
              minLines: 4,
              maxLines: 8,
              maxLength: 10000,
              decoration: const InputDecoration(
                labelText: 'What happened today?',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              key: const ValueKey('diary-context'),
              controller: _context,
              onChanged: _edited,
              minLines: 2,
              maxLines: 4,
              maxLength: 2000,
              decoration: const InputDecoration(
                labelText: 'Context / how the day felt (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                FilledButton(
                  key: const ValueKey('diary-preview-button'),
                  onPressed: _entry.text.trim().isNotEmpty ? _preview : null,
                  child: const Text('Preview on screen'),
                ),
                OutlinedButton(
                  key: const ValueKey('diary-clear-button'),
                  onPressed: _clear,
                  child: const Text('Clear draft'),
                ),
              ],
            ),
            if (_previewVisible) ...[
              const SizedBox(height: 16),
              const Divider(),
              const Text(
                'UNSAVED PREVIEW',
                key: ValueKey('diary-preview-label'),
                style: TextStyle(
                  color: ArborEnvironmentTokens.firefly,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (_title.text.trim().isNotEmpty)
                Text(
                  _title.text.trim(),
                  style: const TextStyle(color: ArborEnvironmentTokens.textPrimary),
                ),
              SelectableText(
                _entry.text.trim(),
                key: const ValueKey('diary-draft-preview'),
                style: const TextStyle(color: ArborEnvironmentTokens.textPrimary),
              ),
              if (_context.text.trim().isNotEmpty)
                SelectableText(
                  _context.text.trim(),
                  style: const TextStyle(color: ArborEnvironmentTokens.textMuted),
                ),
            ],
          ],
        ),
      );
}
