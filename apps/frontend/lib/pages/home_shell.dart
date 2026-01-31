import 'dart:ui';
import 'package:flutter/material.dart';

import 'memory_screen.dart';
import 'chat_test_page.dart';

// ✅ Use the shared widgets (prevents UI drift)
import '../widgets/glass_pill_button.dart';
import '../widgets/arbor_center_mark.dart';

class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(milliseconds: 900)),
    );
  }

  @override
  Widget build(BuildContext context) {
    // ✅ Button grid: composed + locked (no dynamic clamp math)
    // Adjust these constants if you want micro-tuning later.
    const double sideInset = 18.0;
    const double topOffset = 230.0; // ✅ pushes grid below logo area
    const double gap = 12.0;
    
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
                    constraints: const BoxConstraints(
                      maxWidth: 430,
                      maxHeight: 740,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: Stack(
                      children: [
                        // ✅ ARBOR mark: fixed near top, not centered (prevents overlap)
                        const Positioned(
                          top: 70,
                          left: 0,
                          right: 0,
                          child: Center(child: ArborCenterMark()),
                        ),
                      
                        // Left buttons (modes)
                        Positioned(
                          left: sideInset,
                          top: topOffset,
                          child: Column(
                            children: [
                              GlassPillButton(
                                label: "Bored",
                                onTap: () => _toast(context, "Bored (placeholder)"),
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Focus",
                                onTap: () => _toast(context, "Focus (placeholder)"),
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Reset",
                                onTap: () => _toast(context, "Reset (placeholder)"),
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Challenge",
                                onTap: () => _toast(context, "Challenge (placeholder)"),
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Criminology",
                                onTap: () => _toast(context, "Criminology (placeholder)"),
                              ),
                            ],
                          ),
                        ),

                        // Right buttons (utility)
                        Positioned(
                          right: sideInset,
                          top: topOffset,
                          child: Column(
                            children: [
                              GlassPillButton(
                                label: "Help",
                                onTap: () => _toast(context, "Help (placeholder)"),
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Notes",
                                onTap: () => _toast(context, "Notes (placeholder)"),
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Memory",
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const MemoryScreen()),
                                  );
                                },
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Reports",
                                onTap: () => _toast(context, "Reports (placeholder)"),
                              ),
                              const SizedBox(height: gap),
                              GlassPillButton(
                                label: "Settings",
                                onTap: () => _toast(context, "Settings (placeholder)"),
                              ),
                            ],
                          ),
                        ),

                        // Quick access (for now)
                        Positioned(
                          right: 18,
                          bottom: 18,
                          child: GlassPillButton(
                            label: "Chat (test)",
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const ChatTestPage()),
                              );
                            },
                          ),
                        ),
                      ],
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
