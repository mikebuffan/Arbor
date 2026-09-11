import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../api/chat_api.dart';
import '../api/realtime_transcription.dart';
import '../api/voice_api.dart';
import '../api/voice_session_controller.dart';
import '../config/arbor_config.dart';
import '../widgets/arbor_visual.dart';

class VoicePage extends StatefulWidget {
  const VoicePage({
    super.key,
    this.active = true,
  });

  final bool active;

  @override
  State<VoicePage> createState() => _VoicePageState();
}

class _VoicePageState extends State<VoicePage> {
  static const _apiBaseUrl = ArborConfig.apiBaseUrl;

  late final ArborApiClient _client;
  late final ChatApi _chatApi;
  late final VoiceApi _voiceApi;

  VoiceSessionController? _controller;
  StreamSubscription<VoiceSessionSnapshot>? _snapshotSub;

  VoiceSessionSnapshot _snapshot = const VoiceSessionSnapshot(
    state: VoiceSessionState.idle,
  );

  String? _projectId;
  String? _conversationId;

  bool _starting = false;
  int _lifecycleGeneration = 0;

  bool get _isAuthed =>
      Supabase.instance.client.auth.currentSession?.accessToken != null;

  ArborVisualState get _visualState {
    switch (_snapshot.state) {
      case VoiceSessionState.listening:
        return ArborVisualState.listening;
      case VoiceSessionState.thinking:
        return ArborVisualState.thinking;
      case VoiceSessionState.speaking:
        return ArborVisualState.speaking;
      case VoiceSessionState.idle:
      case VoiceSessionState.error:
        return ArborVisualState.idle;
    }
  }

  String get _status {
    if (_starting) return 'Connecting Arbor Voice…';

    if (widget.active && !_isAuthed) {
      return 'Sign in on the Text screen first.';
    }

    switch (_snapshot.state) {
      case VoiceSessionState.idle:
        return widget.active
            ? 'Voice ready.'
            : 'Tap Voice when you’re ready.';
      case VoiceSessionState.listening:
        return 'Listening…';
      case VoiceSessionState.thinking:
        return 'Arbor is thinking…';
      case VoiceSessionState.speaking:
        return 'Arbor is speaking…';
      case VoiceSessionState.error:
        return 'Voice connection failed. Tap Restart Voice.';
    }
  }

