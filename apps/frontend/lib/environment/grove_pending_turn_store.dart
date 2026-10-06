import 'dart:convert';

import '../api/device_string_store.dart';

class GrovePendingTurn {
  const GrovePendingTurn({required this.text, this.requestId});
  final String text;
  /// Null is an unsent draft. Non-null freezes an uncertain send's text.
  final String? requestId;
}

/// Opt-in device-local draft. No transcript engine, sync, tokens, model reply,
/// memory ingestion or execution state. Existing preferences are NOT encrypted.
/// Retain until verified completion or explicit erase, with no expiry/replay.
class GrovePendingTurnStore {
  GrovePendingTurnStore({required this.userId, required this.projectId,
    required this.apiOrigin, required this.authOrigin,
    DeviceStringStore? storage})
      : _storage = storage ?? const PreferencesStringStore();

  final String userId;
  final String projectId;
  final String apiOrigin;
  final String authOrigin;
  final DeviceStringStore _storage;
  // Panels sharing a physical store serialize, including disposed/remounted
  // panels. An unrelated store must not inherit another store's pending work.
  static final _queues = Expando<_PendingTurnQueue>();
  static final _uuid = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );

  String _key(String id) => 'grove.pending.v1.' + base64Url.encode(utf8.encode(
    jsonEncode([authOrigin, apiOrigin, userId, projectId, id]),
  ));

  Future<T> _serial<T>(Future<T> Function() operation) {
    final queue = _queues[_storage] ??= _PendingTurnQueue();
    return queue.run(operation);
  }

  void _validate(String id, GrovePendingTurn? turn) {
    if (!_uuid.hasMatch(userId) || !_uuid.hasMatch(projectId) || !_uuid.hasMatch(id) ||
        Uri.tryParse(apiOrigin)?.scheme != 'https' ||
        Uri.tryParse(authOrigin)?.scheme != 'https' ||
        (turn != null && (turn.text.length > 3000 ||
          (turn.requestId != null &&
            (!_uuid.hasMatch(turn.requestId!) || turn.text.trim().isEmpty))))) {
      throw const FormatException('Private Grove draft is invalid');
    }
  }

  Future<GrovePendingTurn?> load(String id) => _serial(() => _read(id));

  Future<GrovePendingTurn?> _read(String id) async {
    _validate(id, null);
    final raw = await _storage.read(_key(id));
    if (raw == null || raw.isEmpty) return null;
    if (raw.length > 32768) throw const FormatException('Saved draft is too large');
    final record = jsonDecode(raw);
    if (record is! Map || record['version'] != 1 ||
        record['userId'] != userId || record['projectId'] != projectId ||
        record['conversationId'] != id || record['apiOrigin'] != apiOrigin ||
        record['authOrigin'] != authOrigin || record['enabled'] != true ||
        record['text'] is! String ||
        (record['requestId'] != null && record['requestId'] is! String)) {
      throw const FormatException('Saved private draft cannot be recovered');
    }
    final turn = GrovePendingTurn(text: record['text'] as String,
      requestId: record['requestId'] as String?);
    _validate(id, turn);
    return turn;
  }

  Future<void> save(String id, GrovePendingTurn turn,
      {String? completedRequestId}) => _serial(() async {
    _validate(id, turn);
    final previous = await _read(id);
    if (previous != null && previous.requestId != null &&
        !(previous.requestId == turn.requestId && previous.text == turn.text) &&
        !(completedRequestId == previous.requestId &&
          turn.requestId == null && turn.text.isEmpty)) {
      throw StateError('An uncertain Grove send must keep its original retry identity');
    }
    if (!await _storage.write(_key(id), jsonEncode({
      'version': 1, 'enabled': true, 'userId': userId,
      'projectId': projectId, 'conversationId': id,
      'apiOrigin': apiOrigin, 'authOrigin': authOrigin,
      'text': turn.text, 'requestId': turn.requestId,
    }))) throw StateError('Private draft was not saved on this device');
  });

  Future<void> erase(String id) => _serial(() async {
    _validate(id, null);
    // Clear in one write; on failure the retry identity stays recoverable.
    if (!await _storage.write(_key(id), '')) {
      throw StateError('Private draft could not be erased');
    }
  });
}

class _PendingTurnQueue {
  Future<void>? _tail;

  Future<T> run<T>(Future<T> Function() operation) {
    final next = _tail == null ? operation() : _tail!.then((_) => operation());
    _tail = next.then<void>((_) {}, onError: (Object _, StackTrace __) {});
    return next;
  }
}
