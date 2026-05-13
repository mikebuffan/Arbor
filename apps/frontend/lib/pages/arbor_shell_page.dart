import 'dart:ui';
import 'package:flutter/material.dart';

const Color kBgOuter = Colors.black;
const Color kBgPanel = Color(0xFF0E0316);
const Color kBgPanelInner = Color(0xFF12051B);
const Color kWordmark = Color(0xFFB8BAC1);
const Color kPink = Color(0xFFF3387A);
const Color kPinkMid = Color(0xFFFF88D1);
const Color kPinkBright = Color(0xFFFFD6FF);
const Color kPinkSoft = Color(0x66F3387A);

class ArborShellPage extends StatefulWidget {
  const ArborShellPage({super.key});

  @override
  State<ArborShellPage> createState() => _ArborShellPageState();
}

class _ArborShellPageState extends State<ArborShellPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  // 1 = home, 0= chat
  double _position = 0.0;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
      value: 0.0,
    );

    _controller.addListener(() {
      setState(() {
        _position = _controller.value;
      });
    });
  }

  void _onDragUpdate(DragUpdateDetails details, double height) {
    final delta = details.primaryDelta! / height;
    _controller.value -= delta;
  }

  void _onDragEnd(DragEndDetails details) {
    if (_controller.value > 0.5) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onVerticalDragUpdate: (d) => _onDragUpdate(d, height),
        onVerticalDragEnd: _onDragEnd,
        child: Stack(
          children: [
            _ChatLayer(),
            Transform.translate(
              offset: Offset(0, (0 - _position) * height),
              child: _HomeLayer(),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeLayer extends StatelessWidget {
  const _HomeLayer();

  @override
  Widget build(BuildContext context) {
    final screenH = MediaQuery.of(context).size.height;

    return Container(
      color: kBgOuter,
      child: Center(
        child: Container(
          width: 580,
          height: screenH * 1,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: kBgPanel,
            borderRadius: BorderRadius.circular(34),
          ),
          child: Stack(
            children: [
              const Positioned.fill(child: _ArborBackground()),

              Positioned.fill(
                child: SafeArea(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: Stack(
                        children: [
                          Positioned(
                            top: 200,
                            left: 0,
                            right: 0,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                _ArborTitle(),
                                SizedBox(height: 18),
                                _CenterFlare(),
                              ],
                            ),
                          ),

                          const Positioned(
                            left: 20,
                            top: 215,
                            child: _LeftMenu(),
                          ),

                          const Positioned(
                            right: 20,
                            top: 215,
                            child: _RightMenu(),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChatLayer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF12051B),
      child: const Center(
        child: Text(
          "CHAT",
          style: TextStyle(color: Colors.white, fontSize: 24),
        ),
      ),
    );
  }
}

class _ArborBackground extends StatelessWidget {
  const _ArborBackground();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(color: kBgPanel),

        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 0.95,
                colors: [
                  const Color(0xFF220727).withValues(alpha: 0.16),
                  const Color(0xFF14051D).withValues(alpha: 0.08),
                  kBgPanel,
                ],
                stops: const [0.0, 0.48, 1.0],
              ),
            ),
          ),
        ),

        const Positioned(
          left: 0,
          top: 0,
          child: _ArcGlow(
            width: 190,
            height: 250,
            corner: _ArcCorner.topLeft,
          ),
        ),
        const Positioned(
          right: 0,
          top: 0,
          child: _ArcGlow(
            width: 190,
            height: 250,
            corner: _ArcCorner.topRight,
          ),
        ),
        const Positioned(
          left: 0,
          bottom: 5,
          child: _ArcGlow(
            width: 180,
            height: 290,
            corner: _ArcCorner.bottomLeft,
          ),
        ),
        const Positioned(
          right: 0,
          bottom: 5,
          child: _ArcGlow(
            width: 180,
            height: 290,
            corner: _ArcCorner.bottomRight,
          ),
        ),
      ],
    );
  }
}

enum _ArcCorner {
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}

class _ArcGlow extends StatelessWidget {
  final double width;
  final double height;
  final _ArcCorner corner;

  const _ArcGlow({
    required this.width,
    required this.height,
    required this.corner,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: CustomPaint(
        painter: _ArcGlowPainter(corner: corner),
      ),
    );
  }
}

class _ArcGlowPainter extends CustomPainter {
  final _ArcCorner corner;

  _ArcGlowPainter({required this.corner});

  @override
  void paint(Canvas canvas, Size size) {
    late Offset center;
    late double radius;
    late double startAngle;
    late double sweepAngle;

    switch (corner) {
      case _ArcCorner.topLeft:
        center = Offset(-size.width * 0.14, size.height * 0.22);
        radius = size.width * 0.72;
        startAngle = -1.15;
        sweepAngle = 2.30;
        break;

      case _ArcCorner.topRight:
        center = Offset(size.width * 1.14, size.height * 0.22);
        radius = size.width * 0.72;
        startAngle = 1.99;
        sweepAngle = 2.30;
        break;

      case _ArcCorner.bottomLeft:
        center = Offset(-size.width * 0.12, size.height * 0.80);
        radius = size.width * 0.78;
        startAngle = -0.96;
        sweepAngle = -2.06;
        break;

      case _ArcCorner.bottomRight:
        center = Offset(size.width * 1.12, size.height * 0.80);
        radius = size.width * 0.78;
        startAngle = 4.10;
        sweepAngle = -2.06;
        break;
    }

    final arcRect = Rect.fromCircle(center: center, radius: radius);
    final path = Path()..addArc(arcRect, startAngle, sweepAngle);

    // BODY GRADIENT ORIGIN — this replaces the need for a separate wash
    late Alignment bodyGlowOrigin;
    switch (corner) {
      case _ArcCorner.topLeft:
        bodyGlowOrigin = const Alignment(0.82, -0.08);
        break;
      case _ArcCorner.topRight:
        bodyGlowOrigin = const Alignment(-0.82, -0.08);
        break;
      case _ArcCorner.bottomLeft:
        bodyGlowOrigin = const Alignment(0.82, 0.08);
        break;
      case _ArcCorner.bottomRight:
        bodyGlowOrigin = const Alignment(-0.82, 0.08);
        break;
    }

    // 0) dark body FIRST, but with directional internal color bias
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = RadialGradient(
          center: bodyGlowOrigin,
          radius: 1.05,
          colors: [
            const Color(0xFF3A0A24), // brighter internal magenta-bias
            const Color(0xFF1A0714),
            const Color(0xFF06040A),
          ],
          stops: const [0.0, 0.54, 1.0],
        ).createShader(arcRect),
    );

    // 1) large outer bloom
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth =
            (corner == _ArcCorner.topLeft || corner == _ArcCorner.topRight) ? 42 : 46
        ..color = const Color(0xFFE94B8A).withValues(alpha: 0.22)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 36),
    );

    // 2) mid glow
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth =
            (corner == _ArcCorner.topLeft || corner == _ArcCorner.topRight) ? 16 : 18
        ..color = const Color(0xFFE94B8A).withValues(alpha: 0.46)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 13),
    );

    // 3) hot rim
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.8
        ..color = const Color(0xFFFFB7D2).withValues(alpha: 0.97),
    );
  }

  @override
  bool shouldRepaint(covariant _ArcGlowPainter oldDelegate) {
    return oldDelegate.corner != corner;
  }
}

