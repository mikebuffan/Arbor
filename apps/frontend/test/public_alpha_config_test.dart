import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/public/public_alpha_config.dart';

void main() {
  const alphaAuth = 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
  const alphaApi = 'https://arbor-public-alpha.example.org';
  const publishable = 'sb_publishable_synthetic_test';

  bool ready({
    String authUrl = alphaAuth,
    String key = publishable,
    String apiUrl = alphaApi,
  }) => PublicAlphaConfig.ready(
    authUrl: authUrl, publishableKey: key, apiUrl: apiUrl,
  );

  test('independently configured public alpha passes the local guard', () {
    expect(ready(), isTrue);
    expect(ready(authUrl: '$alphaAuth/'), isTrue);
  });

  test('all known private providers fail, even with URL variants', () {
    for (final host in PublicAlphaConfig.protectedAuthHosts) {
      expect(ready(authUrl: 'https://$host'), isFalse, reason: host);
      expect(ready(authUrl: 'https://$host/'), isFalse, reason: host);
      expect(ready(authUrl: 'https://$host:443'), isFalse, reason: host);
    }
  });

  test('old Firefly and private Grove API origins cannot host public app', () {
    for (final host in PublicAlphaConfig.protectedApiHosts) {
      expect(ready(apiUrl: 'https://$host'), isFalse, reason: host);
      expect(ready(apiUrl: 'https://$host/'), isFalse, reason: host);
    }
  });

  test('provider and API require plain HTTPS origins without path tricks', () {
    for (final auth in [
      '', 'http://aaaaaaaaaaaaaaaaaaaa.supabase.co',
      'https://aaaaaaaaaaaaaaaaaaaa.supabase.co/auth',
      'https://aaaaaaaaaaaaaaaaaaaa.supabase.co/?x=1',
      'https://user:pass@aaaaaaaaaaaaaaaaaaaa.supabase.co',
      'https://aaaaaaaaaaaaaaaaaaaa.supabase.co:8443',
      'https://not-a-supabase.example.org',
    ]) {
      expect(ready(authUrl: auth), isFalse, reason: auth);
    }
    for (final api in [
      '', 'http://arbor-public-alpha.example.org',
      'https://arbor-public-alpha.example.org/api/chat',
      'https://arbor-public-alpha.example.org/?x=1',
      'https://user:pass@arbor-public-alpha.example.org',
    ]) {
      expect(ready(apiUrl: api), isFalse, reason: api);
    }
  });

  test('no missing, placeholder or server-only credential in public build', () {
    for (final key in ['', 'placeholder-key', 'sb_secret_synthetic']) {
      expect(ready(key: key), isFalse, reason: key);
    }
  });
}
