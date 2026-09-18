import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'environment_tokens.dart';

class EnvironmentAtmosphere extends StatefulWidget {
  const EnvironmentAtmosphere({super.key, required this.child});
  final Widget child;

  @override
  State<EnvironmentAtmosphere> createState() => _EnvironmentAtmosphereState();
}

class _EnvironmentAtmosphereState extends State<EnvironmentAtmosphere>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 18),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    Widget scene(double phase) => Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: ArborEnvironmentTokens.voidBlack),
        RepaintBoundary(
          child: CustomPaint(painter: _AtmospherePainter(phase: phase)),
        ),
        widget.child,
      ],
    );

    if (reduceMotion) return scene(0);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => scene(_controller.value),
    );
  }
}

class _AtmospherePainter extends CustomPainter {
  const _AtmospherePainter({required this.phase});
  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final sky = Paint()
      ..shader = const RadialGradient(
        center: Alignment(.45, -.9),
        radius: 1.4,
        colors: [
          Color(0xFF13312E),
          ArborEnvironmentTokens.midnight,
          ArborEnvironmentTokens.voidBlack,
        ],
        stops: [0, .42, 1],
      ).createShader(rect);
    canvas.drawRect(rect, sky);

    final horizon = Paint()
      ..shader = const LinearGradient(
        colors: [
          Colors.transparent,
          Color(0x224DE5D8),
          Color(0x226F63D7),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, size.height * .58, size.width, 120))
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 28);
    canvas.drawRect(Rect.fromLTWH(0, size.height * .55, size.width, 160), horizon);

    final glow = Paint()..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
    for (var i = 0; i < 18; i++) {
      final seed = i * 71.0;
      final x = (math.sin(seed) * .5 + .5) * size.width;
      final baseY = (math.cos(seed * .37) * .5 + .5) * size.height;
      final y = (baseY + math.sin((phase * math.pi * 2) + i) * 8) % size.height;
      final radius = 1.2 + (i % 3) * .45;
      glow.color = (i % 4 == 0 ? ArborEnvironmentTokens.violet : ArborEnvironmentTokens.firefly)
          .withValues(alpha: .16 + (i % 5) * .035);
      canvas.drawCircle(Offset(x, y), radius, glow);
    }
  }

  @override
  bool shouldRepaint(_AtmospherePainter oldDelegate) => oldDelegate.phase != phase;
}
