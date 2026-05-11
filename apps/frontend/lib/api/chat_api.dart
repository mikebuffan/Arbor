import 'arbor_api_client.dart';

class ChatApi {
  ChatApi(this._client);

  final ArborApiClient _client;

  Future<String?> getLastConversationId({required String projectId}) async {
    final json = await _client.get(
      '/api/conversations/last',
      queryParameters: {'projectId': projectId},
    );

    final id = json['conversationId'];
    return id is String && id.isNotEmpty ? id : null;
  }

  Future<ChatResponse> sendMessage({
    String? projectId,
    String? conversationId,
    required String userText,
  }) async {
    final body = <String, dynamic>{
      'userText': userText,
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
    if (json['ok'] == false) {
      throw Exception(json['error'] ?? 'Chat failed');
    }

    final projectId = json['projectId'];
    final conversationId = json['conversationId'];
    final assistantText = json['assistantText'];

    if (projectId is! String || projectId.isEmpty) {
      throw Exception('Invalid projectId in chat response');
    }

    if (conversationId is! String || conversationId.isEmpty) {
      throw Exception('Invalid conversationId in chat response');
    }

    if (assistantText is! String) {
      throw Exception('Invalid assistantText in chat response');
    }

    return ChatResponse(
      projectId: projectId,
      conversationId: conversationId,
      assistantText: assistantText,
    );
  }
}
