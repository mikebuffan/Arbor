import 'arbor_api_client.dart';
import 'turn_id.dart';

class ChatApi {
  ChatApi(this._client);

  final ArborApiClient _client;

  Future<ChatResponse> sendMessage({
    String? projectId,
    String? conversationId,
    required String userText,
    String interactionMode = 'text',
    String? turnId,
  }) async {
    final body = <String, dynamic>{
      'turnId': turnId ?? createTurnId(),
      'userText': userText,
      'interactionMode': interactionMode,
    };

    if (projectId != null) body['projectId'] = projectId;
    if (conversationId != null) body['conversationId'] = conversationId;

    final json = await _client.post('/api/chat', body: body);

    return ChatResponse.fromJson(json);
  }
}

class ChatResponse {
  ChatResponse({
    required this.projectId,
    required this.conversationId,
    required this.assistantText,
  });

  final String projectId;
  final String conversationId;
  final String assistantText;

  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    if (json['ok'] != true) {
      throw Exception(json['error'] ?? 'Chat failed');
    }

    return ChatResponse(
      projectId: json['projectId'],
      conversationId: json['conversationId'],
      assistantText: json['assistantText'],
    );
  }
}
