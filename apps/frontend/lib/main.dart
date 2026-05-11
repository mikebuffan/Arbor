import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'pages/arbor_shell_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    throw Exception(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY. '
      'Run with --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...',
    );
  }

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );

  runApp(const ArborApp());
}

class ArborApp extends StatelessWidget {
  const ArborApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Arbor',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF3387A),
          brightness: Brightness.dark,
        ),
      ),
      home: const ArborShellPage(),
    );
  }
}
