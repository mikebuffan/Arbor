/// Build-time guard for the standalone PUBLIC Arbor alpha.
///
/// A public APK must not authenticate against any private Firefly, ARK Preview,
/// or Grove provider. This is defense in depth: backend alphaAuth also rejects
/// private providers and enforces an invited, confirmed owner on each request.
class PublicAlphaConfig {
  const PublicAlphaConfig._();

  static const protectedAuthHosts = <String>{
    'ncpdlyakrzfvobmwzbon.supabase.co', // private Firefly
    'tzbpjbhroxiqftqwatnb.supabase.co', // ARK Preview
    'fqjqpuaoifgbweiguacf.supabase.co', // private Grove
    'dqvrzgrmorzfjddyozqz.supabase.co', // historical private realm
  };

  static const protectedApiHosts = <String>{
    'firefly-coral.vercel.app', // original Firefly backend
    'grove-private-api.vercel.app', // private Grove read broker
  };

  static bool ready({
    required String authUrl,
    required String publishableKey,
    required String apiUrl,
  }) {
    final auth = Uri.tryParse(authUrl.trim());
    final api = Uri.tryParse(apiUrl.trim());
    if (!_httpsRoot(auth) || !_httpsRoot(api)) return false;
    final authHost = auth!.host.toLowerCase();
    final apiHost = api!.host.toLowerCase();
    return RegExp(r'^[a-z0-9]{20}\.supabase\.co$').hasMatch(authHost) &&
        !protectedAuthHosts.contains(authHost) &&
        !protectedApiHosts.contains(apiHost) &&
        authHost != apiHost &&
        publishableKey.trim().isNotEmpty &&
        !publishableKey.contains('placeholder') &&
        !publishableKey.trim().startsWith('sb_secret_');
  }

  static bool _httpsRoot(Uri? uri) =>
      uri != null &&
      uri.scheme == 'https' &&
      uri.host.isNotEmpty &&
      uri.userInfo.isEmpty &&
      (uri.path.isEmpty || uri.path == '/') &&
      uri.query.isEmpty &&
      uri.fragment.isEmpty &&
      uri.port == 443;
}
