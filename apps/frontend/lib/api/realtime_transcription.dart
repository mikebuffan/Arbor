import 'dart:async';
import 'dart:convert';

import 'package:flutter_webrtc/flutter_webrtc.dart';

import 'arbor_api_client.dart';

enum RealtimeSpeechEvent {
  started,
  stopped,
}

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
    String? projectId,
  })  : _api = api,
        _projectId = projectId;

  final ArborApiClient _api;
  String? _projectId;

  RTCPeerConnection? _peer;
  RTCDataChannel? _events;
  MediaStream? _microphone;

  final _transcripts =
      StreamController<RealtimeTranscriptEvent>.broadcast();
  final _speech =
      StreamController<RealtimeSpeechEvent>.broadcast();

  Stream<RealtimeTranscriptEvent> get transcripts =>
      _transcripts.stream;
  Stream<RealtimeSpeechEvent> get speech => _speech.stream;

  String get projectId {
    final value = _projectId;

    if (value == null || value.isEmpty) {
      throw StateError(
        'Realtime session has not resolved a project yet',
      );
    }

    return value;
  }

  bool get connected => _peer != null;

  Future<void> connect() async {
    if (_peer != null) return;

    RTCPeerConnection? peer;
    RTCDataChannel? events;
    MediaStream? microphone;

    try {
      peer = await createPeerConnection({
        'sdpSemantics': 'unified-plan',
      });

      microphone =
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

      events = await peer.createDataChannel(
        'oai-events',
        init,
      );

      events.onMessage = _handleEvent;

      final offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      final local = await peer.getLocalDescription();
      final offerSdp = local?.sdp;

      if (offerSdp == null || offerSdp.isEmpty) {
        throw StateError(
          'Realtime offer did not contain SDP',
        );
      }

      final answer = await _api.postText(
        '/api/arbor/voice/realtime',
        body: {
          if (_projectId != null)
            'projectId': _projectId,
          'sdp': offerSdp,
        },
      );

      final resolvedProjectId =
          answer.headers['x-arbor-project-id'];

      if (resolvedProjectId == null ||
          resolvedProjectId.isEmpty) {
        throw StateError(
          'Realtime handshake did not return project identity',
        );
      }

      await peer.setRemoteDescription(
        RTCSessionDescription(
          answer.text,
          'answer',
        ),
      );

      _projectId = resolvedProjectId;
      _peer = peer;
      _events = events;
      _microphone = microphone;
    } catch (_) {
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

      rethrow;
    }
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

    if (type == 'input_audio_buffer.speech_started') {
      _speech.add(RealtimeSpeechEvent.started);
      return;
    }

    if (type == 'input_audio_buffer.speech_stopped') {
      _speech.add(RealtimeSpeechEvent.stopped);
      return;
    }

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
    await _speech.close();
  }
}
