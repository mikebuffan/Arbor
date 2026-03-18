import 'package:flutter/material.dart';

class ArborShellPage extends StatefulWidget {
  const ArborShellPage({super.key});

  @override
  State<ArborShellPage> createState() => _ArborShellPageState();
}

class _ArborShellPageState extends State<ArborShellPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  // 0 = home, 1 = chat
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
            _HomeLayer(),

            Transform.translate(
              offset: Offset(0, (1 - _position) * height),
              child: _ChatLayer(),
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
      child: const Center(
        child: Text(
          "HOME",
          style: TextStyle(color: Colors.white, fontSize: 24),
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