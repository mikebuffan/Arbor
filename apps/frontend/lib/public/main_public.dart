import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'public_app.dart';
import 'public_alpha_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const publishableKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  const apiUrl = String.fromEnvironment('ARBOR_PUBLIC_API_URL');

  // The backend has its own separate guard. Check the APK configuration
  // too, before Supabase initialization or any network client is constructed.
  if (!PublicAlphaConfig.ready(
    authUrl: supabaseUrl,
    publishableKey: publishableKey,
    apiUrl: apiUrl,
  )) {
    runApp(const MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Public Arbor alpha is not configured. Use the separate '
                'alpha Supabase URL, publishable key and HTTPS API origin.',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      ),
    ));
    return;
  }
  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: publishableKey,
  );
  runApp(PublicArborApp(apiUrl: apiUrl));
}
