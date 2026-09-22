import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'public_app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const publishableKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  const apiUrl = String.fromEnvironment('ARBOR_PUBLIC_API_URL');

  // Prevent an accidental alpha build that authenticates against the Grove's
  // existing Firefly or ARK Preview installations.
  const protectedUrls = <String>{
    'https://ncpdlyakrzfvobmwzbon.supabase.co',
    'https://tzbpjbhroxiqftqwatnb.supabase.co',
    'https://dqvrzgrmorzfjddyozqz.supabase.co',
  };
  final authUri = Uri.tryParse(supabaseUrl);
  final apiUri = Uri.tryParse(apiUrl);
  if (supabaseUrl.isEmpty ||
      protectedUrls.contains(supabaseUrl) ||
      authUri?.scheme != 'https' ||
      publishableKey.isEmpty ||
      apiUri?.scheme != 'https') {
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
