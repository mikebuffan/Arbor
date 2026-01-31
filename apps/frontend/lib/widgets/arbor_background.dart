import 'dart:math' as math;
import 'package:flutter/material.dart';

class ArborBackground extends StatelessWidget {
  const ArborBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _ArborHomePainter(),
      child: const SizedBox.expand(),
    );
  }
}

class _ArborHomePainter extends CustomPainter {
  static const bgA = Color(0xFF1A0826);
  static const bgB = Color(0xFF0E0316);
  static const bgC = Color(0xFF05010A);

  static const hot = Color(0xFFF3387A);
  static const hotCore = Color(0xFFFF4C8B);

  @override
  void paint(Canvas canvas, Size size) {
    // Background gradient
    final rect = Offset.zero & size;
    final bgPaint = Paint()
      ..shader = const RadialGradient(
        center: Alignment(0, -0.65),
        radius: 1.25,
        colors: [bgA, bgB, bgC],
        stops: [0.0, 0.55, 1.0],
      ).createShader(rect);
    canvas.drawRect(rect, bgPaint);

    // Planet limbs: big + edge-hugging like the mock
    _planetLimb(canvas, size, const Alignment(-1.25, -0.75), flip: false);
    _planetLimb(canvas, size, const Alignment( 1.25, -0.75), flip: true);
    _planetLimb(canvas, size, const Alignment(-1.25,  1.05), flip: false);
    _planetLimb(canvas, size, const Alignment( 1.25,  1.05), flip: true);

    // Horizon glow line (hot core + bloom), centered under ARBOR
    final y = size.height * 0.50;
    final lineRect = Rect.fromCenter(
      center: Offset(size.width * 0.5, y),
      width: size.width * 0.55,
      height: 10,
    );

    final bloom = Paint()
      ..shader = const LinearGradient(
        colors: [Colors.transparent, hot, Colors.transparent],
      ).createShader(lineRect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14);
    canvas.drawRRect(
      RRect.fromRectAndRadius(lineRect, const Radius.circular(999)),
      bloom,
    );

    final coreRect = Rect.fromCenter(
      center: Offset(size.width * 0.5, y),
      width: size.width * 0.22,
      height: 4,
    );
    final core = Paint()
      ..shader = const LinearGradient(
        colors: [Colors.transparent, hotCore, Colors.transparent],
      ).createShader(coreRect);
    canvas.drawRRect(
      RRect.fromRectAndRadius(coreRect, const Radius.circular(999)),
      core,
    );
  }

  void _planetLimb(Canvas canvas, Size size, Alignment a, {required bool flip}) {
    final w = size.width;
    final h = size.height;

    // Big radius so only the rim shows
    final r = math.min(w, h) * 0.62;
    final cx = (a.x + 1) * 0.5 * w;
    final cy = (a.y + 1) * 0.5 * h;
    final rect = Rect.fromCircle(center: Offset(cx, cy), radius: r);

    // Bloom halo
    final halo = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 22
      ..color = hot.withOpacity(0.16)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 34);

    // Hot rim
    final rim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..shader = SweepGradient(
        startAngle: flip ? math.pi * 0.15 : math.pi * 1.15,
        endAngle:   flip ? math.pi * 1.10 : math.pi * 2.10,
        colors: [
          Colors.transparent,
          hot.withOpacity(0.85),
          hotCore.withOpacity(0.95),
          Colors.transparent,
        ],
        stops: const [0.0, 0.45, 0.60, 1.0],
      ).createShader(rect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    // Sweep arc that shows just the limb
    final start = flip ? -0.35 : math.pi - 0.35;
    const sweep = 1.55;

    canvas.drawArc(rect, start, sweep, false, halo);
    canvas.drawArc(rect, start, sweep, false, rim);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
