import 'dart:typed_data';

import 'arbor_api_client.dart';
import 'chat_api.dart';
import 'turn_id.dart';

class VoiceTurnResponse {
  const VoiceTurnResponse({
    required this.chat,
    required this.audio,
  });

  final ChatResponse chat;
  final VoiceAudio audio;
}

class VoiceApi {
  VoiceApi(this._client) : _chat = ChatApi(_client);

  final ArborApiClient _client;
  final ChatApi _chat;

  Future<VoiceTurnResponse> respond({
    required String transcript,
    String? projectId,
    String? conversationId,
    String? turnId,
  }) async {
    final resolvedTurnId = turnId ?? newTurnId();

    final chat = await _chat.sendMessage(
      projectId: projectId,
      conversationId: conversationId,
      turnId: resolvedTurnId,
      userText: transcript,
      interactionMode: 'voice',
    );

    final audio = await synthesize(chat);

    return VoiceTurnResponse(
      chat: chat,
      audio: audio,
    );
  }

  Future<VoiceAudio> synthesize(ChatResponse turn) async {
    final response = await _client.postBytes(
      '/api/arbor/voice',
      body: {
        'projectId': turn.projectId,
        'turnId': turn.turnId,
      },
    );

    return VoiceAudio(
      bytes: response.bytes,
      contentType: response.contentType ?? 'audio/mpeg',
      turnId: response.headers['x-arbor-turn-id'] ?? turn.turnId,
      subsystem: response.headers['x-arbor-subsystem'],
      voiceId: response.headers['x-arbor-voice'],
      providerRequestId: response.headers['x-provider-request-id'],
    );
  }
}

class VoiceAudio {
  const VoiceAudio({
    required this.bytes,
    required this.contentType,
    required this.turnId,
    this.subsystem,
    this.voiceId,
    this.providerRequestId,
  });

  final Uint8List bytes;
  final String contentType;
  final String turnId;
  final String? subsystem;
  final String? voiceId;
  final String? providerRequestId;
}
