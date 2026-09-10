import 'dart:typed_data';

import 'arbor_api_client.dart';
import 'chat_api.dart';

class VoiceApi {
  VoiceApi(this._client);

  final ArborApiClient _client;

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
