import 'package:flutter/material.dart';

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
  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0E0316),
      child: Stack(
        children: [
          const _CornerGlows(),

          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              _ArborTitle(),
              SizedBox(height: 12),
              _CenterFlare(),
            ],
          ),

          const Positioned(
            left: 24,
            top: 0,
            bottom: 0,
            child: _LeftMenu(),
          ),

          const Positioned(
            right: 24,
            top: 0,
            bottom: 0,
            child: _RightMenu(),
          ),
        ],
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

class _CornerGlows extends StatelessWidget {
  const _CornerGlows();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        _glow(-120, -120),
        _glow(null, -120, right: -120),
        _glow(-120, null, bottom: -120),
        _glow(null, null, right: -120, bottom: -120),
      ],
    );
  }

  Widget _glow(double? left, double? top,
      {double? right, double? bottom}) {
    return Positioned(
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      child: Container(
        width: 300,
        height: 300,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              const Color(0xFFF3387A).withOpacity(0.6),
              const Color(0xFFF3387A).withOpacity(0.1),
              Colors.transparent,
            ],
            stops: const [0.2, 0.6, 1.0],
          ),
        ),
      ),
    );
  }
}

class _ArborTitle extends StatelessWidget {
  const _ArborTitle();

  @override
  Widget build(BuildContext context) {
    return Text(
      "ARBOR",
      style: TextStyle(
        color: const Color(0xFFE9E9EE),
        fontSize: 32,
        letterSpacing: 6,
        fontWeight: FontWeight.w300,
      ),
    );
  }
}

class _CenterFlare extends StatelessWidget {
  const _CenterFlare();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 2,
      width: 160,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.transparent,
            const Color(0xFFF3387A),
            Colors.transparent,
          ],
        ),
      ),
    );
  }
}

class _GlassButton extends StatelessWidget {
  final String label;

  const _GlassButton(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: Colors.white.withOpacity(0.12),
        ),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white70,
          fontSize: 14,
        ),
      ),
    );
  }
} 

class _LeftMenu extends StatelessWidget {
  const _LeftMenu();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
        _GlassButton("Bored"),
        _GlassButton("Focus"),
        _GlassButton("Reset"),
        _GlassButton("Challenge"),
        _GlassButton("Criminology"),
      ],
    );
  }
}

class _RightMenu extends StatelessWidget {
  const _RightMenu();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: const [
        _GlassButton("Help"),
        _GlassButton("Notes"),
        _GlassButton("History"),
        _GlassButton("Reports"),
        _GlassButton("Settings"),
      ],
    );
  }
}