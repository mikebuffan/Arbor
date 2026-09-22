import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/config/grove_private_config.dart';
import 'package:frontend/pages/grove_private_access_page.dart';

void main() {
  const privateRealm = GrovePrivateConfig(
    authUrl: 'https://grove-invite-only.supabase.co',
    publishableKey: 'sb_publishable_test-value',
    apiUrl: 'https://grove-private.example.org',
  );

  test('private Grove realm requires complete HTTPS independent endpoints', () {
    expect(privateRealm.ready, isTrue);
    expect(const GrovePrivateConfig(
      authUrl: '',
      publishableKey: '',
      apiUrl: '',
    ).ready, isFalse);
    expect(const GrovePrivateConfig(
      authUrl: 'http://grove-invite-only.supabase.co',
      publishableKey: 'safe-publishable-key',
      apiUrl: 'https://grove-private.example.org',
    ).ready, isFalse);
    expect(const GrovePrivateConfig(
      authUrl: 'https://grove-invite-only.supabase.co',
      publishableKey: 'safe-publishable-key',
      apiUrl: 'http://localhost:3000',
    ).ready, isFalse);
  });

  test('private Grove refuses existing Firefly and ARK-preview auth realms', () {
    for (final host in GrovePrivateConfig.reservedAuthHosts) {
      expect(GrovePrivateConfig(
        authUrl: 'https://$host',
        publishableKey: privateRealm.publishableKey,
        apiUrl: privateRealm.apiUrl,
      ).ready, isFalse, reason: host);
    }
    expect(const GrovePrivateConfig(
      authUrl: 'https://grove-invite-only.supabase.co',
      publishableKey: 'safe-publishable-key',
      apiUrl: 'https://firefly-coral.vercel.app',
    ).ready, isFalse);
  });

  test('private Grove rejects URL credentials, fake keys and API path tricks', () {
    expect(const GrovePrivateConfig(
      authUrl: 'https://user:pass@grove-invite-only.supabase.co',
      publishableKey: 'safe-publishable-key',
      apiUrl: 'https://grove-private.example.org',
    ).ready, isFalse);
    expect(const GrovePrivateConfig(
      authUrl: 'https://grove-invite-only.supabase.co',
      publishableKey: 'placeholder-test',
      apiUrl: 'https://grove-private.example.org',
    ).ready, isFalse);
    expect(const GrovePrivateConfig(
      authUrl: 'https://grove-invite-only.supabase.co',
      publishableKey: 'safe-publishable-key',
      apiUrl: 'https://grove-private.example.org/firefly',
    ).ready, isFalse);
  });

  testWidgets('unprovisioned Grove shows clear setup instead of false sign-in',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: GrovePrivateSetupPage(),
    ));
    expect(find.text('THE GROVE'), findsOneWidget);
    expect(find.text('Your private house is being connected.'),
        findsOneWidget);
    expect(find.textContaining('not configured in this build yet'),
        findsOneWidget);
    expect(find.textContaining('No password or account action is required'),
        findsOneWidget);
    expect(find.text('Signed in'), findsNothing);
  });
}
