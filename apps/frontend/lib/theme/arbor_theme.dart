import 'dart:ui';
import 'package:flutter/material.dart';

class ArborTheme {
  static const bg = Color(0xFF0E0316);
  static const textGrey = Color(0xFF7A7F88);

  static const fuchsiaCore = Color(0xFFF3387A);
  static const fuchsiaMid = Color(0xFFCF2769);

  static const glassFill = Color.fromRGBO(255, 255, 255, 0.06);
  static const glassBorder = Color.fromRGBO(255, 255, 255, 0.10);
  static const glassRadius = 14.0;
  static const glassBlur = 14.0;

  static ThemeData theme() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bg,
      useMaterial3: true,
      textTheme: const TextTheme(
        bodyMedium: TextStyle(color: textGrey),
      ),
    );
  }
}

class ArborGlass extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final BorderRadius borderRadius;

  const ArborGlass({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
    this.borderRadius = const BorderRadius.all(
      Radius.circular(ArborTheme.glassRadius),
    ),
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: ArborTheme.glassBlur,
          sigmaY: ArborTheme.glassBlur,
        ),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: ArborTheme.glassFill,
            borderRadius: borderRadius,
            border: Border.all(color: ArborTheme.glassBorder, width: 1),
          ),
          child: child,
        ),
      ),
    );
  }
}
