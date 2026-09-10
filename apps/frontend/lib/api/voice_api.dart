import 'dart:typed_data';

import 'arbor_api_client.dart';
import 'chat_api.dart';

class VoiceTurnResponse {
  VoiceTurnResponse({
    required this.chat,
    required this.audio,
  });

  final ChatResponse chat;
  final Uint8List audio;
}

class VoiceApi {
  VoiceApi(this._client) : _chat = ChatApi(_client);

  final ArborApiClient _client;
  final ChatApi _chat;

  Future<VoiceTurnResponse> respond({
    required String transcript,
    String? projectId,
    String? conversationId,
    String persona = 'arbor',
    String? voiceId,
    double? speed,
  }) async {
    final chat = await _chat.sendMessage(
      projectId: projectId,
      conversationId: conversationId,
      userText: transcript,
      interactionMode:
          persona == 'annabelle' ? 'annabelle' : 'voice',
    );

    final body = <String, dynamic>{
      'text': chat.assistantText,
      'persona': persona,
      'sourceMode':
          persona == 'annabelle' ? 'annabelle' : 'voice',
    };

    if (voiceId != null) body['voiceId'] = voiceId;
    if (speed != null) body['speed'] = speed;

    final audio = await _client.postBytes(
      '/api/arbor/voice',
      body: body,
    );

    return VoiceTurnResponse(
      chat: chat,
      audio: audio,
    );
  }
}
