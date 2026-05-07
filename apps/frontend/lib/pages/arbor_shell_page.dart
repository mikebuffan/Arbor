import 'dart:ui';
import 'package:flutter/material.dart';

class ArborHomeScreen extends StatelessWidget {
  const ArborHomeScreen({super.key});

  static const Color bgTop = Color(0xFF07030D);
  static const Color bgBottom = Color(0xFF120015);

  static const Color hotPink = Color(0xFFF3387A);
  static const Color midPink = Color(0xFFCF2769);
  static const Color softPurple = Color(0xFF4B114D);
  static const Color buttonBorder = Color(0x33CFA7D8);
  static const Color buttonFill = Color(0x12000000);
  static const Color textGray = Color(0xFFB9AFBF);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgTop,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final size = Size(constraints.maxWidth, constraints.maxHeight);

          return Stack(
            children: [
              // 1) Base background
              Positioned.fill(
                child: Image.asset(
                  'assets/images/arbor_bg.png',
                  fit: BoxFit.cover,
                ),
              ),

              // 2) Left buttons
              Positioned(
                left: 5,
                top: size.height * 0.4,
                child: _MenuColumn(
                  labels: const [
                    'Bored',
                    'Focus',
                    'Reset',
                    'Challenge',
                    'Criminology',
                  ],
                  alignment: CrossAxisAlignment.start,
                ),
              ),

              // 3) Right buttons
              Positioned(
                right: 5,
                top: size.height * 0.4,
                child: _MenuColumn(
                  labels: const [
                    'Help',
                    'Notes',
                    'History',
                    'Reports',
                    'Settings',
                  ],
                  alignment: CrossAxisAlignment.end,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MenuColumn extends StatelessWidget {
  final List<String> labels;
  final CrossAxisAlignment alignment;

  const _MenuColumn({
    required this.labels,
    required this.alignment,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: alignment,
      children: labels
          .map(
            (label) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: _MenuButton(label: label),
            ),
          )
          .toList(),
    );
  }
}

class _MenuButton extends StatelessWidget {
  final String label;

  const _MenuButton({required this.label});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 1.5, sigmaY: 1.5),
        child: Container(
          width: 94,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: ArborHomeScreen.buttonFill,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: ArborHomeScreen.buttonBorder,
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.18),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Text(
            label,
            style: TextStyle(
              color: ArborHomeScreen.textGray.withValues(alpha: 0.92),
              fontSize: 13,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}