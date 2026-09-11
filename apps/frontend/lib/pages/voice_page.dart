import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../api/voice_api.dart';
import '../config/arbor_config.dart';
import '../widgets/arbor_visual.dart';

class VoicePage extends StatefulWidget {
  const VoicePage({super.key});

  @override
  State<VoicePage> createState() => _VoicePageState();
}

class _VoicePageState extends State<VoicePage> {
  static const _apiBaseUrl = ArborConfig.apiBaseUrl;

  final SpeechToText _speech = SpeechToText();
  final AudioPlayer _player = AudioPlayer();

  late final ArborApiClient _client;
  late final VoiceApi _voiceApi;
  StreamSubscription<void>? _playerComplete;

  String? _projectId;
  String? _conversationId;

  String _transcript = '';
  String _assistantText = '';
  String _status = 'Tap the mic when you’re ready.';

  bool _speechReady = false;
  bool _initializingSpeech = false;
  bool _listening = false;
  bool _sending = false;
  bool _playing = false;
  bool _submittedThisListen = false;
  bool _handsFree = true;
  double _soundLevel = 0;

  bool get _isAuthed =>
      Supabase.instance.client.auth.currentSession?.accessToken != null;

  ArborVisualState get _visualState {
    if (_playing) return ArborVisualState.speaking;
    if (_sending) return ArborVisualState.thinking;
    if (_listening) return ArborVisualState.listening;
    return ArborVisualState.idle;
  }

  @override
  void initState() {
    super.initState();

    _client = ArborApiClient(baseUrl: _apiBaseUrl);
    _voiceApi = VoiceApi(_client);

    _playerComplete = _player.onPlayerComplete.listen((_) {
      if (!mounted) return;

      setState(() {
        _playing = false;
        _status = _handsFree
            ? 'Your turn.'
            : 'Tap the mic to answer.';
      });

      if (_handsFree && _isAuthed) {
        Future<void>.delayed(
          const Duration(milliseconds: 350),
          () async {
            if (!mounted || _sending || _playing || _listening) return;
            await _startListening();
          },
        );
      }
    });
  }

  Future<bool> _ensureSpeechReady() async {
    if (_speechReady) return true;
    if (_initializingSpeech) return false;

    setState(() {
      _initializingSpeech = true;
      _status = 'Checking microphone…';
    });

    try {
      final available = await _speech.initialize(
        onStatus: _onSpeechStatus,
        onError: (error) {
          if (!mounted) return;

          setState(() {
            _listening = false;
            _status = 'Speech recognition error: ${error.errorMsg}';
          });
        },
        options: [
          SpeechToText.androidNoBluetooth,
        ],
      );

      if (!mounted) return false;

      setState(() {
        _speechReady = available;
        _status = available
            ? 'Tap the mic when you’re ready.'
            : 'Speech recognition is unavailable or microphone access was denied.';
      });

      return available;
    } finally {
      if (mounted) {
        setState(() => _initializingSpeech = false);
      }
    }
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    if (!mounted) return;

    setState(() {
      _transcript = result.recognizedWords;
    });

    if (result.finalResult) {
      unawaited(_submitRecognizedTurn());
    }
  }

  void _onSpeechStatus(String status) {
    if (!mounted) return;

    if (status == SpeechToText.listeningStatus) {
      setState(() {
        _listening = true;
        _status = 'Listening…';
      });
      return;
    }

    if (status == SpeechToText.doneStatus ||
        status == SpeechToText.notListeningStatus) {
      setState(() {
        _listening = false;
        _soundLevel = 0;
      });

      if (_transcript.trim().isNotEmpty) {
        unawaited(_submitRecognizedTurn());
      } else if (!_sending && !_playing) {
        setState(() {
          _status = 'I didn’t catch anything. Tap the mic and try again.';
        });
      }
    }
  }

