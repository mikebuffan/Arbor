import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// Keeps Grove workspace cards inside the available portrait width without
/// preventing their preferred two-column layout on larger screens.
class GrovePanel {
  const GrovePanel({required this.preferredWidth, required this.child});

  final double preferredWidth;
  final Widget child;
}

class GroveResponsiveWrap extends StatelessWidget {
  const GroveResponsiveWrap({
    super.key,
    required this.panels,
    this.spacing = 16,
    this.runSpacing = 16,
  });

  final List<GrovePanel> panels;
  final double spacing;
  final double runSpacing;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          return Wrap(
            spacing: spacing,
            runSpacing: runSpacing,
            children: [
              for (final panel in panels)
                SizedBox(
                  width: width.isFinite
                      ? math.min(width, panel.preferredWidth)
                      : panel.preferredWidth,
                  child: panel.child,
                ),
            ],
          );
        },
      );
}