class _CenterFlare extends StatelessWidget {
  const _CenterFlare();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 215,
      height: 46,
      child: CustomPaint(
        painter: _CenterFlarePainter(),
      ),
    );
  }
}

class _CenterFlarePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final lineRect = Rect.fromLTWH(0, size.height / 2 - 0.7, size.width, 1.4);

    final linePaint = Paint()
      ..shader = LinearGradient(
        colors: [
          Colors.transparent,
          kPink.withValues(alpha: 0.10),
          kPinkMid.withValues(alpha: 0.24),
          kPinkBright.withValues(alpha: 0.92),
          kPinkMid.withValues(alpha: 0.24),
          kPink.withValues(alpha: 0.10),
          Colors.transparent,
        ],
        stops: null,
      ).createShader(lineRect);

    canvas.drawRRect(
      RRect.fromRectAndRadius(lineRect, const Radius.circular(2)),
      linePaint,
    );

    final centerGlowRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: 28,
      height: 15,
    );

    final centerGlowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          kPinkBright.withValues(alpha: 0.95),
          kPinkMid.withValues(alpha: 0.95),
          kPinkMid.withValues(alpha: 0.45),
          kPink.withValues(alpha: 0.0),
        ],
        stops: null,
      ).createShader(centerGlowRect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);

    canvas.drawOval(centerGlowRect, centerGlowPaint);

    final horizontalBloomRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: 70,
      height: 10,
    );

    final horizontalBloomPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          kPink.withValues(alpha: 0.0),
          kPinkMid.withValues(alpha: 0.30),
          kPinkBright.withValues(alpha: 0.70),
          kPinkMid.withValues(alpha: 0.30),
          kPink.withValues(alpha: 0.0),
        ],
      ).createShader(horizontalBloomRect)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    canvas.drawRRect(
      RRect.fromRectAndRadius(horizontalBloomRect, const Radius.circular(99)),
      horizontalBloomPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ArborTitle extends StatelessWidget {
  const _ArborTitle();

  @override
  Widget build(BuildContext context) {
    return Text(
      "ARBOR",
      style: TextStyle(
        color: const Color(0xFFB6AFBB).withValues(alpha: 0.90),
        fontSize: 30,
        letterSpacing: 7.2,
        fontWeight: FontWeight.w500,
        height: 0.80,
      ),
    );
  }
}

class _GlassButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;

  const _GlassButton(this.label, {this.onTap});

  @override
  Widget build(BuildContext context) {
    final button = ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 2.0, sigmaY: 2.0),
        child: Container(
          width: 112,
          height: 36,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.centerLeft,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.020),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.16),
              width: 0.95,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.left,
            style: TextStyle(
              color: const Color(0xFFD8D4DB).withValues(alpha: 0.88),
              fontSize: 14.8,
              fontWeight: FontWeight.w400,
              height: 1.0,
            ),
          ),
        ),
      ),
    );

    if (onTap == null) return button;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: button,
      ),
    );
  }
}

