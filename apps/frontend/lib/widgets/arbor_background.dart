import 'dart:math' as math;
import 'package:flutter/material.dart';

class ArborBackground extends StatelessWidget {
  final Widget child;
  const ArborBackground({super.key, required this.child});

  static const _bgA = Color(0xFF12081A);
  static const _bgB = Color(0xFF0E0316);
  static const _bgC = Color(0xFF06020A);

  // Locked accent range you’ve been using
  static const _fuchsiaHot = Color(0xFFF3387A);

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
              colors: [_bgA, _bgB, _bgC],
              stops: [0.0, 0.55, 1.0],
            ),
          ),
        ),

        // Corner “planet sunrise” outlines (mockup vibe)
        const Positioned.fill(child: _CornerPlanetGlows()),

        // Main content
        Positioned.fill(child: child),
      ],
    );
  }
}

/// 4 corner half-circle “planet outlines” with fuchsia glow.
/// (Pulled from firefly_code_complete.txt and adapted to current theme/colors.):contentReference[oaicite:1]{index=1}
class _CornerPlanetGlows extends StatelessWidget {
  const _CornerPlanetGlows();

  @override
  Widget build(BuildContext context) {
    // Tune these to match the mockup scale
    const double size = 340;      // was 260 in the reference; mockup corners look larger
    const double stroke = 3.0;
    const double glowBlur = 42;   // stronger “sunrise” halo

    Widget corner({
      required Alignment align,
      required double startAngle,
    }) {
      return Align(
        alignment: align,
        child: SizedBox(
          width: size,
          height: size,
          child: CustomPaint(
            painter: _PlanetOutlinePainter(
              // line + glow intensities tuned toward the mockup
              color: ArborBackground._fuchsiaHot.withOpacity(0.70),
              strokeWidth: stroke,
              glowColor: ArborBackground._fuchsiaHot.withOpacity(0.22),
              glowBlur: glowBlur,
              startAngle: startAngle,
              sweepAngle: math.pi, // half circle
            ),
          ),
        ),
      );
    }

    return IgnorePointer(
      child: Stack(
        children: [
          corner(align: Alignment.topLeft, startAngle: 0),
          corner(align: Alignment.topRight, startAngle: math.pi / 2),
          corner(align: Alignment.bottomLeft, startAngle: -math.pi / 2),
          corner(align: Alignment.bottomRight, startAngle: math.pi),
        ],
      ),
    );
  }
}

class _PlanetOutlinePainter extends CustomPainter {
  _PlanetOutlinePainter({
    required this.color,
    required this.strokeWidth,
    required this.glowColor,
    required this.glowBlur,
    required this.startAngle,
    required this.sweepAngle,
  });

  final Color color;
  final double strokeWidth;
  final Color glowColor;
  final double glowBlur;
  final double startAngle;
  final double sweepAngle;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(0, 0, size.width, size.height);

    // Glow pass (soft):contentReference[oaicite:2]{index=2}
    final glowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = glowColor
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, glowBlur);

    // Line pass (crisper)
    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = color
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.0);

    canvas.drawArc(rect, startAngle, sweepAngle, false, glowPaint);
    canvas.drawArc(rect, startAngle, sweepAngle, false, linePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
