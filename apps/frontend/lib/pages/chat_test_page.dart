import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/services.dart';
import 'package:frontend/api/arbor_api_client.dart';
import 'package:frontend/api/chat_api.dart';
import 'package:frontend/config/arbor_config.dart';
import 'dart:async';

class ArborHeader extends StatelessWidget {
  final bool isAuthed;
  final String? userId;
  final String? projectId;
  final String? conversationId;
  final VoidCallback? onNewThread;

  const ArborHeader({
    super.key,
    required this.isAuthed,
    this.userId,
    this.projectId,
    this.conversationId,
    this.onNewThread,
  });

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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: Colors.white.withOpacity(0.10)),
                  ),
                  backgroundColor: Colors.white.withValues(),
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
        Divider(color: Colors.white.withOpacity(0.08), height: 1),
        const SizedBox(height: 18),
      ],
    );
  }
}

class _AuthPill extends StatelessWidget {
  final bool isAuthed;

  const _AuthPill({required this.isAuthed});

  @override
  Widget build(BuildContext context) {
    final label = isAuthed ? 'Signed in' : 'Not signed in';
    final icon = isAuthed ? Icons.verified_rounded : Icons.lock_outline_rounded;
    final iconColor = isAuthed ? Colors.greenAccent : Colors.orangeAccent;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.10)),
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
  final bool isUser;
  final String text;

  _ChatMessage({required this.isUser, required this.text});
}

class _ChatTestPageState extends State<ChatTestPage> {
  final List<_ChatMessage> _messages = [];
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _msgCtrl = TextEditingController(text: '');
  final _msgFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _passFocus = FocusNode();

  final _scrollCtrl = ScrollController();
  bool _isTyping = false;

  bool _loading = false;
  String _output = '';

  StreamSubscription<AuthState>? _authSub;

  String? _projectId;
  String? _conversationId;

  SupabaseClient get _supabase => Supabase.instance.client;
  ChatApi get _chatApi => ChatApi(
        ArborApiClient(baseUrl: ArborConfig.apiBaseUrl),
      );

  bool get _isAuthed => _supabase.auth.currentSession?.accessToken != null;
  String? get _userId => _supabase.auth.currentUser?.id;

  void _setOut(String s) => setState(() => _output = s);

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

      if (res.user == null)
        throw Exception('Sign-in failed (no user returned)');