  Future<void> _startListening() async {
    if (_sending || _listening) return;

    if (!_isAuthed) {
      setState(() {
        _status = 'Sign in on the Text screen first.';
      });
      return;
    }

    if (_playing) {
      await _player.stop();
      if (!mounted) return;
      setState(() => _playing = false);
    }

    final ready = await _ensureSpeechReady();
    if (!ready || !mounted) return;

    setState(() {
      _transcript = '';
      _submittedThisListen = false;
      _listening = true;
      _status = 'Listening…';
    });

    try {
      await _speech.listen(
        onResult: _onSpeechResult,
        onSoundLevelChange: (level) {
          if (!mounted) return;
          setState(() => _soundLevel = level);
        },
        listenOptions: SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          listenMode: ListenMode.confirmation,
          pauseFor: const Duration(seconds: 2),
          listenFor: const Duration(seconds: 30),
          autoPunctuation: true,
        ),
      );
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _listening = false;
        _status = 'Couldn’t start listening: $error';
      });
    }
  }

  Future<void> _stopListeningAndSend() async {
    if (!_listening) return;

    await _speech.stop();

    if (!mounted) return;

    setState(() {
      _listening = false;
      _soundLevel = 0;
    });

    await _submitRecognizedTurn();
  }

  Future<void> _submitRecognizedTurn() async {
    final text = _transcript.trim();

    if (_submittedThisListen || _sending || text.isEmpty) return;
    _submittedThisListen = true;

    setState(() {
      _sending = true;
      _listening = false;
      _status = 'Arbor is thinking…';
    });

    try {
      await _speech.stop();

      final result = await _voiceApi.respond(
        transcript: text,
        projectId: _projectId,
        conversationId: _conversationId,
      );

      if (!mounted) return;

      setState(() {
        _projectId = result.chat.projectId;
        _conversationId = result.chat.conversationId;
        _assistantText = result.chat.assistantText;
        _status = 'Arbor is speaking…';
        _playing = true;
      });

      await _player.play(
        BytesSource(
          result.audio.bytes,
          mimeType: result.audio.contentType,
        ),
      );
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _playing = false;
        _status = 'Voice turn failed: $error';
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  Future<void> _toggleMic() async {
    if (_sending) return;

    if (_listening) {
      await _stopListeningAndSend();
      return;
    }

    await _startListening();
  }

  Future<void> _interrupt() async {
    if (!_playing) return;

    await _player.stop();

    if (!mounted) return;

    setState(() {
      _playing = false;
      _status = 'Your turn.';
    });

    await _startListening();
  }

  Future<void> _newThread() async {
    await _speech.cancel();
    await _player.stop();

    final userId = Supabase.instance.client.auth.currentUser?.id;

    if (userId != null) {
      await ArborSession.instance.startNewThread(
        userId: userId,
        projectId: _projectId,
      );
    }

    if (!mounted) return;

    final shared =
        userId == null ? null : ArborSession.instance.peek(userId);

    setState(() {
      _projectId = shared?.projectId ?? _projectId;
      _conversationId = null;
      _transcript = '';
      _assistantText = '';
      _listening = false;
      _sending = false;
      _playing = false;
      _submittedThisListen = false;
      _soundLevel = 0;
      _status = 'New thread. Tap the mic when you’re ready.';
    });
  }

  @override
  void dispose() {
    _playerComplete?.cancel();
    _speech.cancel();
    _player.dispose();
    _client.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final micScale = _listening
        ? 1.0 + (_soundLevel.abs().clamp(0, 30) / 180)
        : 1.0;

    return Scaffold(
      backgroundColor: const Color(0xFF0E0316),
      body: Stack(
        children: [
          Positioned.fill(
            child: Opacity(
              opacity: 0.34,
              child: ArborVisual(
                state: _visualState,
                soundLevel: _soundLevel,
                showTitle: false,
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'ARBOR VOICE',
                                  style: TextStyle(
                                    fontSize: 24,
                                    letterSpacing: 3,
                                    fontWeight: FontWeight.w400,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'same conversation, spoken',
                                  style: TextStyle(color: Colors.white60),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: _newThread,
                            child: const Text('New thread'),
                          ),
                        ],
                      ),
                      const Spacer(),
                      AnimatedScale(
                        scale: micScale,
                        duration: const Duration(milliseconds: 100),
                        child: GestureDetector(
                          onTap: _playing ? _interrupt : _toggleMic,
                          child: Container(
                            width: 150,
                            height: 150,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _listening
                                  ? const Color(0xFFF3387A).withOpacity(0.24)
                                  : Colors.white.withOpacity(0.06),
                              border: Border.all(
                                color: _listening
                                    ? const Color(0xFFF3387A)
                                    : Colors.white24,
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              _playing
                                  ? Icons.hearing_rounded
                                  : _listening
                                      ? Icons.mic_rounded
                                      : Icons.mic_none_rounded,
                              size: 58,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        _status,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 15,
                        ),
                      ),
                      if (_playing) ...[
                        const SizedBox(height: 10),
                        TextButton.icon(
                          onPressed: _interrupt,
                          icon: const Icon(Icons.mic_rounded),
                          label: const Text('Interrupt'),
                        ),
                      ],
                      const SizedBox(height: 28),
                      _VoiceTextCard(
                        label: 'YOU',
                        text: _transcript,
                        emptyText: _listening
                            ? 'Listening…'
                            : 'Nothing spoken yet.',
                      ),
                      const SizedBox(height: 12),
                      _VoiceTextCard(
                        label: 'ARBOR',
                        text: _assistantText,
                        emptyText: 'No reply yet.',
                      ),
                      const Spacer(),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: _handsFree,
                        onChanged: (value) {
                          setState(() => _handsFree = value);
                        },
                        title: const Text('Hands-free next turn'),
                        subtitle: const Text(
                          'Reopen the mic after Arbor finishes speaking.',
                          style: TextStyle(color: Colors.white54),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VoiceTextCard extends StatelessWidget {
  const _VoiceTextCard({
    required this.label,
    required this.text,
    required this.emptyText,
  });

  final String label;
  final String text;
  final String emptyText;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 76),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.08),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white38,
              fontSize: 11,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            text.isEmpty ? emptyText : text,
            style: TextStyle(
              color: text.isEmpty ? Colors.white38 : Colors.white,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
