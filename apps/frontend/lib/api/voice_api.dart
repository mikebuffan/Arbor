import 'dart:typed_data';

import 'arbor_api_client.dart';
import 'chat_api.dart';
import 'turn_id.dart';

class VoiceTurnResponse {
  VoiceTurnResponse({
    required this.chat,
    required this.audio,
  });

  final ChatResponse chat;
  final Uint8List audio;
}

class VoiceApi {
  VoiceApi(this._client)
      : _chat = ChatApi(_client);

  final ArborApiClient _client;
  final ChatApi _chat;

  Future<VoiceTurnResponse> respond({
    required String transcript,
    required String projectId,
    String? conversationId,
    String? turnId,
  }) async {
    final resolvedTurnId =
        turnId ?? createTurnId();

    final chat =
        await _chat.sendMessage(
      projectId: projectId,
      conversationId: conversationId,
      userText: transcript,
      interactionMode: 'voice',
      turnId: resolvedTurnId,
    );

    final audio =
        await _client.postBytes(
      '/api/arbor/voice',
      body: {
        'projectId': projectId,
        'turnId': resolvedTurnId,
        'text': chat.assistantText,
      },
    );

    return VoiceTurnResponse(
      chat: chat,
      audio: audio,
    );
  }
}
