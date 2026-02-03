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
    final rect = Offset.zero & size;

    // Background gradient (close to mock)
    final bgPaint = Paint()
      ..shader = const RadialGradient(
        center: Alignment(0, -0.65),
        radius: 1.25,
        colors: [bgA, bgB, bgC],
        stops: [0.0, 0.55, 1.0],
      ).createShader(rect);
    canvas.drawRect(rect, bgPaint);

    // Planet limbs — geometry tuned so they SHOW inside the phone frame.
    _limbLeft(canvas, size, top: true);
    _limbRight(canvas, size, top: true);
    _limbLeft(canvas, size, top: false);
    _limbRight(canvas, size, top: false);

    // Horizon light — bloom + mid + core + hotspot
    _horizon(canvas, size);
  }

  void _limbLeft(Canvas canvas, Size size, {required bool top}) {
    final w = size.width;
    final h = size.height;
    final r = math.min(w, h) * 0.78;

    final cx = -0.18 * w;            // inside enough to be visible, outside enough to look like a limb
    final cy = top ? 0.18 * h : 1.02 * h;

    final rect = Rect.fromCircle(center: Offset(cx, cy), radius: r);

    // Bloom
    final bloom = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 22
      ..shader = RadialGradient(
        center: const Alignment(-1, 0),
        radius: 1.0,
        colors: [
          hot.withOpacity(0.22),
          hot.withOpacity(0.06),
          Colors.transparent,
        ],
        stops: const [0.0, 0.55, 1.0],
      ).createShader(rect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 34);

    // Rim (hot + crisp-ish)
    final rim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..shader = RadialGradient(
        center: const Alignment(-1, 0),
        radius: 0.95,
        colors: [
          hotCore.withOpacity(0.95),
          hot.withOpacity(0.85),
          Colors.transparent,
        ],
        stops: const [0.0, 0.16, 1.0],
      ).createShader(rect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    // Left side arc
    canvas.drawArc(rect, math.pi / 2, math.pi, false, bloom);
    canvas.drawArc(rect, math.pi / 2, math.pi, false, rim);
  }

  void _limbRight(Canvas canvas, Size size, {required bool top}) {
    final w = size.width;
    final h = size.height;
    final r = math.min(w, h) * 0.78;

    final cx = 1.18 * w;
    final cy = top ? 0.18 * h : 1.02 * h;

    final rect = Rect.fromCircle(center: Offset(cx, cy), radius: r);

    final bloom = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 22
      ..shader = RadialGradient(
        center: const Alignment(1, 0),
        radius: 1.0,
        colors: [
          hot.withOpacity(0.22),
          hot.withOpacity(0.06),
          Colors.transparent,
        ],
        stops: const [0.0, 0.55, 1.0],
      ).createShader(rect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 34);

    final rim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..shader = RadialGradient(
        center: const Alignment(1, 0),
        radius: 0.95,
        colors: [
          hotCore.withOpacity(0.95),
          hot.withOpacity(0.85),
          Colors.transparent,
        ],
        stops: const [0.0, 0.16, 1.0],
      ).createShader(rect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    // Right side arc
    canvas.drawArc(rect, -math.pi / 2, math.pi, false, bloom);
    canvas.drawArc(rect, -math.pi / 2, math.pi, false, rim);
  }

  void _horizon(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final y = h * 0.50;

    // Wide bloom band (soft)
    final bandRect = Rect.fromCenter(
      center: Offset(w * 0.5, y),
      width: w * 0.62,
      height: 18,
    );
    final band = Paint()
      ..shader = const LinearGradient(
        colors: [Colors.transparent, hot, Colors.transparent],
      ).createShader(bandRect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18);
    canvas.drawRRect(
      RRect.fromRectAndRadius(bandRect, const Radius.circular(999)),
      band,
    );

    // Mid line (tighter)
    final midRect = Rect.fromCenter(
      center: Offset(w * 0.5, y),
      width: w * 0.44,
      height: 6,
    );
    final mid = Paint()
      ..shader = LinearGradient(
        colors: [
          Colors.transparent,
          hot.withOpacity(0.95),
          Colors.transparent,
        ],
      ).createShader(midRect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawRRect(
      RRect.fromRectAndRadius(midRect, const Radius.circular(999)),
      mid,
    );

    // Core hotspot (small, bright)
    final coreRect = Rect.fromCenter(
      center: Offset(w * 0.5, y),
      width: w * 0.14,
      height: 3,
    );
    final core = Paint()
      ..shader = const LinearGradient(
        colors: [Colors.transparent, hotCore, Colors.transparent],
      ).createShader(coreRect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
    canvas.drawRRect(
      RRect.fromRectAndRadius(coreRect, const Radius.circular(999)),
      core,
    );

    // A tiny bright dot (gives the “light source” feel)
    final dot = Paint()
      ..color = hotCore.withOpacity(0.95)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawCircle(Offset(w * 0.5, y), 2.0, dot);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
