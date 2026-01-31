import 'package:flutter/material.dart';

class ArborBackground extends StatelessWidget {
  final Widget child;
  const ArborBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Deep charcoal / purple-black radial gradient
        Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0, -0.2),
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

        // Corner glow orbs
        const _CornerGlow(left: true, top: true),
        const _CornerGlow(left: false, top: true),
        const _CornerGlow(left: true, top: false),
        const _CornerGlow(left: false, top: false),

        child,
      ],
    );
  }
}

class _CornerGlow extends StatelessWidget {
  final bool left;
  final bool top;
  const _CornerGlow({required this.left, required this.top});

  @override
  Widget build(BuildContext context) {
    final dx = left ? -150.0 : null;
    final rx = left ? null : -150.0;
    final ty = top ? -150.0 : null;
    final by = top ? null : -150.0;

    return Positioned(
      left: dx,
      right: rx,
      top: ty,
      bottom: by,
      child: Container(
        width: 340,
        height: 340,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              const Color(0xFFF3387A).withOpacity(0.55),
              const Color(0xFFF3387A).withOpacity(0.18),
              Colors.transparent,
            ],
            stops: const [0.0, 0.35, 1.0],
          ),
        ),
      ),
    );
  }
}
