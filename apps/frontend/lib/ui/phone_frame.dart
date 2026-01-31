import 'dart:ui';
import 'package:flutter/material.dart';

class PhoneFrame extends StatelessWidget {
  final Widget child;
  const PhoneFrame({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    // iPhone-ish size; tweak later if you want
    const double w = 390;
    const double h = 844;

    return Scaffold(
      backgroundColor: const Color(0xFF06020A),
      body: Center(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(26),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 0, sigmaY: 0),
            child: Container(
              width: w,
              height: h,
              decoration: BoxDecoration(
                color: const Color(0xFF0E0316),
                borderRadius: BorderRadius.circular(26),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                boxShadow: [
                  BoxShadow(
                    blurRadius: 40,
                    spreadRadius: 6,
                    color: Colors.black.withOpacity(0.65),
                  ),
                ],
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
