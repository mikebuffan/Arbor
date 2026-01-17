import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:frontend/api/arbor_api.dart'; // exports chatApi (ChatApi instance)

class ChatTestPage extends StatefulWidget {
  const ChatTestPage({super.key});

  @override
  State<ChatTestPage> createState() => _ChatTestPageState();
}

class _ChatTestPageState extends State<ChatTestPage> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _msgCtrl = TextEditingController(text: 'Good morning. I am feeling a little weird today.');

  bool _loading = false;
  String _output = '';

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
      _output = 'New thread started (next send will create a new conversation).';
    });
  }

  Future<void> _send() async {
    setState(() {
      _loading = true;
      _output = '';
    });

    try {
      if (!_isAuthed) throw Exception('Not logged in');
      final text = _msgCtrl.text.trim();
      if (text.isEmpty) throw Exception('Message is empty');

      final res = await chatApi.sendMessage(
        projectId: _projectId,
        conversationId: _conversationId,
        userText: text,
      );

      setState(() {
        _projectId = res.projectId;
        _conversationId = res.conversationId;
      });

      _setOut(
        'assistantText:\n${res.assistantText}\n\n'
        'projectId: ${res.projectId}\n'
        'conversationId: ${res.conversationId}',
      );
    } catch (e) {
      _setOut(e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _msgCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authed = _isAuthed;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Arbor Chat Test'),
        actions: [
          if (authed)
            TextButton(
              onPressed: _loading ? null : _signOut,
              child: const Text('Sign out'),
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Auth row
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white24),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Auth: ${authed ? "SIGNED IN" : "SIGNED OUT"}'),
                  const SizedBox(height: 6),
                  Text('userId: ${_userId ?? "(none)"}'),
                  const SizedBox(height: 12),
                  if (!authed) ...[
                    TextField(
                      controller: _emailCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _passCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        border: OutlineInputBorder(),
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
                  ] else ...[
                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: _loading ? null : _newThread,
                          child: const Text('New thread'),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'projectId: ${_projectId ?? "(null)"}\nconversationId: ${_conversationId ?? "(null)"}',
                          style: const TextStyle(fontSize: 12, color: Colors.white70),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Message box
            TextField(
              controller: _msgCtrl,
              minLines: 2,
              maxLines: 6,
              decoration: const InputDecoration(
                labelText: 'Message',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 12),

            // Send
            Row(
              children: [
                ElevatedButton(
                  onPressed: (_loading || !authed) ? null : _send,
                  child: Text(_loading ? 'Sending…' : 'Send'),
                ),
                const SizedBox(width: 12),
                if (!authed)
                  const Text('Sign in to send', style: TextStyle(color: Colors.white70)),
              ],
            ),

            const SizedBox(height: 16),

            // Output
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  border: Border.all(color: Colors.white24),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    _output.isEmpty ? '(no output yet)' : _output,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
