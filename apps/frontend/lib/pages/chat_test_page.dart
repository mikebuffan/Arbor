import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/services.dart';
import 'package:frontend/api/arbor_api.dart';
import 'dart:async';
import 'dart:ui';

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
    final authed = _isAuthed;

    return Scaffold(
      backgroundColor: const Color(0xFF0E0316),
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.25),
                radius: 1.2,
                colors: [
                  Color(0xFF12081A),
                  Color(0xFF0E0316),
                  Color(0xFF06020A),
                ],
                stops: [0.0, 0.55, 1.0],
              ),
            ),
          ),

          const Positioned(left: -140, top: -140, child: _GlowOrb(size: 320)),
          const Positioned(right: -140, top: -140, child: _GlowOrb(size: 320)),
          const Positioned(left: -160, bottom: -160, child: _GlowOrb(size: 360)),
          const Positioned(right: -160, bottom: -160, child: _GlowOrb(size: 360)),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Column(
                children: [
                  _TopArborBar(
                    isAuthed: authed,
                    onNewThread: authed ? _newThread : null,
                    onSignOut: authed ? _signOut : null,
                    loading: _loading,
                  ),

                  const SizedBox(height: 12),

                  Expanded(
                    child: ListView.separated(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.only(top: 8, bottom: 12),
                      itemCount: _messages.length + (_isTyping ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        final isTypingRow = _isTyping && i == _messages.length;
                        final m = isTypingRow
                            ? _ChatMessage(isUser: false, text: 'Arbor is thinking…')
                            : _messages[i];

                        return _ChatBubble(
                          text: m.text,
                          isUser: m.isUser,
                          isTyping: isTypingRow,
                        );
                      },
                    ),
                  ),

                  if (!authed) ...[
                    _LoginPanel(
                      loading: _loading,
                      emailCtrl: _emailCtrl,
                      passCtrl: _passCtrl,
                      emailFocus: _emailFocus,
                      passFocus: _passFocus,
                      onSignIn: _signIn,
                    ),
                    const SizedBox(height: 12),
                  ],

                  _ChatInputBar(
                    enabled: authed && !_loading,
                    controller: _msgCtrl,
                    focusNode: _msgFocus,
                    onSend: (_loading || !authed || _msgCtrl.text.trim().isEmpty) ? null : _send,
                  ),
                ],
              ),
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

      setState(() {
        _messages.add(_ChatMessage(isUser: true, text: text));
        _isTyping = true;
      });

      _msgCtrl.clear();
      _msgFocus.requestFocus();
      _scrollToBottom();

      final res = await chatApi.sendMessage(
        projectId: _projectId,
        conversationId: _conversationId,
        userText: text,
      );

      setState(() {
        _projectId = res.projectId;
        _conversationId = res.conversationId;
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

                    Shortcuts(
                      shortcuts: <ShortcutActivator, Intent>{
                        const SingleActivator(LogicalKeyboardKey.enter): const _SendIntent(),
                        const SingleActivator(LogicalKeyboardKey.enter, shift: true): const _NewlineIntent(),
                        const SingleActivator(LogicalKeyboardKey.enter, control: true): const _SendIntent(),
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

class _GlowOrb extends StatelessWidget {
  final double size;
  const _GlowOrb({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            const Color(0xFFF3387A).withOpacity(0.55),
            const Color(0xFFF3387A).withOpacity(0.18),
            Colors.transparent,
          ],
          stops: const [0.0, 0.38, 1.0],
        ),
      ),
    );
  }
}

class _TopArborBar extends StatelessWidget {
  final bool isAuthed;
  final VoidCallback? onNewThread;
  final VoidCallback? onSignOut;
  final bool loading;

  const _TopArborBar({
    required this.isAuthed,
    required this.onNewThread,
    required this.onSignOut,
    required this.loading,
  });

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;

    return Column(
      children: [
        Row(
          children: [
            Text(
              "ARBOR",
              style: t.headlineSmall?.copyWith(
                color: const Color(0xFF7A7F88).withOpacity(0.95),
                letterSpacing: 6,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            if (isAuthed && onNewThread != null)
              _GlassMiniButton(label: "New thread", onTap: loading ? null : onNewThread),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          height: 2,
          width: 220,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(99),
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                const Color(0xFFF3387A).withOpacity(0.85),
                Colors.transparent,
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _StatusPill(isAuthed: isAuthed),
            const Spacer(),
            if (isAuthed && onSignOut != null)
              TextButton(
                onPressed: loading ? null : onSignOut,
                style: TextButton.styleFrom(foregroundColor: Colors.white70),
                child: const Text("Sign out"),
              ),
          ],
        ),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  final bool isAuthed;
  const _StatusPill({required this.isAuthed});

  @override
  Widget build(BuildContext context) {
    final label = isAuthed ? "Signed in" : "Not signed in";
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
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }
}

class _GlassMiniButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;

  const _GlassMiniButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Material(
          color: Colors.white.withOpacity(0.06),
          child: InkWell(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withOpacity(0.10)),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(label, style: const TextStyle(color: Colors.white70)),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final String text;
  final bool isUser;
  final bool isTyping;

  const _ChatBubble({
    required this.text,
    required this.isUser,
    required this.isTyping,
  });

  @override
  Widget build(BuildContext context) {
    final bubbleColor = isUser
        ? const Color(0xFFF3387A).withOpacity(0.22)
        : Colors.white.withOpacity(0.06);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 290),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: bubbleColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.10)),
              boxShadow: isUser
                  ? [
                      BoxShadow(
                        blurRadius: 22,
                        spreadRadius: 1,
                        color: const Color(0xFFF3387A).withOpacity(0.25),
                      ),
                    ]
                  : null,
            ),
            child: Text(
              text,
              style: TextStyle(
                color: Colors.white.withOpacity(0.85),
                height: 1.35,
                fontStyle: isTyping ? FontStyle.italic : FontStyle.normal,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChatInputBar extends StatelessWidget {
  final bool enabled;
  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback? onSend;

  const _ChatInputBar({
    required this.enabled,
    required this.controller,
    required this.focusNode,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.10)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  enabled: enabled,
                  minLines: 1,
                  maxLines: 4,
                  style: TextStyle(color: Colors.white.withOpacity(0.90)),
                  decoration: InputDecoration(
                    hintText: "Type a message…",
                    hintStyle: TextStyle(color: Colors.white.withOpacity(0.45)),
                    border: InputBorder.none,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton(
                onPressed: onSend,
                icon: Icon(Icons.send_rounded, color: Colors.white.withOpacity(0.80)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoginPanel extends StatelessWidget {
  final bool loading;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final FocusNode emailFocus;
  final FocusNode passFocus;
  final VoidCallback onSignIn;

  const _LoginPanel({
    required this.loading,
    required this.emailCtrl,
    required this.passCtrl,
    required this.emailFocus,
    required this.passFocus,
    required this.onSignIn,
  });

  @override
  Widget build(BuildContext context) {
    InputDecoration deco(String label) => InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: Colors.white.withOpacity(0.65)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: Colors.white.withOpacity(0.12)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: const Color(0xFFF3387A).withOpacity(0.55)),
          ),
          filled: true,
          fillColor: Colors.white.withOpacity(0.03),
        );

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.10)),
          ),
          child: Column(
            children: [
              TextField(
                controller: emailCtrl,
                focusNode: emailFocus,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                onSubmitted: (_) => passFocus.requestFocus(),
                style: TextStyle(color: Colors.white.withOpacity(0.90)),
                decoration: deco("Email"),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: passCtrl,
                focusNode: passFocus,
                obscureText: true,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => loading ? null : onSignIn(),
                style: TextStyle(color: Colors.white.withOpacity(0.90)),
                decoration: deco("Password"),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: ElevatedButton(
                  onPressed: loading ? null : onSignIn,
                  child: Text(loading ? "Signing in…" : "Sign in"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
