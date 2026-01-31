import 'package:flutter/material.dart';
import 'theme/arbor_theme.dart';
import 'ui/phone_frame.dart';
import 'pages/home_shell.dart';

void main() {
  runApp(const ArborApp());
}

class ArborApp extends StatelessWidget {
  const ArborApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ArborTheme.theme(),
      home: const Scaffold(
        body: PhoneFrame(
          child: HomeShell(),
        ),
      ),
    );
  }
}
