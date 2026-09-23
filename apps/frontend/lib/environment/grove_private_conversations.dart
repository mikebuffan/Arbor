import '../api/arbor_api_client.dart';
import '../config/grove_private_config.dart';

/// Contract for the SEPARATE, invite-only Grove host. This is NOT the public
/// Firefly ChatApi, not a UI, and never activates private Talk or Voice.
const String _uuidPattern =
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
final RegExp _uuid = RegExp(_uuidPattern, caseSensitive: false);

bool _validId(String id) => _uuid.hasMatch(id);
Map<String, dynamic> _object(Object? value) {
  if (value is! Map) throw const FormatException('Invalid private Grove response');
  try {
    return Map<String, dynamic>.from(value);
  } catch (_) {
    throw const FormatException('Invalid private Grove response');
  }
}
bool _truthBoundary(Map<String, dynamic> data) =>
    data['grantsExecution'] == false &&
    (data['liveExecutionVerified'] == null ||
        data['liveExecutionVerified'] == false) &&
    (data['workReceipts'] == null ||
        (data['workReceipts'] is List &&
            (data['workReceipts'] as List).isEmpty));
DateTime _date(Object? text) {
  if (text is! String) {
    throw const FormatException('Missing Grove conversation date');
  }
  final result = DateTime.tryParse(text);
  if (result == null) {
    throw const FormatException('Invalid Grove conversation date');
  }
  return result.toUtc();
}

