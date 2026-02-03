import 'package:flutter/material.dart';
import '../ui/phone_frame.dart';
import '../widgets/arbor_background.dart';
import '../widgets/arbor_center_mark.dart';
import '../widgets/glass_pill_button.dart';
import 'chat_test_page.dart';

class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  void _noop() {}

  @override
  Widget build(BuildContext context) {
    return PhoneFrame(
      child: Stack(
        children: [
          // Background lives INSIDE the phone, like the mock
          const Positioned.fill(child: ArborBackground()),

          // Left rail
          Positioned(
            left: 34,
            top: 292,
            child: Column(
              children: const [
                _RailButton(label: "Bored"),
                SizedBox(height: 10),
                _RailButton(label: "Focus"),
                SizedBox(height: 10),
                _RailButton(label: "Reset"),
                SizedBox(height: 10),
                _RailButton(label: "Challenge"),
                SizedBox(height: 10),
                _RailButton(label: "Criminology"),
              ],
            ),
          ),

          // Right rail
          Positioned(
            right: 34,
            top: 292,
            child: Column(
              children: const [
                _RailButton(label: "Help"),
                SizedBox(height: 10),
                _RailButton(label: "Notes"),
                SizedBox(height: 10),
                _RailButton(label: "History"),
                SizedBox(height: 10),
                _RailButton(label: "Reports"),
                SizedBox(height: 10),
                _RailButton(label: "Settings"),
              ],
            ),
          ),

          // ARBOR centered BETWEEN rails (vertically aligned with the horizon glow)
          const Positioned(
            left: 0,
            right: 0,
            top: 284,
            child: Center(child: ArborCenterMark()),
          ),

          // NOTE: No chat button. Tap-to-chat overlay comes later as the transition sheet.
          // We intentionally do nothing here for now to keep UX clean.
          ElevatedButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ChatTestPage()),
            ),
            child: const Text("Chat (test)"),
          )
        ],
      ),
    );
  }
}

class _RailButton extends StatelessWidget {
  final String label;
  const _RailButton({required this.label});

  @override
  Widget build(BuildContext context) {
    return GlassPillButton(label: label, onTap: () {});
  }
}
