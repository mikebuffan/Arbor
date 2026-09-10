import 'arbor_api_client.dart';
import 'turn_id.dart';

class ChatApi {
  ChatApi(this._client);

  final ArborApiClient _client;

  Future<ChatResponse> sendMessage({
    String? projectId,
    String? conversationId,
    String? turnId,
    required String userText,
  }) async {
    final resolvedTurnId = turnId ?? newTurnId();

    final body = <String, dynamic>{
      'turnId': resolvedTurnId,
      'userText': userText,
    };

    if (projectId != null) body['projectId'] = projectId;
    if (conversationId != null) body['conversationId'] = conversationId;

    final json = await _client.post('/api/chat', body: body);

    return ChatResponse.fromJson(
      json,
      turnId: resolvedTurnId,
    );
  }
}

class ChatResponse {
  ChatResponse({
    required this.projectId,
    required this.conversationId,
    required this.turnId,
    required this.assistantText,
  });

  final String projectId;
  final String conversationId;
  final String turnId;
  final String assistantText;

  factory ChatResponse.fromJson(
    Map<String, dynamic> json, {
    required String turnId,
  }) {
    if (json['ok'] != true) {
      throw Exception(json['error'] ?? 'Chat failed');
    }

    return ChatResponse(
      projectId: json['projectId'] as String,
      conversationId: json['conversationId'] as String,
      turnId: turnId,
      assistantText: json['assistantText'] as String,
    );
  }
}
