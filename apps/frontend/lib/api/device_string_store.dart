import 'package:shared_preferences/shared_preferences.dart';

/// Existing device preferences, behind a failure-injectable boundary.
/// A successful platform write is not an fsync or multi-process guarantee.
abstract class DeviceStringStore {
  Future<String?> read(String key);
  Future<bool> write(String key, String value);
}

class PreferencesStringStore implements DeviceStringStore {
  const PreferencesStringStore();

  @override
  Future<String?> read(String key) async =>
      (await SharedPreferences.getInstance()).getString(key);

  @override
  Future<bool> write(String key, String value) async =>
      (await SharedPreferences.getInstance()).setString(key, value);
}
