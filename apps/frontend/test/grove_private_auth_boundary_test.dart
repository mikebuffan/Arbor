import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/config/grove_private_config.dart';
import 'package:frontend/config/grove_private_session.dart';
import 'package:frontend/pages/grove_private_access_page.dart';

void main() {
  const privateRealm = GrovePrivateConfig(
    authUrl: 'https://grove-invite-only.supabase.co',
    publishableKey: 'sb_publishable_test-value',
    apiUrl: 'https://grove-private.example.org',
  );


  String tokenFor(String issuer, {int expires = 1900000000}) {
    final payload = base64Url.encode(utf8.encode(jsonEncode({
      'iss': issuer,
      'sub': 'synthetic-owner',
      'exp': expires,
    })));
    return 'synthetic.' + payload + '.not-a-real-signature';
  }

  test('old Firefly session cannot unlock an upgraded private Grove', () {
    final privateToken = tokenFor(
      'https://grove-invite-only.supabase.co/auth/v1',
    );
    final fireflyToken = tokenFor(
      'https://ncpdlyakrzfvobmwzbon.supabase.co/auth/v1',
    );
    const groveAuth = 'https://grove-invite-only.supabase.co';
    final knownNow = DateTime.utc(2026, 9, 21);
    expect(GrovePrivateSession.belongsToRealm(
      token: privateToken,
      authUrl: groveAuth,
      now: knownNow,
    ), isTrue);
    expect(GrovePrivateSession.belongsToRealm(
      token: fireflyToken,
      authUrl: groveAuth,
      now: knownNow,
    ), isFalse);
    expect(GrovePrivateSession.belongsToRealm(
      token: tokenFor('https://grove-invite-only.supabase.co/auth/v1',
          expires: 1600000000),
      authUrl: groveAuth,
      now: knownNow,
    ), isFalse);
    expect(GrovePrivateSession.belongsToRealm(
      token: 'garbage',
      authUrl: groveAuth,
      now: knownNow,
    ), isFalse);
  });

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
  test('grant must match the exact signed-in owner', () {
    expect(grovePrivateOwnerGrantMatches(
      grant: {'user_id': 'synthetic-owner', 'revoked_at': null},
      userId: 'synthetic-owner',
    ), isTrue);
    expect(grovePrivateOwnerGrantMatches(
      grant: {'user_id': 'another-owner', 'revoked_at': null},
      userId: 'synthetic-owner',
    ), isFalse);
  });

  test('missing Grove grant never authorizes an otherwise valid JWT', () {
    expect(grovePrivateOwnerGrantMatches(
      grant: null,
      userId: 'synthetic-owner',
    ), isFalse);
  });

  test('revoked Grove invitation cannot open the house', () {
    expect(grovePrivateOwnerGrantMatches(
      grant: {'user_id': 'synthetic-owner',
          'revoked_at': '2026-09-22T01:00:00Z'},
      userId: 'synthetic-owner',
    ), isFalse);
  });

  test('malformed grant without an owner identifier denies access', () {
    expect(grovePrivateOwnerGrantMatches(
      grant: {'revoked_at': null},
      userId: 'synthetic-owner',
    ), isFalse);
  });
}
