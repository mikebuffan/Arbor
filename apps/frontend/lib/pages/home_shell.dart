import 'package:flutter/material.dart';
import '../widgets/arbor_background.dart';
import '../widgets/arbor_center_mark.dart';
import '../widgets/glass_pill_button.dart';

class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(milliseconds: 650)),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Grid tuning to match mock
    const double colGap = 18;
    const double rowGap = 14;
    const double sideInset = 26;
    const double topClear = 210; // leaves room for center mark
    const double buttonW = 162;

    return ArborBackground(
      child: Stack(
        children: [
          // Tap-to-open-chat area (we’ll hook this later)
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () {
                // Placeholder only; no chat button on home.
                _toast(context, "Tap-to-chat will be wired next.");
              },
              child: const SizedBox(),
            ),
          ),

          // Center ARBOR mark
          const Positioned(
            left: 0,
            right: 0,
            top: 118,
            child: Center(child: ArborCenterMark()),
          ),

          // Button grid
          Positioned(
            left: sideInset,
            right: sideInset,
            top: topClear,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: buttonW,
                  child: Column(
                    children: [
                      GlassPillButton(label: "Bored", onTap: () => _toast(context, "Bored")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Focus", onTap: () => _toast(context, "Focus")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Reset", onTap: () => _toast(context, "Reset")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Challenge", onTap: () => _toast(context, "Challenge")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Criminology", onTap: () => _toast(context, "Criminology")),
                    ],
                  ),
                ),
                const SizedBox(width: colGap),
                SizedBox(
                  width: buttonW,
                  child: Column(
                    children: [
                      GlassPillButton(label: "Help", onTap: () => _toast(context, "Help")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Notes", onTap: () => _toast(context, "Notes")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Memory", onTap: () => _toast(context, "Memory")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Reports", onTap: () => _toast(context, "Reports")),
                      const SizedBox(height: rowGap),
                      GlassPillButton(label: "Settings", onTap: () => _toast(context, "Settings")),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
