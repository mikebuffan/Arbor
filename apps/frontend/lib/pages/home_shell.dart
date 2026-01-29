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

  Widget _glassButton(BuildContext context, String label, VoidCallback onTap) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Material(
          color: Colors.white.withOpacity(0.06),
          child: InkWell(
            onTap: onTap,
            child: Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.centerLeft,
              child: Text(
                label,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.80),
                  fontSize: 14,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _column(BuildContext context, List<Widget> children) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < children.length; i++) ...[
          children[i],
          if (i != children.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Keep it phone-shaped in web so it resembles the mock
    final content = Scaffold(
      body: Stack(
        children: [
          // Background (deep charcoal/purple-black)
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.2),
                radius: 1.2,
                colors: [
                  Color(0xFF12081A),
                  Color(0xFF0E0316),
                  Color(0xFF06020A),
                ],
                stops: [0.0, 0.55, 1.0],
              ),
            ),
          ),

          // Fuchsia corner glows (cheap, effective)
          Positioned(
            left: -140,
            top: -140,
            child: _GlowOrb(size: 320),
          ),
          Positioned(
            right: -140,
            top: -140,
            child: _GlowOrb(size: 320),
          ),
          Positioned(
            left: -160,
            bottom: -160,
            child: _GlowOrb(size: 360),
          ),
          Positioned(
            right: -160,
            bottom: -160,
            child: _GlowOrb(size: 360),
          ),

          // Center panel
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
                    child: Stack(
                      children: [
                        // center title + subtle line
                        Center(
                          child: Column(
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
                              const SizedBox(height: 16),
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
                          ),
                        ),

                        // Left buttons (modes)
                        Positioned(
                          left: 18,
                          top: 120,
                          child: _column(context, [
                            _glassButton(context, "Bored", () => _toast(context, "Bored (placeholder)")),
                            _glassButton(context, "Focus", () => _toast(context, "Focus (placeholder)")),
                            _glassButton(context, "Reset", () => _toast(context, "Reset (placeholder)")),
                            _glassButton(context, "Challenge", () => _toast(context, "Challenge (placeholder)")),
                            _glassButton(context, "Criminology", () => _toast(context, "Criminology (placeholder)")),
                          ]),
                        ),

                        // Right buttons (utility)
                        Positioned(
                          right: 18,
                          top: 120,
                          child: _column(context, [
                            _glassButton(context, "Help", () => _toast(context, "Help (placeholder)")),
                            _glassButton(context, "Notes", () => _toast(context, "Notes (placeholder)")),
                            _glassButton(context, "Memory", () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const MemoryScreen()),
                              );
                            }),
                            _glassButton(context, "Reports", () => _toast(context, "Reports (placeholder)")),
                            _glassButton(context, "Settings", () => _toast(context, "Settings (placeholder)")),
                          ]),
                        ),

                        // Optional: quick way to open chat test page for now
                        Positioned(
                          right: 18,
                          bottom: 18,
                          child: _glassButton(context, "Chat (test)", () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const ChatTestPage()),
                            );
                          }),
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

    // Keep it “phone-ish” on web
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 470),
        child: content,
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
            const Color(0xFFF3387A).withOpacity(0.20),
            Colors.transparent,
          ],
          stops: const [0.0, 0.35, 1.0],
        ),
      ),
    );
  }
}
