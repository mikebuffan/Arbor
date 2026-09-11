import 'package:supabase_flutter/supabase_flutter.dart';

import 'arbor_api_client.dart';
import 'arbor_session.dart';
import 'turn_id.dart';

class ChatApi {
  ChatApi(
    this._client, {
    ArborSession? session,
  }) : _session = session ?? ArborSession.instance;

  final ArborApiClient _client;
  final ArborSession _session;

  Future<String?> getLastConversationId({
    required String projectId,
  }) async {
    final json = await _client.get(
      '/api/conversations/last',
      queryParameters: {'projectId': projectId},
    );

    final id = json?['conversationId'];
    return id is String && id.isNotEmpty ? id : null;
  }

  Future<ChatResponse> sendMessage({
    String? projectId,
    String? conversationId,
    String? turnId,
    required String userText,
    String interactionMode = 'text',
  }) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;

    final explicitNewThread =
        projectId != null && conversationId == null;

    if (userId != null && explicitNewThread) {
      await _session.startNewThread(
        userId: userId,
        projectId: projectId,
      );
    }

    final shared =
        userId == null ? null : await _session.contextFor(userId);

    // Once Arbor has an established session for this signed-in user,
    // it is canonical across Text and Voice. A stored null conversationId
    // deliberately means "start a new thread in this project."
    final resolvedProjectId = shared?.projectId ?? projectId;
    final resolvedConversationId =
        shared != null ? shared.conversationId : conversationId;

    final resolvedTurnId = turnId ?? newTurnId();

    final body = <String, dynamic>{
      'turnId': resolvedTurnId,
      'userText': userText,
      'interactionMode': interactionMode,
    };

    if (resolvedProjectId != null) {
      body['projectId'] = resolvedProjectId;
    }
    if (resolvedConversationId != null) {
      body['conversationId'] = resolvedConversationId;
    }

    final json = await _client.post('/api/chat', body: body);

    final response = ChatResponse.fromJson(
      json,
      turnId: resolvedTurnId,
    );

    if (userId != null) {
      await _session.adopt(
        userId: userId,
        projectId: response.projectId,
        conversationId: response.conversationId,
      );
    }

    return response;
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
      turnId: turnId,
      assistantText: assistantText,
    );
  }
}
