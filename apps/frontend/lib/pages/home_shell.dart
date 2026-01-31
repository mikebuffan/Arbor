import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:frontend/widgets/arbor_background.dart';
import 'package:frontend/widgets/glass_pill_button.dart';
import 'package:frontend/widgets/arbor_center_mark.dart';
import 'memory_screen.dart';
import 'chat_test_page.dart';

class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(milliseconds: 900)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ArborBackground(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 430, maxHeight: 740),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withOpacity(0.06)),
                  ),
                  child: LayoutBuilder(
                    builder: (context, box) {
                      // ✅ vertically center the button stacks
                      const buttonH = 46.0;
                      const gap = 12.0;
                      const count = 5;
                      final totalH = (buttonH * count) + (gap * (count - 1));
                      final topOffset = ((box.maxHeight - totalH) / 2).clamp(90.0, 220.0);

                      const sideInset = 18.0;

                      return Stack(
                        children: [
                          // Center logo (never gets pushed)
                          const Center(child: ArborCenterMark()),

                          Positioned(
                            left: sideInset,
                            top: topOffset,
                            child: Column(
                              children: [
                                GlassPillButton(label: "Bored", onTap: () => _toast(context, "Bored (placeholder)")),
                                const SizedBox(height: gap),
                                GlassPillButton(label: "Focus", onTap: () => _toast(context, "Focus (placeholder)")),
                                const SizedBox(height: gap),
                                GlassPillButton(label: "Reset", onTap: () => _toast(context, "Reset (placeholder)")),
                                const SizedBox(height: gap),
                                GlassPillButton(label: "Challenge", onTap: () => _toast(context, "Challenge (placeholder)")),
                                const SizedBox(height: gap),
                                GlassPillButton(label: "Criminology", onTap: () => _toast(context, "Criminology (placeholder)")),
                              ],
                            ),
                          ),

                          Positioned(
                            right: sideInset,
                            top: topOffset,
                            child: Column(
                              children: [
                                GlassPillButton(label: "Help", onTap: () => _toast(context, "Help (placeholder)")),
                                const SizedBox(height: gap),
                                GlassPillButton(label: "Notes", onTap: () => _toast(context, "Notes (placeholder)")),
                                const SizedBox(height: gap),
                                GlassPillButton(
                                  label: "Memory",
                                  onTap: () => Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const MemoryScreen()),
                                  ),
                                ),
                                const SizedBox(height: gap),
                                GlassPillButton(label: "Reports", onTap: () => _toast(context, "Reports (placeholder)")),
                                const SizedBox(height: gap),
                                GlassPillButton(label: "Settings", onTap: () => _toast(context, "Settings (placeholder)")),
                              ],
                            ),
                          ),

                          Positioned(
                            right: 18,
                            bottom: 18,
                            child: GlassPillButton(
                              label: "Chat (test)",
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const ChatTestPage()),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
