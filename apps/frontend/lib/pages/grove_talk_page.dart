import 'package:flutter/material.dart';

import 'chat_test_page.dart';
import 'voice_page.dart';
import '../environment/grove_app_mode.dart';
import '../config/grove_private_config.dart';
import 'grove_private_text_page.dart';

/// Independent compile-time opt-in, intentionally OFF for ordinary builds.
const bool _grovePrivateTextEnabled =
    bool.fromEnvironment('GROVE_PRIVATE_TALK_PREVIEW', defaultValue: false);

/// The private Grove Text view is behind an independent build-time flag
/// and a separately configured Grove host. Default OFF. Never mount legacy
/// public Firefly chat/voice inside the private Grove standalone house.
/// The original Firefly-flavor chat/voice views remain unchanged.
class GroveTalkPage extends StatefulWidget {
  const GroveTalkPage({
    super.key,
    this.privateHostMode = groveStandalone,
  });

  /// Injection makes the private-host protection widget-testable; the actual
  /// standalone Grove build always supplies [groveStandalone] by default.
  final bool privateHostMode;

  @override
  State<GroveTalkPage> createState() => _GroveTalkPageState();
}

class _GroveTalkPageState extends State<GroveTalkPage> {
  bool _voice = false;

  @override
  Widget build(BuildContext context) => widget.privateHostMode
      ? (_grovePrivateTextEnabled && GrovePrivateConfig.fromBuild.ready
          ? const GrovePrivateTextHost()
          : const _GrovePrivateTalkUnavailable())
      : ColoredBox(
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

 
/// Read-only until the authenticated, owner-scoped Grove conversation
/// endpoint exists. Showing the old transport here would suggest Text/Voice
/// works even though the private host correctly denies those routes.
class _GrovePrivateTalkUnavailable extends StatelessWidget {
  const _GrovePrivateTalkUnavailable();

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: const Color(0xFF0A1819),
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(22),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: 490),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.forest_outlined,
                      color: Color(0xFF91DAD2), size: 43),
                  SizedBox(height: 14),
                  Text('THE GROVE · TALK',
                      style: TextStyle(color: Color(0xFF91DAD2),
                          fontWeight: FontWeight.w600, letterSpacing: 1.1)),
                  SizedBox(height: 16),
                  Text('Private conversation isn’t connected yet.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontSize: 20)),
                  SizedBox(height: 12),
                  Text(
                    'The private Grove API currently supports authorized '
                    'read-only ARK status. Text and Voice need their own '
                    'verified, owner-scoped conversation endpoint. '
                    'This private sign-in will not be sent to the old '
                    'Firefly or public-app chat service.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}
