import '../config/arbor_config.dart';
import 'arbor_api_client.dart';
import 'chat_api.dart' as canonical;

class ChatResponse {
  final String projectId;
  final String conversationId;
  final String assistantText;

  ChatResponse({
    required this.projectId,
    required this.conversationId,
    required this.assistantText,
  });
}

class ArborApi {
  static const String baseUrl = ArborConfig.apiBaseUrl;

  static Future<String?> getLastConversationId({
    required String projectId,
  }) async {
    final client = ArborApiClient(baseUrl: baseUrl);

    try {
      return await canonical.ChatApi(client)
          .getLastConversationId(projectId: projectId);
    } finally {
      client.close();
    }
  }

  static Future<ChatResponse> sendMessage({
    required String userText,
    String? projectId,
    String? conversationId,
    String interactionMode = 'text',
    String? turnId,
  }) async {
    final client = ArborApiClient(baseUrl: baseUrl);

    try {
      final result = await canonical.ChatApi(client).sendMessage(
        userText: userText,
        projectId: projectId,
        conversationId: conversationId,
        interactionMode: interactionMode,
        turnId: turnId,
      );

      return ChatResponse(
        projectId: result.projectId,
        conversationId: result.conversationId,
        assistantText: result.assistantText,
      );
    } finally {
      client.close();
    }
  }
}
