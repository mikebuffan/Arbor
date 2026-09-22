import 'package:flutter/material.dart';

import 'chat_test_page.dart';
import 'voice_page.dart';

/// Private Grove presentation of the existing text/voice transport.
///
/// This is not a public Arbor App screen or a new identity provider.
/// The existing Firefly authentication and API remain in use until the
/// private Grove account/service boundary is provisioned and tested.
class GroveTalkPage extends StatefulWidget {
  const GroveTalkPage({super.key});

  @override
  State<GroveTalkPage> createState() => _GroveTalkPageState();
}

class _GroveTalkPageState extends State<GroveTalkPage> {
  bool _voice = false;

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: const Color(0xFF0A1819),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              child: Row(
                children: [
                  const Icon(Icons.forest_outlined,
                      color: Color(0xFF91DAD2)),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'THE GROVE · TALK',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.1,
                        color: Color(0xFF91DAD2),
                      ),
                    ),
                  ),
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment<bool>(
                          value: false,
                          icon: Icon(Icons.chat_bubble_outline),
                          label: Text('Text')),
                      ButtonSegment<bool>(
                          value: true,
                          icon: Icon(Icons.mic_none_outlined),
                          label: Text('Voice')),
                    ],
                    selected: {_voice},
                    onSelectionChanged: (selected) =>
                        setState(() => _voice = selected.first),
                  ),
                ],
              ),
            ),
            Expanded(
              child: IndexedStack(
                index: _voice ? 1 : 0,
                children: [
                  const ChatTestPage(),
                  VoicePage(active: _voice),
                ],
              ),
            ),
          ],
        ),
      );
}
