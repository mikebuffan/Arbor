import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'grove_world_state.dart';

/// Scoped to this device/app installation. No backend write, sync, worker, or
/// claim that ARK knows about the room. A future account-scoped sync requires
/// separate authorization and conflict handling.
enum GroveWorldLoadStatus { newHouse, restored, incompatible, damaged }

class GroveWorldLoad {
  const GroveWorldLoad(this.status, this.state);
  final GroveWorldLoadStatus status;
  /// Null means we MUST NOT overwrite stored bytes without explicit reset.
  final GroveWorldState? state;
}

class GroveWorldStore {
  GroveWorldStore({SharedPreferences? preferences})
      : _preferences = preferences;

  static const storageKey = 'grove_world_state_v1';
  final SharedPreferences? _preferences;

  Future<SharedPreferences> get _prefs async =>
      _preferences ?? SharedPreferences.getInstance();

  Future<GroveWorldLoad> load({DateTime Function()? now}) async {
    final prefs = await _prefs;
    final raw = prefs.getString(storageKey);
    if (raw == null) {
      return GroveWorldLoad(
        GroveWorldLoadStatus.newHouse,
        GroveWorldState.initial((now ?? DateTime.now)()),
      );
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map && decoded['schemaVersion'] !=
          GroveWorldState.schemaVersion) {
        return const GroveWorldLoad(GroveWorldLoadStatus.incompatible, null);
      }
      return GroveWorldLoad(GroveWorldLoadStatus.restored,
          GroveWorldState.fromJson(decoded));
    } on FormatException {
      return const GroveWorldLoad(GroveWorldLoadStatus.damaged, null);
    } on TypeError {
      return const GroveWorldLoad(GroveWorldLoadStatus.damaged, null);
    }
  }

  /// Compare-and-save protects against stale UI snapshots in one Flutter
  /// instance. SharedPreferences is NOT an atomic multi-process transaction.
  /// Keep a single writer until a backend transaction is deliberately added.
  Future<void> save(GroveWorldState next, {required int fromRevision}) async {
    if (next.revision != fromRevision + 1) {
      throw StateError('Grove event must advance exactly one revision');
    }
    final previous = await load();
    final current = previous.state;
    if (current == null || current.revision != fromRevision) {
      throw StateError('Grove state changed or cannot be read; not overwriting');
    }
    final prefs = await _prefs;
    final success = await prefs.setString(
      storageKey, jsonEncode(next.toJson()));
    if (!success) throw StateError('Grove state was not saved');
  }

  /// Destructive recovery is explicit; never silently reset unknown versions.
  Future<void> reset() async {
    if (!await (await _prefs).remove(storageKey)) {
      throw StateError('Grove state could not be reset');
    }
  }
}
