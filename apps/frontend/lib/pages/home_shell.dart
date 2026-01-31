import 'dart:ui';
import 'package:flutter/material.dart';

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
      body: Stack(
        children: [
          // Background (deep charcoal/purple-black)
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.25),
                radius: 1.25,
                colors: [
                  Color(0xFF12081A),
                  Color(0xFF0E0316),
                  Color(0xFF06020A),
                ],
                stops: [0.0, 0.55, 1.0],
              ),
            ),
          ),

          // Corner glows
          const Positioned(left: -140, top: -140, child: _GlowOrb(size: 320)),
          const Positioned(right: -140, top: -140, child: _GlowOrb(size: 320)),
          const Positioned(left: -160, bottom: -160, child: _GlowOrb(size: 360)),
          const Positioned(right: -160, bottom: -160, child: _GlowOrb(size: 360)),

          // Phone-ish center panel
          Center(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                  child: Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(maxWidth: 430, maxHeight: 740),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: LayoutBuilder(
                      builder: (context, box) {
                        // Button sizing tuned so it doesn’t collide with the center logo
                        const buttonH = 46.0;
                        const gap = 12.0;
                        const count = 5;
                        final totalH = (buttonH * count) + (gap * (count - 1));
                        final topOffset = ((box.maxHeight - totalH) / 2).clamp(110.0, 240.0);

                        const sideInset = 18.0;

                        return Stack(
                          children: [
                            // Center mark
                            const Center(child: _ArborCenterMark()),

                            // Left buttons (modes)
                            Positioned(
                              left: sideInset,
                              top: topOffset,
                              child: Column(
                                children: [
                                  _PillButton(label: "Bored", onTap: () => _toast(context, "Bored (placeholder)")),
                                  const SizedBox(height: gap),
                                  _PillButton(label: "Focus", onTap: () => _toast(context, "Focus (placeholder)")),
                                  const SizedBox(height: gap),
                                  _PillButton(label: "Reset", onTap: () => _toast(context, "Reset (placeholder)")),
                                  const SizedBox(height: gap),
                                  _PillButton(label: "Challenge", onTap: () => _toast(context, "Challenge (placeholder)")),
                                  const SizedBox(height: gap),
                                  _PillButton(label: "Criminology", onTap: () => _toast(context, "Criminology (placeholder)")),
                                ],
                              ),
                            ),

                            // Right buttons (utility)
                            Positioned(
                              right: sideInset,
                              top: topOffset,
                              child: Column(
                                children: [
                                  _PillButton(label: "Help", onTap: () => _toast(context, "Help (placeholder)")),
                                  const SizedBox(height: gap),
                                  _PillButton(label: "Notes", onTap: () => _toast(context, "Notes (placeholder)")),
                                  const SizedBox(height: gap),
                                  _PillButton(
                                    label: "Memory",
                                    onTap: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(builder: (_) => const MemoryScreen()),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: gap),
                                  _PillButton(label: "Reports", onTap: () => _toast(context, "Reports (placeholder)")),
                                  const SizedBox(height: gap),
                                  _PillButton(label: "Settings", onTap: () => _toast(context, "Settings (placeholder)")),
                                ],
                              ),
                            ),

                            // Quick access (for now)
                            Positioned(
                              right: 18,
                              bottom: 18,
                              child: _PillButton(
                                label: "Chat (test)",
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const ChatTestPage()),
                                  );
                                },
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
        ],
      ),
    );
  }
}

class _ArborCenterMark extends StatelessWidget {
  const _ArborCenterMark();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          "ARBOR",
          style: TextStyle(
            color: const Color(0xFF7A7F88).withOpacity(0.95),
            fontSize: 36,
            letterSpacing: 6,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 14),
        Container(
          height: 2,
          width: 220,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(99),
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                const Color(0xFFF3387A).withOpacity(0.85),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PillButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _PillButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Material(
          color: Colors.white.withOpacity(0.06),
          child: InkWell(
            onTap: onTap,
            child: Container(
              height: 46,
              width: 160, // 🔒 prevents overlap with center mark
              padding: const EdgeInsets.symmetric(horizontal: 18),
              alignment: Alignment.centerLeft,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                label,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.70),
                  fontSize: 15,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  final double size;
  const _GlowOrb({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            const Color(0xFFF3387A).withOpacity(0.55),
            const Color(0xFFF3387A).withOpacity(0.18),
            Colors.transparent,
          ],
          stops: const [0.0, 0.38, 1.0],
        ),
      ),
    );
  }
}
