import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';

class ArborBackground extends StatelessWidget {
  final Widget child;
  const ArborBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _MoonsPainter(),
      child: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.6),
            radius: 1.2,
            colors: [
              Color(0xFF1A0826),
              Color(0xFF0E0316),
              Color(0xFF06010B),
            ],
          ),
        ),
        child: child,
      ),
    );
  }
}

class _MoonsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Rim positions: top-left, top-right, bottom-left, bottom-right
    _rim(canvas, size, const Offset(-0.18, 0.12), 0.56, flip: false);
    _rim(canvas, size, const Offset(1.18, 0.12), 0.56, flip: true);
    _rim(canvas, size, const Offset(-0.18, 0.92), 0.56, flip: false);
    _rim(canvas, size, const Offset(1.18, 0.92), 0.56, flip: true);

    // Center horizon glow (thin, hot core)
    final cy = size.height * 0.47;
    final rect = Rect.fromCenter(
      center: Offset(size.width * 0.5, cy),
      width: size.width * 0.42,
      height: 10,
    );
    final glow = Paint()
      ..shader = const LinearGradient(
        colors: [
          Colors.transparent,
          Color(0xFFF3387A),
          Colors.transparent,
        ],
      ).createShader(rect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(999)),
      glow,
    );

    final core = Paint()
      ..shader = const LinearGradient(
        colors: [
          Colors.transparent,
          Color(0xFFFF4C8B),
          Colors.transparent,
        ],
      ).createShader(rect);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(999)),
      core,
    );
  }

  void _rim(Canvas canvas, Size size, Offset anchor, double radiusFactor,
      {required bool flip}) {
    final r = min(size.width, size.height) * radiusFactor;
    final center = Offset(anchor.dx * size.width, anchor.dy * size.height);
    final rect = Rect.fromCircle(center: center, radius: r);

    // Bright rim stroke
    final rim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..shader = SweepGradient(
        startAngle: flip ? pi * 0.15 : pi * 1.15,
        endAngle: flip ? pi * 1.15 : pi * 2.15,
        colors: const [
          Colors.transparent,
          Color(0xFFF3387A),
          Color(0xFFFF4C8B),
          Colors.transparent,
        ],
        stops: const [0.0, 0.45, 0.62, 1.0],
      ).createShader(rect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    // Draw only the visible “crescent” portion
    final start = flip ? -0.25 : pi - 0.25;
    final sweep = 1.35;
    canvas.drawArc(rect, start, sweep, false, rim);

    // Soft outer bloom
    final bloom = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..color = const Color(0xFFF3387A).withOpacity(0.18)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 22);
    canvas.drawArc(rect, start, sweep, false, bloom);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
