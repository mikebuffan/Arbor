import 'package:shared_preferences/shared_preferences.dart';

class ArborSessionContext {
  const ArborSessionContext({
    required this.projectId,
    this.conversationId,
  });

  final String projectId;
  final String? conversationId;
}

class ArborSession {
  ArborSession();

  static final ArborSession instance = ArborSession();

  final Map<String, ArborSessionContext> _memory =
      <String, ArborSessionContext>{};
  final Set<String> _loadedUsers = <String>{};

  String _projectKey(String userId) =>
      'arbor.session.$userId.projectId';

  String _conversationKey(String userId) =>
      'arbor.session.$userId.conversationId';

  ArborSessionContext? peek(String userId) => _memory[userId];

  Future<ArborSessionContext?> contextFor(String userId) async {
    if (_loadedUsers.contains(userId)) {
      return _memory[userId];
    }

    final prefs = await SharedPreferences.getInstance();
    final projectId = prefs.getString(_projectKey(userId));
    final conversationId =
        prefs.getString(_conversationKey(userId));

    _loadedUsers.add(userId);

    if (projectId == null || projectId.isEmpty) {
      return null;
    }

    final context = ArborSessionContext(
      projectId: projectId,
      conversationId:
          conversationId == null || conversationId.isEmpty
              ? null
              : conversationId,
    );

    _memory[userId] = context;
    return context;
  }

  Future<void> adopt({
    required String userId,
    required String projectId,
    required String conversationId,
  }) async {
    final context = ArborSessionContext(
      projectId: projectId,
      conversationId: conversationId,
    );

    _loadedUsers.add(userId);
    _memory[userId] = context;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_projectKey(userId), projectId);
    await prefs.setString(
      _conversationKey(userId),
      conversationId,
    );
  }

  Future<void> startNewThread({
    required String userId,
    String? projectId,
  }) async {
    final current = await contextFor(userId);
    final resolvedProjectId = projectId ?? current?.projectId;

    _loadedUsers.add(userId);

    final prefs = await SharedPreferences.getInstance();

    if (resolvedProjectId == null ||
        resolvedProjectId.isEmpty) {
      _memory.remove(userId);
      await prefs.remove(_projectKey(userId));
      await prefs.remove(_conversationKey(userId));
      return;
    }

    _memory[userId] = ArborSessionContext(
      projectId: resolvedProjectId,
    );

    await prefs.setString(
      _projectKey(userId),
      resolvedProjectId,
    );
    await prefs.remove(_conversationKey(userId));
  }

  Future<void> clearStoredUser(String userId) async {
    _loadedUsers.add(userId);
    _memory.remove(userId);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_projectKey(userId));
    await prefs.remove(_conversationKey(userId));
  }
}
