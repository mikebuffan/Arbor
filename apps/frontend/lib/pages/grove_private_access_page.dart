import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// A readable, fail-closed screen while a dedicated Grove owner realm / API
/// has not yet been provisioned. Never asks for existing public-app passwords.
class GrovePrivateSetupPage extends StatelessWidget {
  const GrovePrivateSetupPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFF0A1819),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(22),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('THE GROVE', style: TextStyle(
                      color: Color(0xFF91DAD2),
                      fontSize: 27, letterSpacing: 3,
                      fontWeight: FontWeight.w600,
                    )),
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.asset('assets/grove_reference.webp',
                          fit: BoxFit.contain,
                          semanticLabel: 'Approved private Grove room with Moss and the living window'),
                    ),
                    const SizedBox(height: 20),
                    const Text('Your private house is being connected.',
                      style: TextStyle(color: Colors.white, fontSize: 23)),
                    const SizedBox(height: 12),
                    const Text(
                      'The private Grove account and its authorized API are '
                      'not configured in this build yet. Your public Arbor '
                      'App login is a different account. We will not silently '
                      'sign you into Firefly or reuse another app\'s identity.',
                      style: TextStyle(color: Color(0xFFD2DEDE),
                          height: 1.5, fontSize: 15),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'No password or account action is required on this screen. '
                      'Your previously installed test build is unchanged.',
                      style: TextStyle(color: Color(0xFF91DAD2), height: 1.45),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

/// Private auth UI uses the *configured Grove provider*, never a shared
/// Firefly/public provider. Owner invitation and RLS remain server enforced.
class GrovePrivateAuthGate extends StatefulWidget {
  const GrovePrivateAuthGate({super.key, required this.child});

  final Widget child;

  @override
  State<GrovePrivateAuthGate> createState() => _GrovePrivateAuthGateState();
}

class _GrovePrivateAuthGateState extends State<GrovePrivateAuthGate> {
  StreamSubscription<AuthState>? _subscription;
  late bool _authenticated;

  @override
  void initState() {
    super.initState();
    final auth = Supabase.instance.client.auth;
    _authenticated = auth.currentSession?.accessToken != null;
    _subscription = auth.onAuthStateChange.listen((state) {
      if (mounted) {
        setState(() => _authenticated =
            state.session?.accessToken != null);
      }
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      _authenticated ? widget.child : const _GrovePrivateSignIn();
}

class _GrovePrivateSignIn extends StatefulWidget {
  const _GrovePrivateSignIn();

  @override
  State<_GrovePrivateSignIn> createState() => _GrovePrivateSignInState();
}

class _GrovePrivateSignInState extends State<_GrovePrivateSignIn> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;
  bool _requested = false;
  String? _notice;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    if (_busy) return;
    final email = _email.text.trim();
    if (!email.contains('@') || !email.split('@').last.contains('.')) {
      setState(() => _notice = 'Enter your invited Grove email address.');
      return;
    }
    setState(() {
      _busy = true;
      _notice = null;
    });
    try {
      await Supabase.instance.client.auth.signInWithOtp(
        email: email,
        shouldCreateUser: false,
      );
      if (!mounted) return;
      setState(() {
        _requested = true;
        _notice = 'Check the invited email address. Your Grove email '
            'template must be configured to send a one-time code. '
            'No new account was created.';
      });
    } on AuthException catch (error) {
      if (mounted) setState(() => _notice = error.message);
    } catch (_) {
      if (mounted) {
        setState(() => _notice =
            'Grove sign-in is unavailable. No account was created.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyCode() async {
    if (_busy) return;
    final token = _code.text.trim();
    if (token.length < 6 || token.length > 10 ||
        !RegExp(r'^\d+.hasMatch(token)) {
      setState(() => _notice = 'Enter the numeric code from your Grove email.');
      return;
    }
    setState(() {
      _busy = true;
      _notice = null;
    });
    try {
      await Supabase.instance.client.auth.verifyOTP(
        email: _email.text.trim(),
        token: token,
        type: OtpType.email,
      );
      if (mounted) setState(() => _notice = null);
    } on AuthException catch (error) {
      if (mounted) setState(() => _notice = error.message);
    } catch (_) {
      if (mounted) setState(() => _notice = 'The code could not be verified.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFF0A1819),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.forest_outlined,
                        color: Color(0xFF91DAD2), size: 42),
                    const SizedBox(height: 10),
                    const Text('WELCOME TO THE GROVE',
                        style: TextStyle(color: Color(0xFF91DAD2),
                            letterSpacing: 1.7, fontSize: 21)),
                    const SizedBox(height: 12),
                    const Text(
                      'Private owner access. This is not the public Arbor App.',
                      style: TextStyle(color: Colors.white70, fontSize: 15),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _email,
                      enabled: !_busy && !_requested,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Invited Grove email',
                        border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 13),
                    if (_requested) ...[
                      TextField(
                        controller: _code,
                        keyboardType: TextInputType.number,
                        autofillHints: const [AutofillHints.oneTimeCode],
                        decoration: const InputDecoration(
                          labelText: 'One-time email code',
                          border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _busy ? null : _verifyCode,
                        child: const Text('Enter my Grove'),
                      ),
                      TextButton(
                        onPressed: _busy ? null : () => setState(() {
                          _requested = false;
                          _code.clear();
                          _notice = null;
                        }),
                        child: const Text('Use another invited email'),
                      ),
                    ] else FilledButton(
                      onPressed: _busy ? null : _requestCode,
                      child: Text(_busy ? 'Requesting code…'
                          : 'Send private sign-in code'),
                    ),
                    if (_notice != null) ...[
                      const SizedBox(height: 12),
                      Text(_notice!,
                        style: const TextStyle(color: Color(0xFF91DAD2))),
                    ],
                    const SizedBox(height: 20),
                    const Text(
                      'Access must be provisioned and restricted to the '
                      'invited owner on the Grove service. No public account '
                      'or existing Firefly login is accepted here.',
                      style: TextStyle(color: Colors.white54, height: 1.45),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}
).hasMatch(token)) {
      setState(() => _notice = 'Enter the numeric code from your Grove email.');
      return;
    }
    setState(() {
      _busy = true;
      _notice = null;
    });
    try {
      await Supabase.instance.client.auth.verifyOTP(
        email: _email.text.trim(),
        token: token,
        type: OtpType.email,
      );
      if (mounted) setState(() => _notice = null);
    } on AuthException catch (error) {
      if (mounted) setState(() => _notice = error.message);
    } catch (_) {
      if (mounted) setState(() => _notice = 'The code could not be verified.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFF0A1819),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.forest_outlined,
                        color: Color(0xFF91DAD2), size: 42),
                    const SizedBox(height: 10),
                    const Text('WELCOME TO THE GROVE',
                        style: TextStyle(color: Color(0xFF91DAD2),
                            letterSpacing: 1.7, fontSize: 21)),
                    const SizedBox(height: 12),
                    const Text(
                      'Private owner access. This is not the public Arbor App.',
                      style: TextStyle(color: Colors.white70, fontSize: 15),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _email,
                      enabled: !_busy && !_requested,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Invited Grove email',
                        border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 13),
                    if (_requested) ...[
                      TextField(
                        controller: _code,
                        keyboardType: TextInputType.number,
                        autofillHints: const [AutofillHints.oneTimeCode],
                        decoration: const InputDecoration(
                          labelText: 'One-time email code',
                          border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _busy ? null : _verifyCode,
                        child: const Text('Enter my Grove'),
                      ),
                      TextButton(
                        onPressed: _busy ? null : () => setState(() {
                          _requested = false;
                          _code.clear();
                          _notice = null;
                        }),
                        child: const Text('Use another invited email'),
                      ),
                    ] else FilledButton(
                      onPressed: _busy ? null : _requestCode,
                      child: Text(_busy ? 'Requesting code…'
                          : 'Send private sign-in code'),
                    ),
                    if (_notice != null) ...[
                      const SizedBox(height: 12),
                      Text(_notice!,
                        style: const TextStyle(color: Color(0xFF91DAD2))),
                    ],
                    const SizedBox(height: 20),
                    const Text(
                      'Access must be provisioned and restricted to the '
                      'invited owner on the Grove service. No public account '
                      'or existing Firefly login is accepted here.',
                      style: TextStyle(color: Colors.white54, height: 1.45),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}
