import 'package:flutter/material.dart';

// Minimal shell. See firefly_code_v5_dump.dart for the full UI + logic blocks.

void main() {
  runApp(const ArborApp());
}

class ArborApp extends StatelessWidget {
  const ArborApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Arbor',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
      home: const Scaffold(
        body: Center(
          child: Text('Arbor', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
        ),
      ),
    );
  }
}
