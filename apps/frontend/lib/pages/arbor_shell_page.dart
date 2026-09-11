import 'package:flutter/material.dart';

import '../widgets/arbor_visual.dart';
import 'chat_test_page.dart';
import 'voice_page.dart';

enum _ArborSurface {
  text,
  voice,
}

class ArborShellPage extends StatefulWidget {
  const ArborShellPage({
    super.key,
    this.chatLayer,
    this.voiceLayer,
  });

  final Widget? chatLayer;
  final Widget? voiceLayer;

  @override
  State<ArborShellPage> createState() => _ArborShellPageState();
}

class _ArborShellPageState extends State<ArborShellPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  double _position = 0.0;
  _ArborSurface _surface = _ArborSurface.text;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
      value: 0.0,
    )..addListener(() {
        setState(() => _position = _controller.value);
      });
  }

  void _openSurface(_ArborSurface surface) {
    setState(() => _surface = surface);
    _controller.forward();
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
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: const Color(0xFF0E0316),
      body: GestureDetector(
        onVerticalDragUpdate: (d) => _onDragUpdate(d, height),
        onVerticalDragEnd: _onDragEnd,
        child: Stack(
          children: [
            _ConversationLayer(
              surface: _surface,
              chatLayer: widget.chatLayer,
              voiceLayer: widget.voiceLayer,
            ),
            Transform.translate(
              offset: Offset(0, -_position * height),
              child: _HomeLayer(
                onText: () => _openSurface(_ArborSurface.text),
                onVoice: () => _openSurface(_ArborSurface.voice),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeLayer extends StatelessWidget {
  const _HomeLayer({
    required this.onText,
    required this.onVoice,
  });

  final VoidCallback onText;
  final VoidCallback onVoice;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(
          child: ArborVisual(state: ArborVisualState.idle),
        ),
        const Positioned(
          left: 24,
          top: 0,
          bottom: 0,
          child: _LeftMenu(),
        ),
        Positioned(
          right: 24,
          top: 0,
          bottom: 0,
          child: _RightMenu(
            onText: onText,
            onVoice: onVoice,
          ),
        ),
      ],
    );
  }
}

class _ConversationLayer extends StatelessWidget {
  const _ConversationLayer({
    required this.surface,
    this.chatLayer,
    this.voiceLayer,
  });

  final _ArborSurface surface;
  final Widget? chatLayer;
  final Widget? voiceLayer;

  @override
  Widget build(BuildContext context) {
    return IndexedStack(
      key: const ValueKey('arbor-surface-stack'),
      index: surface == _ArborSurface.text ? 0 : 1,
      children: [
        chatLayer ?? const ChatTestPage(),
        voiceLayer ?? const VoicePage(),
      ],
    );
  }
}

class _GlassButton extends StatelessWidget {
  const _GlassButton(
    this.label, {
    this.onTap,
  });

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(onTap == null ? 0.04 : 0.07),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: Colors.white.withOpacity(onTap == null ? 0.12 : 0.22),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: onTap == null ? Colors.white70 : Colors.white,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

class _LeftMenu extends StatelessWidget {
  const _LeftMenu();

  @override
  Widget build(BuildContext context) {
    return const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _GlassButton('Bored'),
        _GlassButton('Focus'),
        _GlassButton('Reset'),
        _GlassButton('Challenge'),
        _GlassButton('Criminology'),
      ],
    );
  }
}

class _RightMenu extends StatelessWidget {
  const _RightMenu({
    required this.onText,
    required this.onVoice,
  });

  final VoidCallback onText;
  final VoidCallback onVoice;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        _GlassButton('Text', onTap: onText),
        _GlassButton('Voice', onTap: onVoice),
        const _GlassButton('Help'),
        const _GlassButton('Notes'),
        const _GlassButton('History'),
        const _GlassButton('Reports'),
        const _GlassButton('Settings'),
      ],
    );
  }
}
