import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../api/arbor_api_client.dart';
import '../api/turn_id.dart';
import '../widgets/arbor_visual.dart';

const _pink = Color(0xFFF3387A);

class PublicArborApp extends StatefulWidget {
  const PublicArborApp({super.key, required this.apiUrl});
  final String apiUrl;
  @override
  State<PublicArborApp> createState() => _PublicArborAppState();
}

class _PublicArborAppState extends State<PublicArborApp> {
  Session? _session;
  StreamSubscription<AuthState>? _auth;
  @override
  void initState() {
    super.initState();
    _session = Supabase.instance.client.auth.currentSession;
    _auth = Supabase.instance.client.auth.onAuthStateChange.listen((event) {
      if (mounted) setState(() => _session = event.session);
    });
  }
  @override
  void dispose() {
    _auth?.cancel();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Arbor — Private Alpha',
    debugShowCheckedModeBanner: false,
    theme: ThemeData.dark(useMaterial3: true).copyWith(
      scaffoldBackgroundColor: const Color(0xFF111015),
      colorScheme: ColorScheme.fromSeed(
        seedColor: _pink, brightness: Brightness.dark,
      ),
    ),
    home: _session == null
        ? const _Welcome()
        : _ConversationHome(
            key: ValueKey(_session!.user.id),
            apiUrl: widget.apiUrl,
          ),
  );
}

class _Welcome extends StatefulWidget {
  const _Welcome();
  @override
  State<_Welcome> createState() => _WelcomeState();
}

class _WelcomeState extends State<_Welcome> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool registering = false, busy = false;
  String? error;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }
  Future<void> submit() async {
    if (email.text.trim().isEmpty || password.text.length < 8) {
      setState(() => error = 'Enter an email and password (8+ characters).');
      return;
    }
    setState(() { busy = true; error = null; });
    try {
      final auth = Supabase.instance.client.auth;
      if (registering) {
        await auth.signUp(email: email.text.trim(), password: password.text);
        if (mounted) setState(() => error =
          'Account submitted. Confirm your email, then sign in. '
          'Your email also needs an alpha invitation.');
      } else {
        await auth.signInWithPassword(
          email: email.text.trim(), password: password.text,
        );
      }
    } on AuthException catch (exception) {
      if (mounted) setState(() => error = exception.message);
    } catch (_) {
      if (mounted) setState(() => error = 'Sign-in unavailable. Try again.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(children: [
      const Positioned.fill(child: ArborVisual(state: ArborVisualState.idle)),
      Positioned.fill(child: ColoredBox(
        color: Colors.black.withOpacity(0.70),
      )),
      SafeArea(child: Center(child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('ARBOR', style: TextStyle(
              fontSize: 35, letterSpacing: 6, fontWeight: FontWeight.w300,
            )),
            const SizedBox(height: 8),
            const Text('A conversation worth returning to.'),
            const SizedBox(height: 8),
            const Text('Invite-only software alpha',
              style: TextStyle(color: Colors.white60)),
            const SizedBox(height: 30),
            TextField(controller: email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                border: OutlineInputBorder(), labelText: 'Email',
              )),
            const SizedBox(height: 12),
            TextField(controller: password, obscureText: true,
              onSubmitted: (_) { if (!busy) submit(); },
              decoration: const InputDecoration(
                border: OutlineInputBorder(), labelText: 'Password',
              )),
            const SizedBox(height: 16),
            FilledButton(onPressed: busy ? null : submit,
              child: Text(busy ? 'Connecting…' :
                registering ? 'Create account' : 'Sign in')),
            TextButton(onPressed: busy ? null : () => setState(() {
              registering = !registering; error = null;
            }), child: Text(registering
              ? 'Already have an account? Sign in'
              : 'New here? Create an account')),
            if (error != null) Text(error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.amber)),
            const SizedBox(height: 16),
            const Text('Arbor is not a therapist or emergency service. '
              'Please avoid sensitive personal information during testing.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.white60)),
          ]),
        ),
      ))),
    ]),
  );
}

