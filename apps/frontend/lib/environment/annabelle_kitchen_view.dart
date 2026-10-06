import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'environment_tokens.dart';
import 'grove_house_clock.dart';

/// A physical room in the same house, not a second model or a voice switch.
/// Writing-mode backend routing is deliberately NOT claimed by this view.
class AnnabelleKitchenView extends StatefulWidget {
  const AnnabelleKitchenView({super.key, required this.onReturnHome,
      required this.onOpenConversation});

  final VoidCallback onReturnHome;
  final VoidCallback onOpenConversation;

  @override
  State<AnnabelleKitchenView> createState() => _AnnabelleKitchenViewState();
}

class _AnnabelleKitchenViewState extends State<AnnabelleKitchenView> {
  final GroveHouseClock _clock = GroveHouseClock.shared;
  final TextEditingController _scratchpad = TextEditingController();

  @override
  void initState() {
    super.initState();
    _clock.attach();
    _clock.addListener(_onClock);
  }

  void _onClock() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _clock.removeListener(_onClock);
    _clock.detach();
    _scratchpad.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = _clock.localNow;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('THE GROVE / ANNABELLE’S KITCHEN',
          style: TextStyle(color: ArborEnvironmentTokens.firefly,
              fontSize: 11, letterSpacing: 1.4)),
      const SizedBox(height: 10),
      const Text('Come in. The manuscript is on the counter.',
          style: TextStyle(color: ArborEnvironmentTokens.textPrimary,
              fontSize: 25)),
      const SizedBox(height: 7),
      Text('Same house clock · ${TimeOfDay.fromDateTime(now).format(context)}',
          style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
      const SizedBox(height: 18),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(colors: [
            Color(0xFF29201C), Color(0xFF16302D), Color(0xFF151E28)]),
          border: Border.all(color: const Color(0xFF92765A)),
        ),
        child: const Column(crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.restaurant_menu, size: 45,
                color: ArborEnvironmentTokens.firefly),
            SizedBox(height: 10),
            Text('Annabelle’s writing studio',
              style: TextStyle(color: ArborEnvironmentTokens.textPrimary,
                  fontSize: 21)),
            SizedBox(height: 8),
            Text('Scenes • manuscript canon • revisions • handoffs',
              style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
            SizedBox(height: 14),
            Text('ROOM PREVIEW — the writing/voice-mode switch is not yet wired. '
                 'Opening the existing conversation still opens Arbor’s shared Talk.',
              style: TextStyle(color: ArborEnvironmentTokens.firefly,
                  fontSize: 12)),
          ],
        ),
      ),
      const SizedBox(height: 17),
      const Text('SCRATCHPAD · THIS VISIT ONLY',
          style: TextStyle(color: ArborEnvironmentTokens.cyan,
              fontSize: 11, letterSpacing: 1.1)),
      const SizedBox(height: 7),
      TextField(
        controller: _scratchpad,
        minLines: 4,
        maxLines: 8,
        style: const TextStyle(color: ArborEnvironmentTokens.textPrimary),
        decoration: InputDecoration(
          hintText: 'A line, a scene note, an idea…',
          hintStyle: const TextStyle(color: ArborEnvironmentTokens.textMuted),
          filled: true,
          fillColor: ArborEnvironmentTokens.midnight,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14)),
        ),
      ),
      const SizedBox(height: 6),
      const Text('Not saved to your manuscript or memory. Copy before leaving.',
          style: TextStyle(color: ArborEnvironmentTokens.textMuted,
              fontSize: 11)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: [
        OutlinedButton.icon(
          onPressed: () {
            Clipboard.setData(ClipboardData(text: _scratchpad.text));
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Scratchpad copied.')));
          },
          icon: const Icon(Icons.copy_outlined),
          label: const Text('Copy notes'),
        ),
        OutlinedButton.icon(
          onPressed: widget.onOpenConversation,
          icon: const Icon(Icons.chat_bubble_outline),
          label: const Text('Existing Talk (Arbor)'),
        ),
        FilledButton.icon(
          onPressed: widget.onReturnHome,
          icon: const Icon(Icons.home_outlined),
          label: const Text('Back to the Grove'),
        ),
      ]),
    ]);
  }
}
