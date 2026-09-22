import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/grove_private_config.dart';
import 'environment/environment_runtime_host.dart';
import 'environment/environment_theme.dart';
import 'environment/grove_app_mode.dart';
import 'pages/grove_private_access_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (groveStandalone) {
    // The Grove no longer inherits SUPABASE_URL / ARBOR_API_URL, which belong
    // to the original Firefly/Arbor app. Missing private realm = no login.
    const privateConfig = GrovePrivateConfig.fromBuild;
    if (!privateConfig.ready) {
      runApp(const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: GrovePrivateSetupPage(),
      ));
      return;
    }

    await Supabase.initialize(
      url: privateConfig.authUrl,
      anonKey: privateConfig.publishableKey,
    );
    runApp(const ArborApp(
      home: GrovePrivateAuthGate(
        child: EnvironmentRuntimeBootstrap(),
      ),
    ));
    return;
  }

  // Existing Arbor flavor remains unchanged; public-alpha is built through
  // its separate public/main_public.dart entrypoint and service boundary.
  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    throw Exception(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY. '
      'Run with --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...',
    );
  }
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const ArborApp());
}

class ArborApp extends StatelessWidget {
  const ArborApp({super.key, this.home});

  final Widget? home;

  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: groveStandalone ? 'The Grove' : 'Arbor Environment',
        theme: ArborEnvironmentTheme.theme(),
        home: home ?? const EnvironmentRuntimeBootstrap(),
      );
}
