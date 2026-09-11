import 'dart:async';

import 'package:audioplayers/audioplayers.dart';

import 'chat_api.dart';
import 'realtime_transcription.dart';
import 'voice_api.dart';

enum VoiceSessionState {
  idle,
  listening,
  thinking,
  speaking,
  error,
}

class VoiceSessionSnapshot {
  const VoiceSessionSnapshot({
    required this.state,
    this.partialTranscript = '',
    this.lastUserText,
    this.lastAssistantText,
    this.error,
  });

  final VoiceSessionState state;
  final String partialTranscript;
  final String? lastUserText;
  final String? lastAssistantText;
  final Object? error;

  VoiceSessionSnapshot copyWith({
    VoiceSessionState? state,
    String? partialTranscript,
    String? lastUserText,
    String? lastAssistantText,
    Object? error,
    bool clearError = false,
  }) {
    return VoiceSessionSnapshot(
      state: state ?? this.state,
      partialTranscript: partialTranscript ?? this.partialTranscript,
      lastUserText: lastUserText ?? this.lastUserText,
      lastAssistantText: lastAssistantText ?? this.lastAssistantText,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class VoiceSessionController {
  VoiceSessionController({
    required this.chatApi,
    required this.voiceApi,
    required this.transcription,
    AudioPlayer? player,
    this.conversationId,
  }) : _player = player ?? AudioPlayer();

  final ChatApi chatApi;
  final VoiceApi voiceApi;
  final RealtimeTranscriptionClient transcription;
  final AudioPlayer _player;

  String? conversationId;

  final _snapshots = StreamController<VoiceSessionSnapshot>.broadcast();

  StreamSubscription<RealtimeTranscriptEvent>? _transcriptSub;
  StreamSubscription<RealtimeSpeechEvent>? _speechSub;
  StreamSubscription<void>? _playerCompleteSub;

  VoiceSessionSnapshot _snapshot = const VoiceSessionSnapshot(
    state: VoiceSessionState.idle,
  );

  VoiceSessionSnapshot get snapshot => _snapshot;
  Stream<VoiceSessionSnapshot> get snapshots => _snapshots.stream;

  int _generation = 0;
  bool _disposed = false;

  Future<void> start() async {
    if (_disposed) {
      throw StateError('VoiceSessionController is disposed');
    }

    if (_transcriptSub != null) return;

    _transcriptSub = transcription.transcripts.listen(
      _onTranscript,
      onError: _fail,
    );

    _speechSub = transcription.speech.listen(
      (event) {
        if (_disposed) return;

        if (event == RealtimeSpeechEvent.started &&
            _snapshot.state == VoiceSessionState.speaking) {
          unawaited(interrupt());
        }
      },
      onError: _fail,
    );

    _playerCompleteSub = _player.onPlayerComplete.listen((_) {
      if (_disposed) return;
      _emit(
        _snapshot.copyWith(
          state: VoiceSessionState.listening,
          partialTranscript: '',
          clearError: true,
        ),
      );
    });

    await transcription.connect();

    _emit(
      _snapshot.copyWith(
        state: VoiceSessionState.listening,
        clearError: true,
      ),
    );
  }

  void _onTranscript(RealtimeTranscriptEvent event) {
    if (_disposed) return;

    if (!event.finalTurn) {
      _emit(
        _snapshot.copyWith(
          partialTranscript: '${_snapshot.partialTranscript}${event.text}',
        ),
      );
      return;
    }

    final text = event.text.trim();

    if (text.isEmpty) return;

    _emit(
      _snapshot.copyWith(
        state: VoiceSessionState.thinking,
        partialTranscript: '',
        lastUserText: text,
        clearError: true,
      ),
    );

    unawaited(_runCanonicalTurn(text));
  }

  Future<void> _runCanonicalTurn(String userText) async {
    final generation = ++_generation;

    try {
      final turn = await chatApi.sendMessage(
        projectId: transcription.projectId,
        conversationId: conversationId,
        userText: userText,
        interactionMode: 'voice',
      );

      if (_disposed || generation != _generation) return;

      conversationId = turn.conversationId;

      _emit(
        _snapshot.copyWith(
          lastAssistantText: turn.assistantText,
        ),
      );

      final audio = await voiceApi.synthesize(turn);

      if (_disposed || generation != _generation) return;

      _emit(
        _snapshot.copyWith(
          state: VoiceSessionState.speaking,
        ),
      );

      await _player.play(
        BytesSource(
          audio.bytes,
          mimeType: audio.contentType,
        ),
      );
    } catch (error) {
      if (_disposed || generation != _generation) return;
      _fail(error);
    }
  }

  Future<void> interrupt() async {
    if (_disposed) return;

    _generation += 1;

    await _player.stop();

    _emit(
      _snapshot.copyWith(
        state: VoiceSessionState.listening,
        partialTranscript: '',
        clearError: true,
      ),
    );
  }

  void _fail(Object error) {
    if (_disposed) return;

    _emit(
      _snapshot.copyWith(
        state: VoiceSessionState.error,
        error: error,
      ),
    );
  }

  void _emit(VoiceSessionSnapshot next) {
    if (_disposed) return;
    _snapshot = next;
    _snapshots.add(next);
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _generation += 1;

    await _transcriptSub?.cancel();
    await _speechSub?.cancel();
    await _playerCompleteSub?.cancel();
    await transcription.dispose();
    await _player.stop();
    await _player.dispose();
    await _snapshots.close();
  }
}
