import 'dart:async';
import 'dart:convert';

import 'package:flutter_webrtc/flutter_webrtc.dart';

import 'arbor_api_client.dart';

class RealtimeTranscriptEvent {
  const RealtimeTranscriptEvent({
    required this.text,
    required this.finalTurn,
  });

  final String text;
  final bool finalTurn;
}

class RealtimeTranscriptionClient {
  RealtimeTranscriptionClient({
    required ArborApiClient api,
    required this.projectId,
  }) : _api = api;

  final ArborApiClient _api;
  final String projectId;

  RTCPeerConnection? _peer;
  RTCDataChannel? _events;
  MediaStream? _microphone;

  final _transcripts =
      StreamController<RealtimeTranscriptEvent>.broadcast();

  Stream<RealtimeTranscriptEvent> get transcripts =>
      _transcripts.stream;

  bool get connected => _peer != null;

  Future<void> connect() async {
    if (_peer != null) return;

    final peer = await createPeerConnection({
      'sdpSemantics': 'unified-plan',
    });

    final microphone =
        await navigator.mediaDevices.getUserMedia({
      'audio': {
        'echoCancellation': true,
        'noiseSuppression': true,
        'autoGainControl': true,
      },
      'video': false,
    });

    for (final track in microphone.getAudioTracks()) {
      await peer.addTrack(track, microphone);
    }

    final init = RTCDataChannelInit();
    init.ordered = true;

    final events =
        await peer.createDataChannel('oai-events', init);

    events.onMessage = _handleEvent;

    final offer = await peer.createOffer({
      'offerToReceiveAudio': false,
      'offerToReceiveVideo': false,
    });

    await peer.setLocalDescription(offer);

    final local = await peer.getLocalDescription();
    final offerSdp = local?.sdp;

    if (offerSdp == null || offerSdp.isEmpty) {
      await events.close();
      for (final track in microphone.getTracks()) {
        track.stop();
      }
      await peer.close();
      throw StateError('Realtime offer did not contain SDP');
    }

    final answer = await _api.postText(
      '/api/arbor/voice/realtime',
      body: {
        'projectId': projectId,
        'sdp': offerSdp,
      },
    );

    await peer.setRemoteDescription(
      RTCSessionDescription(
        answer.text,
        'answer',
      ),
    );

    _peer = peer;
    _events = events;
    _microphone = microphone;
  }

  void _handleEvent(RTCDataChannelMessage message) {
    if (message.isBinary) return;

    dynamic decoded;

    try {
      decoded = jsonDecode(message.text);
    } catch (_) {
      return;
    }

    if (decoded is! Map<String, dynamic>) return;

    final type = decoded['type'];

    if (type ==
        'conversation.item.input_audio_transcription.delta') {
      final delta = decoded['delta'];

      if (delta is String && delta.isNotEmpty) {
        _transcripts.add(
          RealtimeTranscriptEvent(
            text: delta,
            finalTurn: false,
          ),
        );
      }

      return;
    }

    if (type ==
        'conversation.item.input_audio_transcription.completed') {
      final transcript = decoded['transcript'];

      if (transcript is String &&
          transcript.trim().isNotEmpty) {
        _transcripts.add(
          RealtimeTranscriptEvent(
            text: transcript,
            finalTurn: true,
          ),
        );
      }
    }
  }

  Future<void> disconnect() async {
    final events = _events;
    final microphone = _microphone;
    final peer = _peer;

    _events = null;
    _microphone = null;
    _peer = null;

    if (events != null) {
      await events.close();
    }

    if (microphone != null) {
      for (final track in microphone.getTracks()) {
        track.stop();
      }
      await microphone.dispose();
    }

    if (peer != null) {
      await peer.close();
      await peer.dispose();
    }
  }

  Future<void> dispose() async {
    await disconnect();
    await _transcripts.close();
  }
}
