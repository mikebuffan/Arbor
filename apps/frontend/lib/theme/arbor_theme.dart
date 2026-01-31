import 'package:flutter/material.dart';

class ArborTheme {
  static ThemeData theme() {
    return ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xFF05010A),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFF3387A),
        surface: Color(0xFF0E0316),
      ),
    );
  }
}
