import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/services.dart';
import 'package:frontend/api/arbor_api.dart'; // exports chatApi (ChatApi instance)
import 'dart:async';

class ArborHeader extends StatelessWidget {
  final bool isAuthed;
  final String? userId;
  final VoidCallback? onNewThread;

  const ArborHeader({
    super.key,
    required this.isAuthed,
    this.userId,
    this.onNewThread,   
  });

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title + Subtitle
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

        // Auth + Controls row
        Row(
          children: [
            _AuthPill(isAuthed: isAuthed),
            const SizedBox(width: 12),

            // Optional: keep this if you want New Thread visible only when authed
            if (onNewThread != null) ...[
              const Spacer(),
              TextButton(
                onPressed: isAuthed ? onNewThread : null,
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white70,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: Colors.white.withOpacity(0.10)),
                  ),
                  backgroundColor: Colors.white.withOpacity(0.04),
                ),
                child: const Text('New thread'),
              ),
            ],
          ],
        ),

        // Optional: hide userId in “pretty mode” (recommended). Keep off by default.
        // If you want it while debugging, uncomment:
        /*
        if (isAuthed && (userId?.isNotEmpty ?? false)) ...[
          const SizedBox(height: 8),
          Text(
            'userId: $userId',
            style: t.bodySmall?.copyWith(color: Colors.white54),
          ),
        ],
        */

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

  // Persist thread ids
  String? _projectId;
  String? _conversationId;

  SupabaseClient get _supabase => Supabase.instance.client;

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

      if (res.user == null) throw Exception('Sign-in failed (no user returned)');

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

      // 1) Show the user's message immediately
      setState(() {
        _messages.add(_ChatMessage(isUser: true, text: text));
        _isTyping = true;
      });

      // Clear input for “snappy” feel
      _msgCtrl.clear();
      _msgFocus.requestFocus();
      _scrollToBottom();

      // 2) Call backend
      final res = await chatApi.sendMessage(
        projectId: _projectId,
        conversationId: _conversationId,
        userText: text,
      );

      // 3) Persist ids + show assistant
      setState(() {
        _projectId = res.projectId;
        _conversationId = res.conversationId;
        _isTyping = false;
        _messages.add(_ChatMessage(isUser: false, text: res.assistantText));
      });

      _scrollToBottom();
    } catch (e) {
      // Show the error as an assistant bubble (feels nicer than a debug box)
      setState(() {
        _isTyping = false;
        _messages.add(_ChatMessage(isUser: false, text: '⚠️ ${e.toString()}'));
      });
      _scrollToBottom();
    } finally {
      setState(() => _loading = false);
    }
  }

  // Put this near your fields (keep it where it is if you want)
  VoidCallback? _msgListener;

  @override
  void initState() {
    super.initState();

    //Autofocus
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!_isAuthed) _emailFocus.requestFocus();
    });
    
    // Auth listener
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
        // optional: just rebuild to refresh "authed" UI
        setState(() {});
      }
    });

    // Text change listener (enables/disables Send as you type)
    _msgListener = () {
      if (!mounted) return;
      setState(() {});
    };
    _msgCtrl.addListener(_msgListener!);
  }

  @override
  void dispose() {
    // Remove listeners BEFORE disposing controllers
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
      backgroundColor: const Color(0xFF0E0316), // deep charcoal/purple-black
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 980),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04), // glass
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Column(
                  children: [
                    // Header + auth pill
                    ArborHeader(
                      isAuthed: authed,
                      userId: _userId,
                      onNewThread: authed ? _newThread : null,
                    ),

                    // Login / debug line (your Step 1 block)
                    if (!authed) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.08)),
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
                                  child: Text(_loading ? 'Signing in…' : 'Sign in'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Ready.',
                              style: const TextStyle(fontSize: 12, color: Colors.white70),
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

                    // Message box
                    Shortcuts(
                      shortcuts: <ShortcutActivator, Intent>{
                        // Enter sends
                        const SingleActivator(LogicalKeyboardKey.enter): const _SendIntent(),
                        // Shift+Enter inserts newline
                        const SingleActivator(LogicalKeyboardKey.enter, shift: true): const _NewlineIntent(),
                        // Optional: Ctrl+Enter sends (Windows habit)
                        const SingleActivator(LogicalKeyboardKey.enter, control: true): const _SendIntent(),
                      },
                      child: Actions(
                        actions: <Type, Action<Intent>>{
                          _SendIntent: CallbackAction<_SendIntent>(
                            onInvoke: (intent) {
                              if (_loading || !_isAuthed) return null;
                              // Only send if there's real text
                              if (_msgCtrl.text.trim().isEmpty) return null;
                              _send();
                              return null;
                            },
                          ),
                          _NewlineIntent: CallbackAction<_NewlineIntent>(
                            onInvoke: (intent) {
                              final t = _msgCtrl.text;
                              final sel = _msgCtrl.selection;

                              // Insert newline at caret (or replace selection)
                              final start = sel.start >= 0 ? sel.start : t.length;
                              final end = sel.end >= 0 ? sel.end : t.length;

                              final newText = t.replaceRange(start, end, "\n");
                              _msgCtrl.value = TextEditingValue(
                                text: newText,
                                selection: TextSelection.collapsed(offset: start + 1),
                              );
                              return null;
                            },
                          ),
                        },
                        child: Focus(
                          autofocus: authed,
                          child: TextField(
                            autofocus: true,
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
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Send
                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: (_loading || !authed || _msgCtrl.text.trim().isEmpty) ? null : _send,
                          child: Text(_loading ? 'Arbor is thinking…' : 'Send'),
                        ),
                        const SizedBox(width: 12),
                        if (!authed)
                          const Text('Sign in to send', style: TextStyle(color: Colors.white70)),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Output
                    Expanded(
                      child: ListView.separated(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.only(top: 8),
                        itemCount: _messages.length + (_isTyping ? 1 : 0),
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final isTypingRow = _isTyping && i == _messages.length;

                          final m = isTypingRow
                              ? _ChatMessage(isUser: false, text: 'Arbor is thinking…')
                              : _messages[i];

                          return Align(
                            alignment: m.isUser ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              constraints: const BoxConstraints(maxWidth: 560),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: m.isUser
                                    ? const Color(0xFFF3387A).withOpacity(0.18)
                                    : Colors.white.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.white.withOpacity(0.08)),
                              ),
                              child: Text(
                                m.text,
                                style: TextStyle(
                                  color: Colors.white70,
                                  height: 1.4,
                                  fontStyle: isTypingRow ? FontStyle.italic : FontStyle.normal,
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

