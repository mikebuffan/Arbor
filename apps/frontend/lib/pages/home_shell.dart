import 'dart:ui';
import 'package:flutter/material.dart';
import 'memory_screen.dart';
import 'chat_test_page.dart';

class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  static const _bgAsset = "assets/bg/arbor_home_locked.png";

  // Locked tokens (match mock / your canonical palette)
  static const _bg = Color(0xFF0E0316);
  static const _textGrey = Color(0xFF7A7F88);
  static const _fuchsia = Color(0xFFF3387A);

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(milliseconds: 900)),
    );
  }

  Widget _pillButton(BuildContext context, String label, VoidCallback onTap) {
    // Mock-style pill: very subtle glass, near-invisible border
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Material(
          color: Colors.white.withOpacity(0.055),
          child: InkWell(
            onTap: onTap,
            child: Container(
              height: 46,
              width: 150, // consistent pill width for mock symmetry
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withOpacity(0.10), width: 1),
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.centerLeft,
              child: Text(
                label,
                style: TextStyle(
                  color: _textGrey.withOpacity(0.95),
                  fontSize: 16,
                  fontWeight: FontWeight.w400,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _column(List<Widget> children) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < children.length; i++) ...[
          children[i],
          if (i != children.length - 1) const SizedBox(height: 14),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final panel = ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(
            maxWidth: 520,
            maxHeight: 860,
          ),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white.withOpacity(0.06), width: 1),
          ),
          child: Stack(
            children: [
              // Center title + horizon glow line
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      "ARBOR",
                      style: TextStyle(
                        color: _textGrey.withOpacity(0.92),
                        fontSize: 44,
                        letterSpacing: 8,
                        fontWeight: FontWeight.w300, // closer to mock
                      ),
                    ),
                    const SizedBox(height: 18),
                    Container(
                      height: 2,
                      width: 260,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        gradient: LinearGradient(
                          colors: [
                            Colors.transparent,
                            _fuchsia.withOpacity(0.85),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Left buttons (fun)
              Positioned(
                left: 22,
                top: 150,
                child: _column([
                  _pillButton(context, "Bored", () => _toast(context, "Bored (placeholder)")),
                  _pillButton(context, "Focus", () => _toast(context, "Focus (placeholder)")),
                  _pillButton(context, "Reset", () => _toast(context, "Reset (placeholder)")),
                  _pillButton(context, "Challenge", () => _toast(context, "Challenge (placeholder)")),
                  _pillButton(context, "Criminology", () => _toast(context, "Criminology (placeholder)")),
                ]),
              ),

              // Right buttons (function)
              Positioned(
                right: 22,
                top: 150,
                child: _column([
                  _pillButton(context, "Help", () => _toast(context, "Help (placeholder)")),
                  _pillButton(context, "Notes", () => _toast(context, "Notes (placeholder)")),
                  _pillButton(context, "Memory", () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const MemoryScreen()),
                    );
                  }),
                  _pillButton(context, "Reports", () => _toast(context, "Reports (placeholder)")),
                  _pillButton(context, "Settings", () => _toast(context, "Settings (placeholder)")),
                ]),
              ),

              // Chat test (kept, tucked low-right)
              Positioned(
                right: 22,
                bottom: 22,
                child: _pillButton(context, "Chat (test)", () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ChatTestPage()),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );

    final content = Scaffold(
      backgroundColor: _bg,
      body: Stack(
        children: [
          // Background image (the mock)
          Positioned.fill(
            child: Image.asset(
              _bgAsset,
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (_, __, ___) {
                // If asset is missing, fall back to solid bg so app still runs
                return Container(color: _bg);
              },
            ),
          ),

          // Center panel
          Center(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: panel,
            ),
          ),
        ],
      ),
    );

    // Option B: keep “phone-ish” on web (easy swap to emulator later)
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: AspectRatio(
          aspectRatio: 9 / 16,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: content,
          ),
        ),
      ),
    );
  }
}
