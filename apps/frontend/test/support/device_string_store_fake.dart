import 'package:frontend/api/device_string_store.dart';

class FakeDeviceStringStore implements DeviceStringStore {
  final Map<String, String> values = {};
  int writes = 0;
  bool failWrites = false;
  Future<void>? pauseWrite;

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<bool> write(String key, String value) async {
    writes++;
    if (pauseWrite != null) await pauseWrite;
    if (failWrites) return false;
    values[key] = value;
    return true;
  }
}