class _LeftMenu extends StatelessWidget {
  const _LeftMenu();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        _GlassButton("Bored"),
        SizedBox(height: 7),
        _GlassButton("Focus"),
        SizedBox(height: 7),
        _GlassButton("Reset"),
        SizedBox(height: 7),
        _GlassButton("Challenge"),
        SizedBox(height: 7),
        _GlassButton("Criminology"),
      ],
    );
  }
}

class _RightMenu extends StatelessWidget {
  const _RightMenu();

  void _openSettings(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF12051B),
      barrierColor: Colors.black.withValues(alpha: 0.72),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return const _SettingsSheet();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const _GlassButton("Help"),
        const SizedBox(height: 7),
        const _GlassButton("Notes"),
        const SizedBox(height: 7),
        const _GlassButton("History"),
        const SizedBox(height: 7),
        const _GlassButton("Reports"),
        const SizedBox(height: 7),
        _GlassButton("Settings", onTap: () => _openSettings(context)),
      ],
    );
  }
}

class _SettingsSheet extends StatelessWidget {
  const _SettingsSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 14, 22, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.22),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    "Settings",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: "Close",
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, color: Colors.white70),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              "Beta controls live here. These are local placeholders until persistent settings are wired.",
              style: TextStyle(color: Colors.white60, fontSize: 13, height: 1.35),
            ),
            const SizedBox(height: 18),
            const _SettingsTile(
              icon: Icons.palette_outlined,
              title: "Appearance",
              subtitle: "Theme and color scheme controls planned.",
            ),
            const _SettingsTile(
              icon: Icons.memory_outlined,
              title: "Memory & proof",
              subtitle: "Memory viewer, corrections, and debug proof surfaces planned.",
            ),
            const _SettingsTile(
              icon: Icons.attach_file,
              title: "Attachments",
              subtitle: "Image and file upload wiring planned after backend review.",
            ),
            const _SettingsTile(
              icon: Icons.privacy_tip_outlined,
              title: "Privacy",
              subtitle: "User memory should remain scoped, editable, and never committed as secrets.",
            ),
            const SizedBox(height: 12),
            Text(
              "Arbor beta • build placeholder",
              textAlign: TextAlign.center,
              style: TextStyle(
                color: const Color(0xFFFF88D1).withValues(alpha: 0.72),
                fontSize: 12,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.035),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.10),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFFF88D1), size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Colors.white60,
                    fontSize: 12.2,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TestRingPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(-size.width * 0.20, size.height * 0.22);
    final radius = size.width * 0.70;

    // Dark body
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = RadialGradient(
          colors: [
            const Color(0xFF2A001A),
            const Color(0xFF13000E),
            const Color(0xFF06040A),
          ],
          stops: const [0.0, 0.72, 1.0],
        ).createShader(Rect.fromCircle(center: center, radius: radius)),
    );

    final rect = Rect.fromCircle(center: center, radius: radius);
    final path = Path()..addArc(rect, -1.15, 2.30);

    // Bloom
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 44
        ..color = const Color(0xFFFF3B86).withValues(alpha:.16)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 34),
    );

    // Glow
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 18
        ..color = const Color(0xFFFF3B86).withValues(alpha:.42)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );

    // Hot edge
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = const Color(0xFFFFA3C8),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