class _ConversationHome extends StatefulWidget {
  const _ConversationHome({super.key, required this.apiUrl});
  final String apiUrl;
  @override
  State<_ConversationHome> createState() => _ConversationHomeState();
}

class _ConversationHomeState extends State<_ConversationHome> {
  late final ArborApiClient api;
  final draft = TextEditingController();
  final scroll = ScrollController();
  List<Map<String, dynamic>> history = [], messages = [];
  String? conversationId, pendingTurnId, pendingUserText, error;
  bool busy = false, loading = true, hasOlder = false, loadingOlder = false;
  int? nextHistoryOffset;
  int _viewRevision = 0;
  @override
  void initState() {
    super.initState();
    api = ArborApiClient(baseUrl: widget.apiUrl);
    unawaited(refresh());
  }
  @override
  void dispose() {
    api.close();
    draft.dispose();
    scroll.dispose();
    super.dispose();
  }
  String explain(Object e) {
    if (e is ApiException) {
      final code = e.error.toString();
      if (code == 'alpha_access_denied') return 'This email is not invited.';
      if (code == 'email_confirmation_required') {
        return 'Confirm your email first.';
      }
      if (code.startsWith('model_')) {
        return 'Arbor LM is unavailable. Your message may have been saved. '
          'Retry the same message.';
      }
      if (code == 'daily_alpha_limit') {
        return 'Today’s alpha message limit has been reached.';
      }
      if (code == 'alpha_not_configured') {
        return 'The separate public-alpha backend is not ready.';
      }
      if (code == 'turn_conflict') {
        return 'The message is already being handled or changed. Reload history.';
      }
      return 'Request failed: ' + code;
    }
    return 'Connection failed. Check your network.';
  }
  Future<void> refresh() async {
    if (mounted) setState(() => loading = true);
    try {
      final json = await api.get('/api/public/conversations');
      final list = (json?['conversations'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>().toList();
      if (!mounted) return;
      setState(() { history = list; error = null; });
      final currentExists = list.any((c) => c['id'] == conversationId);
      if (currentExists) {
        await open(conversationId!);
      } else if (list.isNotEmpty) {
        await open(list.first['id'] as String);
      } else {
        newThread();
      }
    } catch (e) {
      if (mounted) setState(() => error = explain(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }
  Future<void> open(String id) async {
    final revision = ++_viewRevision;
    try {
      final json = await api.get('/api/public/conversations/' + id);
      if (!mounted || revision != _viewRevision) return;
      final restored = (json?['messages'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>().toList();
      // A model outage can leave a durable user turn without an assistant turn.
      // Restore its server-issued turn ID so retry never creates a duplicate.
      final last = restored.isEmpty ? null : restored.last;
      final unfinished = last?['role'] == 'user' &&
          last?['turn_id'] is String;
      setState(() {
        conversationId = id;
        messages = restored;
        hasOlder = json?['hasMore'] == true;
        nextHistoryOffset = json?['nextOffset'] as int?;
        pendingTurnId = unfinished ? last!['turn_id'] as String : null;
        pendingUserText = unfinished ? last!['content'] as String : null;
        draft.text = pendingUserText ?? '';
        error = unfinished
            ? 'Your last message was saved without a reply. Retry it to continue.'
            : null;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (scroll.hasClients) scroll.jumpTo(scroll.position.maxScrollExtent);
      });
    } catch (e) {
      if (mounted && revision == _viewRevision) {
        setState(() => error = explain(e));
      }
    }
  }

  Future<void> loadOlder() async {
    final id = conversationId;
    final offset = nextHistoryOffset;
    if (loadingOlder || !hasOlder || id == null || offset == null) return;
    final revision = _viewRevision;
    setState(() => loadingOlder = true);
    try {
      final json = await api.get('/api/public/conversations/' + id,
        queryParameters: {'offset': offset.toString()});
      if (!mounted || revision != _viewRevision) return;
      final earlier = (json?['messages'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>().toList();
      final existingIds = messages.map((m) => m['id']).toSet();
      setState(() {
        messages = [
          ...earlier.where((m) => !existingIds.contains(m['id'])),
          ...messages,
        ];
        hasOlder = json?['hasMore'] == true;
        nextHistoryOffset = json?['nextOffset'] as int?;
      });
    } catch (e) {
      if (mounted && revision == _viewRevision) {
        setState(() => error = explain(e));
      }
    } finally {
      if (mounted) setState(() => loadingOlder = false);
    }
  }

  void newThread() {
    ++_viewRevision;
    if (mounted) setState(() {
      conversationId = null; pendingTurnId = null;
      pendingUserText = null; draft.clear();
      messages = []; error = null; hasOlder = false;
      nextHistoryOffset = null;
    });
  }
  Future<void> send() async {
    final content = draft.text.trim();
    if (busy || content.isEmpty) return;
    if (pendingTurnId != null && content != pendingUserText) {
      setState(() => error =
          'Retry the saved message unchanged, or start a new conversation.');
      return;
    }
    final turn = pendingTurnId ?? newTurnId();
    pendingTurnId = turn;
    pendingUserText = content;
    setState(() { busy = true; error = null; });
    try {
      final answer = await api.post('/api/public/chat', body: {
        'turnId': turn, 'userText': content, 'interactionMode': 'text',
        if (conversationId != null) 'conversationId': conversationId,
      });
      if (!mounted) return;
      conversationId = answer['conversationId'] as String;
      pendingTurnId = null;
      pendingUserText = null;
      draft.clear();
      await refresh();
    } catch (e) {
      if (mounted) setState(() => error = explain(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }
  Future<void> exportHistory() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Copy your conversation archive?'),
        content: const Text('Your public-alpha chats will be copied as JSON. '
          'Other apps or someone using this device may be able to access '
          'clipboard contents. Do not use this on a shared device. '
          'Private Grove and ARK data are never included.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Copy archive')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      final snapshot = await api.get('/api/public/conversations',
        queryParameters: {'export': '1'});
      if (!mounted) return;
      if (snapshot?['ok'] != true) throw StateError('Export not ready');
      await Clipboard.setData(ClipboardData(text: jsonEncode(snapshot)));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Public-alpha conversation JSON copied. '
          'Paste it somewhere private, then clear your clipboard.'),
      ));
    } catch (e) {
      if (mounted) setState(() => error = explain(e));
    }
  }

  Future<void> removeThread() async {
    final id = conversationId;
    if (id == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Delete conversation?'),
        content: const Text('This removes this conversation and its '
          'messages from the alpha database. It cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      if (token == null) throw StateError('Not signed in');
      final result = await http.delete(
        Uri.parse(widget.apiUrl + '/api/public/conversations/' + id),
        headers: {'authorization': 'Bearer ' + token},
      );
      if (result.statusCode != 200 ||
          jsonDecode(result.body)['ok'] != true) {
        throw StateError('Delete failed');
      }
      if (!mounted) return;
      newThread();
      await refresh();
    } catch (_) {
      if (mounted) setState(() => error = 'Could not delete this conversation.');
    }
  }
  void showInfo(String topic) {
    const info = {
      'Voice': 'Voice is not enabled in this private alpha. '
        'The existing private voice route is deliberately not connected.',
      'Settings': 'Your chats are stored per account. Delete a '
        'conversation or explicitly copy your conversation archive '
        'from the menu. Long-term memory and account deletion controls '
        'are still being built.',
      'Privacy': 'This alpha uses a dedicated test database and sends '
        'authorized chat content to Arbor LM inference. Do not enter '
        'sensitive data until retention and consent terms are finalized.',
      'Help': 'Use Text to talk; History restores your conversation. '
        'Arbor is not a licensed therapist or crisis service. '
        'For immediate danger, call local emergency services '
        'and contact a trusted person nearby.',
    };
    showDialog<void>(context: context, builder: (dialog) => AlertDialog(
      title: Text(topic),
      content: Text(info[topic] ?? ''),
      actions: [TextButton(onPressed: () => Navigator.pop(dialog),
        child: const Text('Close'))],
    ));
  }
  Future<void> showHistory() async {
    await showModalBottomSheet<void>(
      context: context, showDragHandle: true,
      builder: (sheet) => SafeArea(child: ListView(
        shrinkWrap: true,
        children: [
          const ListTile(title: Text('Your conversations')),
          for (final item in history)
            ListTile(
              title: Text(item['title']?.toString() ?? 'Conversation',
                maxLines: 1, overflow: TextOverflow.ellipsis),
              onTap: () {
                Navigator.pop(sheet);
                open(item['id'] as String);
              },
            ),
          if (history.isEmpty)
            const ListTile(title: Text('No conversations yet.')),
        ],
      )),
    );
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('ARBOR · ALPHA'),
      actions: [
        IconButton(tooltip: 'History', icon: const Icon(Icons.history),
          onPressed: showHistory),
        PopupMenuButton<String>(
          tooltip: 'Options',
          onSelected: (value) async {
            if (value == 'new') newThread();
            else if (value == 'delete') await removeThread();
            else if (value == 'export') await exportHistory();
            else if (value == 'signout') {
              await Supabase.instance.client.auth.signOut();
            } else showInfo(value);
          },
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'new',
              child: Text('New conversation')),
            if (conversationId != null)
              const PopupMenuItem(value: 'delete',
                child: Text('Delete conversation')),
            const PopupMenuItem(value: 'export',
              child: Text('Copy conversation archive')),
            const PopupMenuItem(value: 'Settings',
              child: Text('Settings')),
            const PopupMenuItem(value: 'Privacy',
              child: Text('Privacy')),
            const PopupMenuItem(value: 'Help', child: Text('Help')),
            const PopupMenuItem(value: 'signout',
              child: Text('Sign out')),
          ],
        ),
      ],
    ),
    body: SafeArea(child: Center(child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 800),
      child: Column(children: [
        if (loading) const LinearProgressIndicator(minHeight: 2),
        if (error != null) MaterialBanner(
          content: Text(error!),
          actions: [TextButton(onPressed: refresh,
            child: const Text('Reload'))],
        ),
        if (hasOlder && messages.isNotEmpty)
          TextButton(
            onPressed: loadingOlder ? null : loadOlder,
            child: Text(loadingOlder ? 'Loading earlier messages…'
              : 'Load earlier messages'),
          ),
        Expanded(child: messages.isEmpty
          ? const Center(child: Column(
              mainAxisSize: MainAxisSize.min, children: [
                SizedBox(height: 140, width: 230,
                  child: ArborVisual(state: ArborVisualState.idle)),
                Text('What’s on your mind?',
                  style: TextStyle(fontSize: 20)),
                Text('Your conversation stays yours.',
                  style: TextStyle(color: Colors.white60)),
              ],
            ))
          : ListView.builder(
              controller: scroll,
              padding: const EdgeInsets.all(16),
              itemCount: messages.length,
              itemBuilder: (_, i) {
                final mine = messages[i]['role'] == 'user';
                return Align(
                  alignment: mine
                    ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 600),
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: mine
                        ? _pink.withOpacity(0.2)
                        : Colors.white.withOpacity(0.07),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: SelectableText(
                      messages[i]['content']?.toString() ?? ''),
                  ),
                );
              },
            )),
        if (busy) const Text('Arbor LM is responding…'),
        if (!busy && pendingTurnId != null)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: Text('An unanswered message is saved. '
              'Send it unchanged to retry, or start a new conversation.',
              style: TextStyle(color: Colors.amber)),
          ),
        Padding(padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(child: TextField(
              controller: draft, maxLength: 4000,
              minLines: 1, maxLines: 5,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Message Arbor',
              ),
            )),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: pendingTurnId == null
                  ? 'Send message' : 'Retry saved message',
              onPressed: busy ? null : send,
              icon: const Icon(Icons.arrow_upward),
            ),
          ]),
        ),
      ]),
    ))),
    bottomNavigationBar: NavigationBar(
      selectedIndex: 0,
      onDestinationSelected: (index) {
        if (index == 1) showInfo('Voice');
      },
      destinations: const [
        NavigationDestination(icon: Icon(Icons.chat_bubble_outline),
          label: 'Text'),
        NavigationDestination(icon: Icon(Icons.mic_off_outlined),
          label: 'Voice (later)'),
      ],
    ),
  );
}
