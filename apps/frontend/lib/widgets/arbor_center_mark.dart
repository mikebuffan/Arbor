import 'package:flutter/material.dart';

class ArborCenterMark extends StatelessWidget {
  const ArborCenterMark({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          "ARBOR",
          style: TextStyle(
            color: const Color(0xFF7A7F88).withOpacity(0.95),
            fontSize: 36,
            letterSpacing: 6,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 14),
        Container(
          height: 2,
          width: 220,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(99),
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                const Color(0xFFF3387A).withOpacity(0.85),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ],
    );
  }
}
