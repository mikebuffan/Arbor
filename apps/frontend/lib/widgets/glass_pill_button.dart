import 'dart:ui';
import 'package:flutter/material.dart';

class GlassPillButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final double width;
  final double height;

  const GlassPillButton({
    super.key,
    required this.label,
    required this.onTap,
    this.width = 90,   // smaller like the mock
    this.height = 30,   // shorter like the mock
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8), // ✅ less pill, more mock-like
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: InkWell(
            onTap: onTap,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.white.withOpacity(0.08),
                    Colors.white.withOpacity(0.03),
                  ],
                ),
                border: Border.all(color: Colors.white.withOpacity(0.12)),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12), // ✅ tighter
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    label,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.82),
                      fontSize: 13.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
