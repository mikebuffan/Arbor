import 'dart:async';
import 'dart:convert';

import 'device_string_store.dart';

class ArborSessionContext {
  const ArborSessionContext({required this.projectId, this.conversationId});
  final String projectId;
  final String? conversationId;
}

class ArborSession {
  ArborSession({DeviceStringStore? storage})
      : _storage = storage ?? const PreferencesStringStore();

  static final ArborSession instance = ArborSession();
  final DeviceStringStore _storage;
  final Map<String, ArborSessionContext> _memory = {};
  final Set<String> _loadedUsers = {};
  final StreamController<String> _contextChanges =
      StreamController<String>.broadcast(sync: true);
  Future<void> _tail = Future<void>.value();

  Stream<String> get contextChanges => _contextChanges.stream;
  ArborSessionContext? peek(String userId) => _memory[userId];
  String _key(String userId) => 'arbor.session.$userId.context.v1';

  Future<T> _serial<T>(Future<T> Function() operation) {
    final next = _tail.then((_) => operation());
    _tail = next.then<void>((_) {}, onError: (Object _, StackTrace __) {});
    return next;
  }

  Future<ArborSessionContext?> contextFor(String userId) =>
      _serial(() => _load(userId));

  Future<ArborSessionContext?> _load(String userId) async {
    if (_loadedUsers.contains(userId)) return _memory[userId];
    final raw = await _storage.read(_key(userId));
    String? project;
    String? conversation;
    if (raw != null) {
      final record = jsonDecode(raw);
      if (record is! Map || record['version'] != 1 ||
          record['userId'] != userId ||
          (record['projectId'] != null && record['projectId'] is! String) ||
          (record['conversationId'] != null &&
              record['conversationId'] is! String)) {
        throw const FormatException('Stored Arbor scope is unavailable');
      }
      project = record['projectId'] as String?;
      conversation = record['conversationId'] as String?;
      if ((project != null && project.isEmpty) ||
          (conversation != null && conversation.isEmpty) ||
          (project == null && conversation != null)) {
        throw const FormatException('Stored Arbor scope is invalid');
      }
    } else {
      // Read old builds without rewriting storage on startup. An envelope,
      // including a cleared tombstone, always overrides legacy keys.
      project = await _storage.read('arbor.session.$userId.projectId');
      conversation = await _storage.read('arbor.session.$userId.conversationId');
      if (project?.isEmpty == true) project = null;
      if (conversation?.isEmpty == true) conversation = null;
    }
    final context = project == null ? null : ArborSessionContext(
      projectId: project, conversationId: conversation,
    );
    _loadedUsers.add(userId);
    if (context != null) _memory[userId] = context;
    return context;
  }

  Future<void> _persist(String userId, ArborSessionContext? context,
      {bool publish = true}) async {
    final saved = await _storage.write(_key(userId), jsonEncode({
      'version': 1, 'userId': userId,
      'projectId': context?.projectId,
      'conversationId': context?.conversationId,
    }));
    if (!saved) throw StateError('Arbor conversation selection was not saved');
    if (publish) _publish(userId, context);
  }

  void _publish(String userId, ArborSessionContext? context) {
    _loadedUsers.add(userId);
    if (context == null) {
      _memory.remove(userId);
    } else {
      _memory[userId] = context;
    }
    _contextChanges.add(userId);
  }

  Future<void> adopt({required String userId, required String projectId,
    required String conversationId}) => _serial(() async {
      if (userId.isEmpty || projectId.isEmpty || conversationId.isEmpty) {
        throw const FormatException('Arbor scope is empty');
      }
      await _persist(userId, ArborSessionContext(
        projectId: projectId, conversationId: conversationId,
      ));
    });

  Future<void> startNewThread({required String userId, String? projectId}) =>
      _serial(() async {
        final current = await _load(userId);
        final project = projectId ?? current?.projectId;
        await _persist(userId, project == null || project.isEmpty ? null :
            ArborSessionContext(projectId: project));
      });

  Future<void> clearStoredUser(String userId) => _serial(() async {
    // Hide private content even when disk clearing fails. Propagate failure;
    // never claim successful disk deletion.
    _publish(userId, null);
    await _persist(userId, null, publish: false);
  });
}