class GrovePrivateConversationChoice {
  const GrovePrivateConversationChoice({
    required this.conversationId,
    required this.createdAt,
    required this.updatedAt,
  });
  final String conversationId;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class GrovePrivateConversationChoices {
  const GrovePrivateConversationChoices({
    required this.projectId,
    required this.conversations,
    required this.mayBeTruncated,
  });
  final String projectId;
  final List<GrovePrivateConversationChoice> conversations;
  final bool mayBeTruncated;
}

GrovePrivateConversationChoices parseGrovePrivateConversations(
  Map<String, dynamic>? payload, {
  required String projectId,
}) {
  if (!_validId(projectId) || payload?['ok'] != true ||
      payload?['projectId'] != projectId ||
      payload?['mayBeTruncated'] is! bool ||
      payload?['createsConversation'] != false ||
      payload?['grantsExecution'] != false ||
      payload?['conversations'] is! List) {
    throw const FormatException('Private Grove conversation list unavailable');
  }
  final list = payload!['conversations'] as List;
  if (list.length > 20) {
    throw const FormatException('Private Grove conversation limit exceeded');
  }
  final seen = <String>{};
  final choices = <GrovePrivateConversationChoice>[];
  for (final item in list) {
    final row = _object(item);
    final id = row['conversationId'];
    if (id is! String || !_validId(id) || !seen.add(id)) {
      throw const FormatException('Invalid or duplicate Grove conversation');
    }
    choices.add(GrovePrivateConversationChoice(
      conversationId: id,
      createdAt: _date(row['createdAt']),
      updatedAt: _date(row['updatedAt']),
    ));
  }
  return GrovePrivateConversationChoices(
    projectId: projectId,
    conversations: List.unmodifiable(choices),
    mayBeTruncated: payload['mayBeTruncated'] as bool,
  );
}

/// Explicit owner-initiated creation. This NEVER accepts a chosen owner or ID:
/// the Grove host obtains the new conversation UUID from Firefly after scope
/// verification. An uncertain POST must NOT be automatically retried.
GrovePrivateConversationChoice parseGrovePrivateCreatedConversation(
  Map<String, dynamic>? payload, {
  required String projectId,
}) {
  if (!_validId(projectId) || payload?['ok'] != true ||
      payload?['projectId'] != projectId ||
      payload?['created'] != true ||
      payload?['grantsExecution'] != false ||
      payload?['verifiesCompletion'] != false) {
    throw const FormatException('Private Grove creation not verified');
  }
  final record = _object(payload!['conversation']);
  final id = record['conversationId'];
  if (id is! String || !_validId(id)) {
    throw const FormatException('Private Grove created ID invalid');
  }
  return GrovePrivateConversationChoice(
    conversationId: id,
    createdAt: _date(record['createdAt']),
    updatedAt: _date(record['updatedAt']),
  );
}

class GrovePrivateCompleteTurn {
  const GrovePrivateCompleteTurn({
    required this.requestId,
    required this.userText,
    required this.assistantText,
    required this.replyVerification,
    required this.createdAt,
  });
  final String requestId;
  final String userText;
  final String assistantText;
  final String replyVerification;
  final DateTime createdAt;
}

class GrovePrivateHistory {
  const GrovePrivateHistory({
    required this.projectId,
    required this.conversationId,
    required this.mayBeTruncated,
    required this.turnsNewestFirst,
  });
  final String projectId;
  final String conversationId;
  final bool mayBeTruncated;
  /// Six latest complete pairs, NOT the entire personal history.
  final List<GrovePrivateCompleteTurn> turnsNewestFirst;
}

bool _verification(Object? value) =>
    value == 'unverified_model_text' ||
    value == 'known_action_claim_filtered';

GrovePrivateHistory parseGrovePrivateHistory(
  Map<String, dynamic>? payload, {
  required String projectId,
  required String conversationId,
}) {
  if (!_validId(projectId) || !_validId(conversationId) ||
      payload?['ok'] != true ||
      payload?['projectId'] != projectId ||
      payload?['conversationId'] != conversationId ||
      payload?['order'] != 'newest_first' ||
      payload?['windowLimit'] != 6 ||
      payload?['historyMayBeTruncated'] is! bool ||
      !_truthBoundary(payload!) ||
      payload['liveExecutionVerified'] != false ||
      payload['workReceipts'] is! List ||
      payload['turns'] is! List) {
    throw const FormatException('Private Grove history unavailable');
  }
  final raw = payload['turns'] as List;
  if (raw.length > 6) {
    throw const FormatException('Private Grove history limit exceeded');
  }
  final ids = <String>{};
  final turns = <GrovePrivateCompleteTurn>[];
  for (final entry in raw) {
    final row = _object(entry);
    final id = row['requestId'];
    final user = row['userText'];
    final assistant = row['assistantText'];
    if (id is! String || !_validId(id) || !ids.add(id) ||
        user is! String || user.trim().isEmpty || user.length > 3000 ||
        assistant is! String || assistant.trim().isEmpty ||
        assistant.length > 20000 || !_verification(row['replyVerification'])) {
      throw const FormatException('Invalid private Grove turn');
    }
    turns.add(GrovePrivateCompleteTurn(
      requestId: id,
      userText: user,
      assistantText: assistant,
      replyVerification: row['replyVerification'] as String,
      createdAt: _date(row['createdAt']),
    ));
  }
  return GrovePrivateHistory(
    projectId: projectId,
    conversationId: conversationId,
    mayBeTruncated: payload['historyMayBeTruncated'] as bool,
    turnsNewestFirst: List.unmodifiable(turns),
  );
}

class GrovePrivateReply {
  const GrovePrivateReply({
    required this.text,
    required this.requestId,
    required this.persisted,
    required this.replayed,
    required this.replyVerification,
  });
  final String text;
  final String? requestId;
  final bool persisted;
  final bool replayed;
  final String replyVerification;
}

GrovePrivateReply parseGrovePrivateReply(
  Map<String, dynamic>? payload, {
  required String requestId,
}) {
  if (!_validId(requestId) || payload?['ok'] != true ||
      payload?['model'] != 'arbor-lm-v0.3' ||
      payload?['reply'] is! String ||
      (payload!['reply'] as String).trim().isEmpty ||
      !_verification(payload['replyVerification']) ||
      payload['persisted'] is! bool ||
      payload['arkConnected'] is! bool ||
      payload['continuityFetched'] is! bool ||
      payload['verifiesCompletion'] != false ||
      !_truthBoundary(payload) ||
      payload['liveExecutionVerified'] != false ||
      payload['workReceipts'] is! List) {
    throw const FormatException('Private Grove reply contract failed');
  }
  final persisted = payload['persisted'] as bool;
  if (persisted &&
      (payload['requestId'] != requestId || payload['replayed'] is! bool)) {
    throw const FormatException('Private Grove retry contract failed');
  }
  if (!persisted && (payload.containsKey('replayed') ||
      payload.containsKey('requestId'))) {
    throw const FormatException('False private Grove persistence');
  }
  return GrovePrivateReply(
    text: payload['reply'] as String,
    requestId: persisted ? requestId : null,
    persisted: persisted,
    replayed: persisted && payload['replayed'] == true,
    replyVerification: payload['replyVerification'] as String,
  );
}

/// The existing ArborApiClient obtains the Grove Supabase access token from
/// the authenticated Grove session. This client rejects an API URL that does
/// not equal the separately approved Grove API origin. It does not display
/// chat UI or generate a Firefly/public-app conversation ID.
class GrovePrivateConversationClient {
  GrovePrivateConversationClient({
    required ArborApiClient api,
    required GrovePrivateConfig config,
    this.enabled = false,
  }) : _api = api, _config = config;

