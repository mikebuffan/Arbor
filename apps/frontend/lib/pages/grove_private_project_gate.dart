import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/grove_private_config.dart';

/// Strict parsing: do not treat a malformed, partial or foreign response as
/// permission to restore an old Firefly project from local preferences.
List<String> parseGroveGrantedProjectIds(Map<String, dynamic>? payload) {
  if (payload?['ok'] != true || payload?['projects'] is! List) {
    throw const FormatException('Private Grove project list unavailable');
  }
  final raw = payload!['projects'] as List;
  if (raw.length > 50) {
    throw const FormatException('Too many private Grove projects');
  }
  const uuidPattern =
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  final uuid = RegExp(uuidPattern, caseSensitive: false);
  final projects = <String>[];
  for (final entry in raw) {
    if (entry is! String || !uuid.hasMatch(entry) ||
        projects.contains(entry)) {
      throw const FormatException('Invalid private Grove project grant');
    }
    projects.add(entry);
  }
  return List.unmodifiable(projects);
}

/// Runs only inside the verified Grove invitation gate. A signed-in token
/// does not imply a Firefly project grant. Never restore an arbitrary
/// installation-local ARK project before the private broker lists active grants.
class GrovePrivateProjectGate extends StatefulWidget {
  const GrovePrivateProjectGate({
    super.key,
    required this.child,
    this.loadProjects,
    this.selectProject,
  });

  final Widget child;
  /// Synthetic test seam. Real builds always query private Grove API.
  final Future<List<String>> Function()? loadProjects;
  /// Synthetic test seam. Real builds write only the selected grant.
  final Future<void> Function(String projectId)? selectProject;

  @override
  State<GrovePrivateProjectGate> createState() =>
      _GrovePrivateProjectGateState();
}

class _GrovePrivateProjectGateState extends State<GrovePrivateProjectGate> {
  List<String> _projects = const [];
  bool _busy = true;
  bool _approved = false;
  String? _error;
  String? _token;
  String? _userId;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<List<String>> _discover() async {
    final client =
        ArborApiClient(baseUrl: GrovePrivateConfig.fromBuild.apiUrl);
    try {
      return parseGroveGrantedProjectIds(
        await client.get('/api/grove/ark/projects'),
      );
    } finally {
      client.close();
    }
  }

  bool _sameSession() {
    if (widget.loadProjects != null) return true;
    final current = Supabase.instance.client.auth.currentSession;
    return current != null &&
        current.accessToken == _token &&
        current.user.id == _userId;
  }

  Future<void> _load() async {
    final generation = ++_generation;
    if (mounted) setState(() {
      _busy = true;
      _approved = false;
      _error = null;
      _projects = const [];
    });
    try {
      if (widget.loadProjects == null) {
        final session = Supabase.instance.client.auth.currentSession;
        if (session == null) {
          throw StateError('No Grove session');
        }
        _token = session.accessToken;
        _userId = session.user.id;
      }
      final projects = await (widget.loadProjects ?? _discover)();
      if (!mounted || generation != _generation || !_sameSession()) return;
      final parsed = parseGroveGrantedProjectIds(
        {'ok': true, 'projects': projects},
      );
      if (parsed.isEmpty) {
        // Invited owner may enter the private HOUSE with no ARK grant.
        // Drop a stale on-device project/thread before constructing the room:
        // the ARK shelf stays unavailable and never falls back to demo data.
        if (widget.loadProjects == null) {
          final userId = _userId;
          if (userId == null || !_sameSession()) {
            throw StateError('Private Grove session changed');
          }
          await ArborSession.instance.clearStoredUser(userId);
        }
        if (!mounted || generation != _generation || !_sameSession()) return;
        setState(() {
          _projects = const [];
          _approved = true;
          _busy = false;
        });
        return;
      }
      setState(() {
        _projects = parsed;
        _busy = false;
      });
      if (parsed.length == 1) {
        await _choose(parsed.single, generation);
      }
    } catch (_) {
      if (!mounted || generation != _generation) return;
      setState(() {
        _busy = false;
        _error = 'Private Grove project access could not be verified.';
      });
    }
  }

  Future<void> _choose(String id, int generation) async {
    if (!mounted || _busy || generation != _generation ||
        !_projects.contains(id) || !_sameSession()) return;
    setState(() => _busy = true);
    try {
      if (widget.selectProject != null) {
        await widget.selectProject!(id);
      } else {
        final userId = _userId;
        if (userId == null || !_sameSession()) {
          throw StateError('Private Grove session changed');
        }
        // Text/Voice are not yet connected. Clearing an old conversation ID
        // prevents an unrelated Firefly thread from becoming Grove context.
        await ArborSession.instance.startNewThread(
          userId: userId,
          projectId: id,
        );
      }
      if (!mounted || generation != _generation || !_sameSession()) return;
      setState(() {
        _approved = true;
        _busy = false;
      });
    } catch (_) {
      if (!mounted || generation != _generation) return;
      setState(() {
        _approved = false;
        _busy = false;
        _error = 'Could not select this private Grove project.';
      });
    }
  }

  @override
  void dispose() {
    ++_generation;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_approved) return widget.child;
    return Scaffold(
      backgroundColor: const Color(0xFF0A1819),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 510),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.forest_outlined,
                      color: Color(0xFF91DAD2), size: 44),
                  const SizedBox(height: 12),
                  const Text('THE GROVE · PROJECT ACCESS',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF91DAD2),
                          fontSize: 17, letterSpacing: 1.2)),
                  const SizedBox(height: 16),
                  if (_busy) const CircularProgressIndicator(),
                  if (!_busy && _projects.isEmpty && _error == null)
                    const Text(
                      'No private ARK projects are granted yet. '
                      'The house stays private until an owner grant '
                      'is activated.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, height: 1.5),
                    ),
                  if (!_busy && _projects.length > 1 && _error == null) ...[
                    const Text(
                      'Choose an authorized project. '
                      'Only the selected project will be shown.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, height: 1.5),
                    ),
                    const SizedBox(height: 10),
                    for (final id in _projects)
                      OutlinedButton(
                        onPressed: () => _choose(id, _generation),
                        child: Text('Project ${id.substring(0, 8)}…${id.substring(id.length - 4)}'),
                      ),
                  ],
                  if (_error != null)
                    Text(_error!, textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.orangeAccent)),
                  if (!_busy) ...[
                    const SizedBox(height: 15),
                    TextButton(
                      onPressed: _load,
                      child: const Text('Check private project access again'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
