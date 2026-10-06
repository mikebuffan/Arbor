import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:frontend/api/arbor_api.dart';
import 'package:frontend/api/arbor_session.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ArborHeader extends StatelessWidget {
  const ArborHeader({
    super.key,
    required this.isAuthed,
    this.userId,
    this.projectId,
    this.conversationId,
    this.onNewThread,
  });

  final bool isAuthed;
  final String? userId;
  final String? projectId;
  final String? conversationId;
  final VoidCallback? onNewThread;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ARBOR',
          style: t.headlineMedium?.copyWith(
            fontWeight: FontWeight.w500,
            letterSpacing: 2.0,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'a reflective companion',
          style: t.bodySmall?.copyWith(
            color: Colors.white70,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            _AuthPill(isAuthed: isAuthed),
            const SizedBox(width: 12),
            if (onNewThread != null) ...[
              const Spacer(),
              TextButton(
                onPressed: isAuthed ? onNewThread : null,
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white70,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(
                      color: Colors.white.withOpacity(0.10),
                    ),
                  ),
                  backgroundColor: Colors.white.withOpacity(0.04),
                ),
                child: const Text('New thread'),
              ),
            ],
          ],
        ),
        if (isAuthed && (userId?.isNotEmpty ?? false)) ...[
          const SizedBox(height: 8),
          Text(
            'userId: $userId, projectId: $projectId, conversationId: $conversationId',
            style: t.bodySmall?.copyWith(color: Colors.white54),
          ),
        ],
        const SizedBox(height: 18),
        Divider(
          color: Colors.white.withOpacity(0.08),
          height: 1,
        ),
        const SizedBox(height: 18),
      ],
    );
  }
}

class _AuthPill extends StatelessWidget {
  const _AuthPill({required this.isAuthed});

  final bool isAuthed;

  @override
  Widget build(BuildContext context) {
    final label = isAuthed ? 'Signed in' : 'Not signed in';
    final icon = isAuthed
        ? Icons.verified_rounded
        : Icons.lock_outline_rounded;
    final iconColor =
        isAuthed ? Colors.greenAccent : Colors.orangeAccent;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 10,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: Colors.white.withOpacity(0.10),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 8),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.white70,
                ),
          ),
        ],
      ),
    );
  }
}

class ChatTestPage extends StatefulWidget {
  const ChatTestPage({super.key});

  @override
  State<ChatTestPage> createState() => _ChatTestPageState();
}

class _ChatMessage {
  const _ChatMessage({
    required this.isUser,
    required this.text,
  });

  final bool isUser;
  final String text;
}

class _ChatTestPageState extends State<ChatTestPage> {
  final List<_ChatMessage> _messages = [];
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _msgCtrl = TextEditingController();
  final _msgFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _passFocus = FocusNode();
  final _scrollCtrl = ScrollController();

  bool _isTyping = false;
  bool _loading = false;
  String _output = '';

  StreamSubscription<AuthState>? _authSub;
  VoidCallback? _msgListener;

  String? _projectId;
  String? _conversationId;

  SupabaseClient get _supabase => Supabase.instance.client;

  bool get _isAuthed =>
      _supabase.auth.currentSession?.accessToken != null;

  String? get _userId => _supabase.auth.currentUser?.id;

  void _setOut(String value) {
    if (!mounted) return;
    setState(() => _output = value);
  }

  Future<void> _restoreSharedSession() async {
    final userId = _userId;
    if (userId == null) return;

    final shared = await ArborSession.instance.contextFor(userId);
    if (!mounted || _userId != userId) return;

    setState(() {
      _projectId = shared?.projectId;
      _conversationId = shared?.conversationId;
    });
  }

