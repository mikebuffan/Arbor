import 'dart:ui';
import 'package:flutter/material.dart';
import 'environment_tokens.dart';

class EnvironmentPanel extends StatelessWidget {
  const EnvironmentPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(ArborEnvironmentTokens.radiusMedium),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: ArborEnvironmentTokens.glass,
            borderRadius: BorderRadius.circular(ArborEnvironmentTokens.radiusMedium),
            border: Border.all(color: Colors.white.withValues(alpha: 0.09)),
          ),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}
