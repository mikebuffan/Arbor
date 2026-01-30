import 'package:flutter/material.dart';
import '../theme/arbor_theme.dart';

class ArborBackground extends StatelessWidget {
  final String assetPath;
  const ArborBackground({super.key, required this.assetPath});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: ArborTheme.bg,
      child: Image.asset(
        assetPath,
        fit: BoxFit.cover,
        alignment: Alignment.center,
      ),
    );
  }
}
