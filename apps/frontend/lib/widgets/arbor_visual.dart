import 'dart:math' as math;

import 'package:flutter/material.dart';

enum ArborVisualState {
  idle,
  listening,
  thinking,
  speaking,
}

class ArborVisual extends StatefulWidget {
  const ArborVisual({
    super.key,
    required this.state,
    this.soundLevel = 0,
    this.showTitle = true,
  });

  final ArborVisualState state;
  final double soundLevel;
  final bool showTitle;

  @override
  State<ArborVisual> createState() => _ArborVisualState();
}

class _ArborVisualState extends State<ArborVisual>
    with SingleTickerProviderStateMixin {
  late final AnimationController _motion;

  @override
  void initState() {
    super.initState();
    _motion = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  double get _activity {
    switch (widget.state) {
      case ArborVisualState.idle:
        return 0.18;
      case ArborVisualState.listening:
        return 0.55 + widget.soundLevel.abs().clamp(0, 30) / 75;
      case ArborVisualState.thinking:
        return 0.72;
      case ArborVisualState.speaking:
        return 0.86 + widget.soundLevel.abs().clamp(0, 30) / 100;
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.state != ArborVisualState.idle;

    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _motion,
        builder: (context, _) {
          final wave = (math.sin(_motion.value * math.pi * 2) + 1) / 2;
          final activity = (_activity + wave * 0.10).clamp(0.0, 1.0);

          return Stack(
            fit: StackFit.expand,
            children: [
              const ColoredBox(color: Color(0xFF0E0316)),
              CustomPaint(
                painter: _ArborGlowPainter(
                  state: widget.state,
                  activity: activity,
                  phase: _motion.value,
                ),
              ),
              Center(
                child: Transform.translate(
                  offset: const Offset(0, -40),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedOpacity(
                        opacity: widget.showTitle && !active ? 1 : 0,
                        duration: const Duration(milliseconds: 420),
                        curve: Curves.easeOut,
                        child: const Text(
                          'ARBOR',
                          style: TextStyle(
                            color: Color(0xFFE9E9EE),
                            fontSize: 32,
                            letterSpacing: 6,
                            fontWeight: FontWeight.w300,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      _CenterPulse(
                        state: widget.state,
                        activity: activity,
                        phase: _motion.value,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CenterPulse extends StatelessWidget {
  const _CenterPulse({
    required this.state,
    required this.activity,
    required this.phase,
  });

  final ArborVisualState state;
  final double activity;
  final double phase;

  @override
  Widget build(BuildContext context) {
    final width = switch (state) {
      ArborVisualState.idle => 160.0,
      ArborVisualState.listening => 175.0,
      ArborVisualState.thinking => 190.0,
      ArborVisualState.speaking => 205.0,
    };

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
      width: width,
      height: 18,
      child: CustomPaint(
        painter: _PulsePainter(
          state: state,
          activity: activity,
          phase: phase,
        ),
      ),
    );
  }
}

class _PulsePainter extends CustomPainter {
  const _PulsePainter({
    required this.state,
    required this.activity,
    required this.phase,
  });

  final ArborVisualState state;
  final double activity;
  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    final centerY = size.height / 2;
    final glow = Paint()
      ..shader = const LinearGradient(
        colors: [
          Colors.transparent,
          Color(0x66F3387A),
          Color(0xFFFF5AA0),
          Color(0x66F3387A),
          Colors.transparent,
        ],
      ).createShader(Offset.zero & size)
      ..strokeWidth = 2.2
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);

    final line = Paint()
      ..shader = const LinearGradient(
        colors: [
          Colors.transparent,
          Color(0xFFF3387A),
          Color(0xFFFF8FBD),
          Color(0xFFF3387A),
          Colors.transparent,
        ],
      ).createShader(Offset.zero & size)
      ..strokeWidth = 1.25
      ..style = PaintingStyle.stroke;

    Path makePath() {
      final path = Path()..moveTo(0, centerY);
      const segments = 48;
      for (var i = 1; i <= segments; i++) {
        final x = size.width * i / segments;
        final normalized = i / segments;
        final envelope = math.sin(normalized * math.pi);
        double y = centerY;

        if (state == ArborVisualState.thinking) {
          y += math.sin((normalized * 4 + phase * 2) * math.pi) *
              1.7 *
              envelope *
              activity;
        } else if (state == ArborVisualState.speaking) {
          y += math.sin((normalized * 7 + phase * 3) * math.pi) *
              2.8 *
              envelope *
              activity;
        } else if (state == ArborVisualState.listening) {
          y += math.sin((normalized * 3 + phase) * math.pi) *
              0.9 *
              envelope *
              activity;
        }

        path.lineTo(x, y);
      }
      return path;
    }

    final path = makePath();
    canvas.drawPath(path, glow);
    canvas.drawPath(path, line);

    final flare = Paint()
      ..color = Color.lerp(
        const Color(0x66F3387A),
        const Color(0xFFFFB0CF),
        activity,
      )!
      ..maskFilter = MaskFilter.blur(
        BlurStyle.normal,
        3 + activity * 5,
      );

    canvas.drawCircle(
      Offset(size.width / 2, centerY),
      1.5 + activity * 1.8,
      flare,
    );
  }

  @override
  bool shouldRepaint(_PulsePainter oldDelegate) =>
      oldDelegate.state != state ||
      oldDelegate.activity != activity ||
      oldDelegate.phase != phase;
}

class _ArborGlowPainter extends CustomPainter {
  const _ArborGlowPainter({
    required this.state,
    required this.activity,
    required this.phase,
  });

  final ArborVisualState state;
  final double activity;
  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    final shortest = math.min(size.width, size.height);
    final radius = shortest * 0.46;
    final breathing =
        1 + math.sin(phase * math.pi * 2) * (state == ArborVisualState.idle ? .01 : .025);
    final r = radius * breathing;

    final centers = <Offset>[
      Offset(-r * .28, -r * .28),
      Offset(size.width + r * .28, -r * .28),
      Offset(-r * .28, size.height + r * .28),
      Offset(size.width + r * .28, size.height + r * .28),
    ];

    for (final center in centers) {
      final rect = Rect.fromCircle(center: center, radius: r);
      final halo = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 20 + activity * 12
        ..color = const Color(0xFFF3387A).withOpacity(.08 + activity * .08)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 24);
      final edge = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.2 + activity * 1.4
        ..shader = const SweepGradient(
          colors: [
            Color(0x00F3387A),
            Color(0xFFFF2F92),
            Color(0xFFFF7DB2),
            Color(0xFFF3387A),
            Color(0x00F3387A),
          ],
        ).createShader(rect)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.5);

      canvas.drawCircle(center, r, halo);
      canvas.drawCircle(center, r, edge);
    }
  }

  @override
  bool shouldRepaint(_ArborGlowPainter oldDelegate) =>
      oldDelegate.state != state ||
      oldDelegate.activity != activity ||
      oldDelegate.phase != phase;
}
