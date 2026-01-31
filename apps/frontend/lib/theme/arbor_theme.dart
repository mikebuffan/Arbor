import 'package:flutter/material.dart';

class ArborTheme {
  static ThemeData theme() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0E0316),
      fontFamily: null,
      useMaterial3: true,
      colorScheme: const ColorScheme.dark(
        surface: Color(0xFF0E0316),
        primary: Color(0xFFF3387A),
      ),
    );
  }
}
