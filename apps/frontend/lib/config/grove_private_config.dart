/// Private Grove installation must never silently inherit the Firefly or
/// public Arbor alpha identity provider just because an APK was built.
///
/// Grove Supabase is an independently provisioned, invite-only authentication
/// project. Its HTTPS API must explicitly validate Grove JWTs, enforce the
/// invited owner identity and expose only consented owner-scoped ARK reads.
/// This is a *configuration guard*, not a backend access-control substitute.
class GrovePrivateConfig {
  const GrovePrivateConfig({
    required this.authUrl,
    required this.publishableKey,
    required this.apiUrl,
  });

  final String authUrl;
  final String publishableKey;
  final String apiUrl;

  static const fromBuild = GrovePrivateConfig(
    authUrl: String.fromEnvironment('GROVE_SUPABASE_URL'),
    publishableKey: String.fromEnvironment('GROVE_SUPABASE_ANON_KEY'),
    apiUrl: String.fromEnvironment('GROVE_API_URL'),
  );

  // Do not reuse any previous user, project or ARK-preview auth realm.
  static const Set<String> reservedAuthHosts = {
    'ncpdlyakrzfvobmwzbon.supabase.co', // existing private Firefly
    'tzbpjbhroxiqftqwatnb.supabase.co', // ARK preview
    'dqvrzgrmorzfjddyozqz.supabase.co', // archived project
  };

  static const Set<String> reservedApiHosts = {
    'firefly-coral.vercel.app', // existing Firefly API
  };

  bool get ready {
    final auth = Uri.tryParse(authUrl.trim());
    final api = Uri.tryParse(apiUrl.trim());
    if (auth == null || api == null) return false;
    return auth.scheme == 'https' &&
        api.scheme == 'https' &&
        auth.userInfo.isEmpty &&
        api.userInfo.isEmpty &&
        auth.host.isNotEmpty &&
        api.host.isNotEmpty &&
        auth.path.isEmpty &&
        api.path.isEmpty &&
        auth.query.isEmpty &&
        api.query.isEmpty &&
        auth.fragment.isEmpty &&
        api.fragment.isEmpty &&
        !reservedAuthHosts.contains(auth.host.toLowerCase()) &&
        !reservedApiHosts.contains(api.host.toLowerCase()) &&
        publishableKey.trim().isNotEmpty &&
        !publishableKey.contains('placeholder');
  }
}
