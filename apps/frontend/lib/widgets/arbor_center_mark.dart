import 'package:flutter/material.dart';

class ArborCenterMark extends StatelessWidget {
  const ArborCenterMark({super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      "ARBOR",
      style: TextStyle(
        color: const Color(0xFF7A7F88).withOpacity(0.92),
        fontSize: 40,
        letterSpacing: 8,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}