      setState(() {});
      _setOut('Signed in as ${res.user!.email}\nuserId: ${res.user!.id}');
    } on AuthException catch (e) {
      _setOut('Auth error: ${e.message}');
    } catch (e) {
      _setOut(e.toString());
    } finally {
      setState(() => _loading = false);
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
    setState(() {
      _loading = true;
      _output = '';
    });

    try {
      await _supabase.auth.signOut();
      setState(() {
        _projectId = null;
        _conversationId = null;
        _messages.clear();
        _isTyping = false;
      });
      _setOut('Signed out.');
    } catch (e) {
      _setOut(e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  void _newThread() {
    setState(() {
      _conversationId = null;
      _messages.clear();
    });
  }

  bool _resuming = false;

  Future<void> _resumeLastConversation() async {
    if (_resuming) return;
    _resuming = true;

    try {
      final projectId = _projectId;
      if (projectId == null) return;

      final lastId = await _chatApi.getLastConversationId(projectId: projectId);
      if (!mounted) return;

      setState(() {
        _conversationId = lastId ?? _conversationId;
      });
    } finally {
      _resuming = false;
    }
  }

  Future<void> _maybeResumeAfterProjectArrives(
      {String? previousProjectId}) async {
    // If projectId just got set (first response) and we have no conversation yet,
    // attempt to resume. If the backend endpoint returns null, we’ll fall back to
    // whatever the chat response gives us.
    if (_projectId != null &&
        (previousProjectId == null || previousProjectId != _projectId)) {
      if (_conversationId == null) {
        await _resumeLastConversation();
      }
    }
  }

  Future<void> _send() async {
    if (_loading) return;

    setState(() {
      _loading = true;
      _isTyping = false;
    });

    try {
      if (!_isAuthed) throw Exception('Not logged in');

      final text = _msgCtrl.text.trim();
      if (text.isEmpty) throw Exception('Message is empty');

      setState(() {
        _messages.add(_ChatMessage(isUser: true, text: text));
        _isTyping = true;
      });

      _msgCtrl.clear();
      _msgFocus.requestFocus();
      _scrollToBottom();

      final prevProjectId = _projectId;

      final res = await _chatApi.sendMessage(
        projectId: _projectId,
        conversationId: _conversationId,
        userText: text,
      );

      // Project can be assigned on first response; try to resume if needed.
      setState(() {
        _projectId = res.projectId;
      });
      await _maybeResumeAfterProjectArrives(previousProjectId: prevProjectId);

      setState(() {
        // IMPORTANT: don’t overwrite a resumed conversationId.
        _conversationId = _conversationId ?? res.conversationId;
        _isTyping = false;
        _messages.add(_ChatMessage(isUser: false, text: res.assistantText));
      });

      _scrollToBottom();
    } catch (e) {
      setState(() {
        _isTyping = false;
        _messages.add(_ChatMessage(isUser: false, text: '⚠️ ${e.toString()}'));
      });
      _scrollToBottom();
    } finally {
      setState(() => _loading = false);
    }
  }

  VoidCallback? _msgListener;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!_isAuthed) _emailFocus.requestFocus();
    });

    _authSub = _supabase.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (!mounted) return;

      if (session == null) {
        setState(() {
          _projectId = null;
          _conversationId = null;
          _messages.clear();
          _isTyping = false;
        });
      } else {
        // Session exists (startup/refresh/sign-in). If we already have a projectId
        // and no active conversation, attempt to resume.
        if (_projectId != null && _conversationId == null) {
          _resumeLastConversation();
        }
        setState(() {});
      }
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
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
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
                          border:
                              Border.all(color: Colors.white.withOpacity(0.08)),
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
                                      _loading ? 'Signing in…' : 'Sign in'),
                                ),
                              ],
                            ),
                            if (_output.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(
                                _output,
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 12),
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
                                  fontSize: 12, color: Colors.white70),
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
                        const SingleActivator(LogicalKeyboardKey.enter):
                            const _SendIntent(),
                        const SingleActivator(LogicalKeyboardKey.enter,
                            shift: true): const _NewlineIntent(),
                        const SingleActivator(LogicalKeyboardKey.enter,
                            control: true): const _SendIntent(),
                      },
                      child: Actions(
                        actions: <Type, Action<Intent>>{
                          _SendIntent: CallbackAction<_SendIntent>(
                            onInvoke: (intent) {
                              if (_loading || !_isAuthed) return null;
                              if (_msgCtrl.text.trim().isEmpty) return null;
                              _send();
                              return null;
                            },
                          ),
                          _NewlineIntent: CallbackAction<_NewlineIntent>(
                            onInvoke: (intent) {
                              final t = _msgCtrl.text;
                              final sel = _msgCtrl.selection;

                              final start =
                                  sel.start >= 0 ? sel.start : t.length;
                              final end = sel.end >= 0 ? sel.end : t.length;

                              final newText = t.replaceRange(start, end, "\n");
                              _msgCtrl.value = TextEditingValue(
                                text: newText,
                                selection:
                                    TextSelection.collapsed(offset: start + 1),
                              );
                              return null;
                            },
                          ),
                        },
                        child: Focus(
                          autofocus: authed,
                          child: TextField(
                            autofocus:
                                false, // avoid double-autofocus when authed
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
                            style: const TextStyle(color: Colors.white70),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: (_loading ||
                                  !authed ||
                                  _msgCtrl.text.trim().isEmpty)
                              ? null
                              : _send,
                          child: Text(_loading ? 'Arbor is thinking…' : 'Send'),
                        ),
                        const SizedBox(width: 12),
                        if (!authed)
                          const Text('Sign in to send',
                              style: TextStyle(color: Colors.white70)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: ListView.separated(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.only(top: 8),
                        itemCount: _messages.length + (_isTyping ? 1 : 0),
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final isTypingRow =
                              _isTyping && i == _messages.length;

                          final m = isTypingRow
                              ? _ChatMessage(
                                  isUser: false, text: 'Arbor is thinking…')
                              : _messages[i];

                          return Align(
                            alignment: m.isUser
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              constraints: const BoxConstraints(maxWidth: 560),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: m.isUser
                                    ? const Color(0xFFF3387A).withOpacity(0.18)
                                    : Colors.white.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                    color: Colors.white.withOpacity(0.08)),
                              ),
                              child: Text(
                                m.text,
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