  final ArborApiClient _api;
  final GrovePrivateConfig _config;
  final bool enabled;

  void _requireReady() {
    if (!enabled || !_config.ready ||
        _api.baseUrl.replaceAll(RegExp(r'/$'), '') != _config.apiUrl) {
      throw StateError('Private Grove conversation host is not enabled');
    }
  }

  Future<GrovePrivateConversationChoices> listExisting(String projectId) async {
    _requireReady();
    if (!_validId(projectId)) {
      throw const FormatException('Invalid Grove project');
    }
    final payload = await _api.get('/api/grove/chat/conversations',
        queryParameters: {'projectId': projectId});
    return parseGrovePrivateConversations(payload, projectId: projectId);
  }

  /// Called ONLY on an explicit user action, never automatically on empty
  /// discovery/restart or as a retry. A lost response may have created a
  /// conversation, so callers must refresh listExisting before trying again.
  Future<GrovePrivateConversationChoice> createNew(String projectId) async {
    _requireReady();
    if (!_validId(projectId)) {
      throw const FormatException('Invalid Grove project');
    }
    final payload = await _api.post(
      '/api/grove/chat/conversations',
      body: {'projectId': projectId},
    );
    return parseGrovePrivateCreatedConversation(
      payload, projectId: projectId,
    );
  }

  Future<GrovePrivateHistory> loadRecent({
    required String projectId,
    required String conversationId,
  }) async {
    _requireReady();
    if (!_validId(projectId) || !_validId(conversationId)) {
      throw const FormatException('Invalid Grove conversation scope');
    }
    final payload = await _api.get('/api/grove/chat/history',
      queryParameters: {
        'projectId': projectId,
        'conversationId': conversationId,
      },
    );
    return parseGrovePrivateHistory(payload,
      projectId: projectId, conversationId: conversationId);
  }

  /// Caller MUST reuse the same requestId on a network retry with identical
  /// text; a new ID means a new turn. Never accept client-selected owner,
  /// history, role, tool or cognitive state in the payload.
  Future<GrovePrivateReply> send({
    required String projectId,
    required String conversationId,
    required String requestId,
    required String text,
  }) async {
    _requireReady();
    if (!_validId(projectId) || !_validId(conversationId) ||
        !_validId(requestId) || text.trim().isEmpty || text.length > 3000) {
      throw const FormatException('Invalid Grove turn scope');
    }
    final payload = await _api.post('/api/grove/chat', body: {
      'projectId': projectId,
      'conversationId': conversationId,
      'requestId': requestId,
      'message': text,
    });
    return parseGrovePrivateReply(payload, requestId: requestId);
  }
}
