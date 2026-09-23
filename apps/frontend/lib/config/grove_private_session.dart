import 'dart:convert';

/// A previous Firefly token in Android storage cannot open the private
/// Grove after an APK is upgraded to an independently configured provider.
/// This UI check is NOT backend authorization: the Grove API must separately
/// verify signature, issuer, expiry, audience and owner/project grants.
class GrovePrivateSession {
  const GrovePrivateSession._();

  static bool belongsToRealm({
    required String? token,
    required String authUrl,
    DateTime? now,
  }) {
    if (token == null || token.isEmpty) return false;
    try {
      final parts = token.split('.');
      if (parts.length != 3) return false;
      final payload = jsonDecode(utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      ));
      if (payload is! Map<String, dynamic>) return false;
      final uri = Uri.tryParse(authUrl);
      if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
        return false;
      }
      final issuer = uri.origin + '/auth/v1';
      final sub = payload['sub'];
      final expires = payload['exp'];
      return payload['iss'] == issuer &&
          sub is String && sub.isNotEmpty &&
          expires is num &&
          expires.toInt() >
              (now ?? DateTime.now()).millisecondsSinceEpoch ~/ 1000;
    } catch (_) {
      return false;
    }
  }
}