  Future<void> _signIn() async {
    setState(() {
      _loading = true;
      _output = '';
    });

    try {
      final email = _emailCtrl.text.trim();
      final pass = _passCtrl.text;

      if (email.isEmpty || pass.isEmpty) {
        throw Exception('Email and password required');
      }

      final res = await _supabase.auth.signInWithPassword(
        email: email,
        password: pass,
      );

      if (res.user == null) {
        throw Exception('Sign-in failed (no user returned)');
      }

      await _restoreSharedSession();
      _setOut(
        'Signed in as ${res.user!.email}\nuserId: ${res.user!.id}',
      );
    } on AuthException catch (error) {
      _setOut('Auth error: ${error.message}');
    } catch (error) {
      _setOut(error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;

      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _signOut() async {
    final userId = _userId;

    setState(() {
      _loading = true;
      _output = '';
    });

    try {
      await _supabase.auth.signOut();

      if (userId != null) {
        await ArborSession.instance.clearStoredUser(userId);
      }

      if (!mounted) return;

      setState(() {
        _projectId = null;
        _conversationId = null;
        _messages.clear();
        _isTyping = false;
      });

      _setOut('Signed out.');
    } catch (error) {
      _setOut(error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _newThread() async {
    final userId = _userId;

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
      _messages.clear();
      _isTyping = false;
    });
  }

  Future<void> _send() async {
    if (_loading) return;

    setState(() {
      _loading = true;
      _isTyping = false;
    });

    try {
      if (!_isAuthed) {
        throw Exception('Not logged in');
      }

      final text = _msgCtrl.text.trim();
      if (text.isEmpty) {
        throw Exception('Message is empty');
      }

      setState(() {
        _messages.add(
          _ChatMessage(
            isUser: true,
            text: text,
          ),
        );
        _isTyping = true;
      });

      _msgCtrl.clear();
      _msgFocus.requestFocus();
      _scrollToBottom();

      final res = await ArborApi.sendMessage(
        projectId: _projectId,
        conversationId: _conversationId,
        userText: text,
      );

      if (!mounted) return;

      setState(() {
        _projectId = res.projectId;
        _conversationId = res.conversationId;
        _isTyping = false;
        _messages.add(
          _ChatMessage(
            isUser: false,
            text: res.assistantText,
          ),
        );
      });

      _scrollToBottom();
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _isTyping = false;
        _messages.add(
          _ChatMessage(
            isUser: false,
            text: '⚠️ ${error.toString()}',
          ),
        );
      });
      _scrollToBottom();
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      if (_isAuthed) {
        unawaited(_restoreSharedSession());
      } else {
        _emailFocus.requestFocus();
      }
    });

    _authSub = _supabase.auth.onAuthStateChange.listen((data) {
      if (!mounted) return;

      if (data.session == null) {
        setState(() {
          _projectId = null;
          _conversationId = null;
          _messages.clear();
          _isTyping = false;
        });
        return;
      }

      unawaited(_restoreSharedSession());
      setState(() {});
    });

    _msgListener = () {
      if (!mounted) return;
      setState(() {});
    };
    _msgCtrl.addListener(_msgListener!);
  }

  @override
  void dispose() {
    if (_msgListener != null) {
      _msgCtrl.removeListener(_msgListener!);
    }

    _authSub?.cancel();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _emailFocus.dispose();
    _passFocus.dispose();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    _msgFocus.dispose();

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authed = _isAuthed;

    return Scaffold(
      backgroundColor: const Color(0xFF0E0316),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 980),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.08),
                  ),
                ),
                child: Column(
                  children: [
                    ArborHeader(
                      isAuthed: authed,
                      userId: _userId,
                      projectId: _projectId,
                      conversationId: _conversationId,
                      onNewThread: authed ? _newThread : null,
                    ),
                    if (!authed) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.08),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            TextField(
                              autofocus: true,
                              controller: _emailCtrl,
                              focusNode: _emailFocus,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              onSubmitted: (_) {
                                _passFocus.requestFocus();
                              },
                              decoration: InputDecoration(
                                labelText: 'Email',
                                border: const OutlineInputBorder(),
                                filled: true,
                                fillColor: Colors.white.withOpacity(0.03),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _passCtrl,
                              obscureText: true,
                              focusNode: _passFocus,
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) {
                                if (_loading) return;
                                _signIn();
                              },
                              decoration: InputDecoration(
                                labelText: 'Password',
                                border: const OutlineInputBorder(),
                                filled: true,
                                fillColor: Colors.white.withOpacity(0.03),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                ElevatedButton(
                                  onPressed: _loading ? null : _signIn,
                                  child: Text(
                                    _loading ? 'Signing in…' : 'Sign in',
                                  ),
                                ),
                              ],
                            ),
                            if (_output.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(
                                _output,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ] else ...[
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Ready.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: _loading ? null : _signOut,
                            child: const Text('Sign out'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                    Shortcuts(
                      shortcuts: <ShortcutActivator, Intent>{
                        const SingleActivator(
                          LogicalKeyboardKey.enter,
                        ): const _SendIntent(),
                        const SingleActivator(
                          LogicalKeyboardKey.enter,
                          shift: true,
                        ): const _NewlineIntent(),
                        const SingleActivator(
                          LogicalKeyboardKey.enter,
                          control: true,
                        ): const _SendIntent(),
                      },
                      child: Actions(
                        actions: <Type, Action<Intent>>{
                          _SendIntent: CallbackAction<_SendIntent>(
                            onInvoke: (_) {
                              if (_loading || !_isAuthed) return null;
                              if (_msgCtrl.text.trim().isEmpty) return null;
                              _send();
                              return null;
                            },
                          ),
                          _NewlineIntent: CallbackAction<_NewlineIntent>(
                            onInvoke: (_) {
                              final text = _msgCtrl.text;
                              final selection = _msgCtrl.selection;
                              final start = selection.start >= 0
                                  ? selection.start
                                  : text.length;
                              final end = selection.end >= 0
                                  ? selection.end
                                  : text.length;

                              final nextText = text.replaceRange(
                                start,
                                end,
                                '\n',
                              );

                              _msgCtrl.value = TextEditingValue(
                                text: nextText,
                                selection: TextSelection.collapsed(
                                  offset: start + 1,
                                ),
                              );
                              return null;
                            },
                          ),
                        },
                        child: Focus(
                          autofocus: authed,
                          child: TextField(
                            autofocus: false,
                            focusNode: _msgFocus,
                            controller: _msgCtrl,
                            minLines: 2,
                            maxLines: 6,
                            textInputAction: TextInputAction.newline,
                            decoration: InputDecoration(
                              labelText: 'What’s on your mind?',
                              border: const OutlineInputBorder(),
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.03),
                            ),
                            style: const TextStyle(
                              color: Colors.white70,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: _loading ||
                                  !authed ||
                                  _msgCtrl.text.trim().isEmpty
                              ? null
                              : _send,
                          child: Text(
                            _loading ? 'Arbor is thinking…' : 'Send',
                          ),
                        ),
                        const SizedBox(width: 12),
                        if (!authed)
                          const Text(
                            'Sign in to send',
                            style: TextStyle(color: Colors.white70),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: ListView.separated(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.only(top: 8),
                        itemCount:
                            _messages.length + (_isTyping ? 1 : 0),
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final isTypingRow =
                              _isTyping && index == _messages.length;

                          final message = isTypingRow
                              ? const _ChatMessage(
                                  isUser: false,
                                  text: 'Arbor is thinking…',
                                )
                              : _messages[index];

                          return Align(
                            alignment: message.isUser
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              constraints: const BoxConstraints(
                                maxWidth: 560,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: message.isUser
                                    ? const Color(0xFFF3387A)
                                        .withOpacity(0.18)
                                    : Colors.white.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.08),
                                ),
                              ),
                              child: Text(
                                message.text,
                                style: TextStyle(
                                  color: Colors.white70,
                                  height: 1.4,
                                  fontStyle: isTypingRow
                                      ? FontStyle.italic
                                      : FontStyle.normal,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SendIntent extends Intent {
  const _SendIntent();
}

class _NewlineIntent extends Intent {
  const _NewlineIntent();
}
