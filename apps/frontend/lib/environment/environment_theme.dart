import 'package:flutter/material.dart';
import 'environment_tokens.dart';

abstract final class ArborEnvironmentTheme {
  static ThemeData theme() {
    final scheme = ColorScheme.fromSeed(
      seedColor: ArborEnvironmentTokens.teal,
      brightness: Brightness.dark,
      surface: ArborEnvironmentTokens.midnight,
    );
    return ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      scaffoldBackgroundColor: ArborEnvironmentTokens.voidBlack,
      colorScheme: scheme.copyWith(
        primary: ArborEnvironmentTokens.cyan,
        secondary: ArborEnvironmentTokens.violet,
        tertiary: ArborEnvironmentTokens.firefly,
        error: ArborEnvironmentTokens.danger,
        surface: ArborEnvironmentTokens.midnight,
      ),
      navigationRailTheme: const NavigationRailThemeData(
        indicatorColor: ArborEnvironmentTokens.deepForest,
        selectedIconTheme: IconThemeData(color: ArborEnvironmentTokens.cyan),
        selectedLabelTextStyle: TextStyle(color: ArborEnvironmentTokens.textPrimary),
        unselectedIconTheme: IconThemeData(color: ArborEnvironmentTokens.textMuted),
        unselectedLabelTextStyle: TextStyle(color: ArborEnvironmentTokens.textMuted),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: ArborEnvironmentTokens.midnight,
        indicatorColor: ArborEnvironmentTokens.deepForest,
      ),
      focusColor: ArborEnvironmentTokens.cyan,
    );
  }
}