  @override
  void initState() {
    super.initState();

    _client = ArborApiClient(baseUrl: _apiBaseUrl);
    _chatApi = ChatApi(_client);
    _voiceApi = VoiceApi(_client);

    if (widget.active) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && widget.active) {
          unawaited(_activate());
        }
      });
    }
  }

  @override
  void didUpdateWidget(covariant VoicePage oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (!oldWidget.active && widget.active) {
      unawaited(_activate());
    } else if (oldWidget.active && !widget.active) {
      unawaited(_deactivate());
    }
  }

  Future<void> _activate() async {
    if (!widget.active || _starting || _controller != null) return;

    if (!_isAuthed) {
      if (!mounted) return;

      setState(() {
        _snapshot = const VoiceSessionSnapshot(
          state: VoiceSessionState.idle,
        );
      });
      return;
    }

    final generation = ++_lifecycleGeneration;
    final userId = Supabase.instance.client.auth.currentUser?.id;

    if (userId == null) return;

    setState(() => _starting = true);

    try {
      final shared = await ArborSession.instance.contextFor(userId);

      if (!mounted ||
          !widget.active ||
          generation != _lifecycleGeneration) {
        return;
      }

      _projectId = shared?.projectId;
      _conversationId = shared?.conversationId;

      final transcription = RealtimeTranscriptionClient(
        api: _client,
        projectId: _projectId,
      );

      final controller = VoiceSessionController(
        chatApi: _chatApi,
        voiceApi: _voiceApi,
        transcription: transcription,
        conversationId: _conversationId,
      );

      final sub = controller.snapshots.listen((snapshot) {
        if (!mounted ||
            generation != _lifecycleGeneration ||
            controller != _controller) {
          return;
        }

        setState(() {
          _snapshot = snapshot;
          _conversationId = controller.conversationId;
        });
      });

      _controller = controller;
      _snapshotSub = sub;

      try {
        await controller.start();

        if (!mounted ||
            !widget.active ||
            generation != _lifecycleGeneration ||
            controller != _controller) {
          if (controller == _controller) {
            _controller = null;
            _snapshotSub = null;
          }

          await sub.cancel();
          await controller.dispose();
          return;
        }

        _projectId = transcription.projectId;

        if (shared == null) {
          await ArborSession.instance.startNewThread(
            userId: userId,
            projectId: _projectId,
          );
        }
      } catch (error) {
        if (controller == _controller) {
          _controller = null;
          _snapshotSub = null;
        }

        await sub.cancel();
        await controller.dispose();

        if (mounted && generation == _lifecycleGeneration) {
          setState(() {
            _snapshot = VoiceSessionSnapshot(
              state: VoiceSessionState.error,
              error: error,
            );
          });
        }
      }
    } catch (error) {
      if (mounted && generation == _lifecycleGeneration) {
        setState(() {
          _snapshot = VoiceSessionSnapshot(
            state: VoiceSessionState.error,
            error: error,
          );
        });
      }
    } finally {
      if (mounted && generation == _lifecycleGeneration) {
        setState(() => _starting = false);
      }
    }
  }

  Future<void> _deactivate() async {
    _lifecycleGeneration += 1;

    final sub = _snapshotSub;
    final controller = _controller;

    _snapshotSub = null;
    _controller = null;

    await sub?.cancel();
    await controller?.dispose();

    if (!mounted) return;

    setState(() {
      _starting = false;
      _snapshot = const VoiceSessionSnapshot(
        state: VoiceSessionState.idle,
      );
    });
  }

  Future<void> _restartVoice() async {
    await _deactivate();

    if (mounted && widget.active) {
      await _activate();
    }
  }

  Future<void> _newThread() async {
    final userId = Supabase.instance.client.auth.currentUser?.id;

    if (userId == null) return;

    final projectId = _projectId ??
        (await ArborSession.instance.contextFor(userId))?.projectId;

    await ArborSession.instance.startNewThread(
      userId: userId,
      projectId: projectId,
    );

    _conversationId = null;

    if (mounted) {
      setState(() {
        _snapshot = const VoiceSessionSnapshot(
          state: VoiceSessionState.idle,
        );
      });
    }

    await _restartVoice();
  }

  Future<void> _interrupt() async {
    await _controller?.interrupt();
  }

  @override
  void dispose() {
    _lifecycleGeneration += 1;

    final sub = _snapshotSub;
    final controller = _controller;

    _snapshotSub = null;
    _controller = null;

    unawaited(sub?.cancel() ?? Future<void>.value());
    unawaited(controller?.dispose() ?? Future<void>.value());

    _client.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final partial = _snapshot.partialTranscript.trim();
    final userText = partial.isNotEmpty
        ? partial
        : (_snapshot.lastUserText ?? '');
    final assistantText = _snapshot.lastAssistantText ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFF0E0316),
      body: Stack(
        children: [
          Positioned.fill(
            child: Opacity(
              opacity: 0.34,
              child: ArborVisual(
                state: _visualState,
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
                                  'same Arbor, spoken',
                                  style: TextStyle(
                                    color: Colors.white60,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: widget.active ? _newThread : null,
                            child: const Text('New thread'),
                          ),
                        ],
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: _snapshot.state ==
                                VoiceSessionState.speaking
                            ? _interrupt
                            : null,
                        child: Container(
                          width: 150,
                          height: 150,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _snapshot.state ==
                                    VoiceSessionState.listening
                                ? const Color(0xFFF3387A)
                                    .withOpacity(0.24)
                                : Colors.white.withOpacity(0.06),
                            border: Border.all(
                              color: _snapshot.state ==
                                      VoiceSessionState.listening
                                  ? const Color(0xFFF3387A)
                                  : Colors.white24,
                              width: 2,
                            ),
                          ),
                          child: Icon(
                            _snapshot.state ==
                                    VoiceSessionState.speaking
                                ? Icons.hearing_rounded
                                : _snapshot.state ==
                                        VoiceSessionState.listening
                                    ? Icons.mic_rounded
                                    : Icons.mic_none_rounded,
                            size: 58,
                            color: Colors.white,
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
                      if (_snapshot.state ==
                          VoiceSessionState.speaking) ...[
                        const SizedBox(height: 10),
                        TextButton.icon(
                          onPressed: _interrupt,
                          icon: const Icon(Icons.mic_rounded),
                          label: const Text('Interrupt'),
                        ),
                      ],
                      if (_snapshot.state ==
                          VoiceSessionState.error) ...[
                        const SizedBox(height: 10),
                        TextButton.icon(
                          onPressed: _restartVoice,
                          icon: const Icon(Icons.refresh_rounded),
                          label: const Text('Restart Voice'),
                        ),
                      ],
                      const SizedBox(height: 28),
                      _VoiceTextCard(
                        label: 'YOU',
                        text: userText,
                        emptyText: _snapshot.state ==
                                VoiceSessionState.listening
                            ? 'Listening…'
                            : 'Nothing spoken yet.',
                      ),
                      const SizedBox(height: 12),
                      _VoiceTextCard(
                        label: 'ARBOR',
                        text: assistantText,
                        emptyText: 'No reply yet.',
                      ),
                      const Spacer(),
                      const Text(
                        'Hands-free • speak naturally • interrupt by speaking',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white38,
                          fontSize: 12,
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
