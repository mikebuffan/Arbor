import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/arbor_api_client.dart';
import '../api/arbor_session.dart';
import '../config/arbor_config.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_document_shelf.dart';

Future<GroveDocumentPage> readCurrentGroveDocumentPage(String? after) async {
  final userId = Supabase.instance.client.auth.currentUser?.id;
  if (userId == null) throw StateError('Sign in to view document attachments.');
  final session = await ArborSession.instance.contextFor(userId);
  if (session == null || session.projectId.isEmpty) {
    throw StateError('Select a project in Talk to view its documents.');
  }
  if (Supabase.instance.client.auth.currentUser?.id != userId) {
    throw StateError('Signed-in user changed.');
  }
  final api = ArborApiClient(baseUrl: ArborConfig.apiBaseUrl);
  try {
    final page = await GroveDocumentShelfReader(api).load(
      projectId: session.projectId,
      after: after,
    );
    final currentId = Supabase.instance.client.auth.currentUser?.id;
    final current = await ArborSession.instance.contextFor(userId);
    if (currentId != userId || current?.projectId != session.projectId) {
      throw StateError('Project changed during the document read.');
    }
    return page;
  } finally {
    api.close();
  }
}

/// Read-only metadata for scoped Firefly chat attachments. Does not silently
/// imply this is a complete file library or that documents were reviewed.
class GroveDocumentShelfView extends StatefulWidget {
  const GroveDocumentShelfView({super.key, this.load, this.invalidations});
  final Future<GroveDocumentPage> Function(String? after)? load;
  /// Optional scope-change signal for embedding/tests; carries no document data.
  final Stream<void>? invalidations;

  @override
  State<GroveDocumentShelfView> createState() => _GroveDocumentShelfViewState();
}

class _GroveDocumentShelfViewState extends State<GroveDocumentShelfView> {
  final _entries = <GroveDocument>[];
  String? _projectId;
  String? _cursor;
  String? _error;
  bool _loading = false;
  int _generation = 0;
  StreamSubscription<dynamic>? _authChanges;
  StreamSubscription<String>? _sessionChanges;
  StreamSubscription<void>? _invalidationChanges;

  @override
  void initState() {
    super.initState();
    _bindInvalidations();
    _refresh();
  }

  @override
  void didUpdateWidget(GroveDocumentShelfView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.load != widget.load ||
        oldWidget.invalidations != widget.invalidations) {
      _bindInvalidations();
      _refresh();
    }
  }

  void _bindInvalidations() {
    _authChanges?.cancel();
    _sessionChanges?.cancel();
    _invalidationChanges?.cancel();
    if (widget.invalidations != null) {
      _invalidationChanges = widget.invalidations!.listen((_) => _refresh());
    }
    if (widget.load == null) {
      _authChanges = Supabase.instance.client.auth.onAuthStateChange
          .listen((_) => _refresh());
      _sessionChanges = ArborSession.instance.contextChanges
          .listen((_) => _refresh());
    }
  }

  @override
  void dispose() {
    _generation++;
    _authChanges?.cancel();
    _sessionChanges?.cancel();
    _invalidationChanges?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    final request = ++_generation;
    setState(() {
      _entries.clear();
      _projectId = null;
      _cursor = null;
      _error = null;
      _loading = true;
    });
    await _loadPage(null, request);
  }

  Future<void> _more() async {
    if (_loading || _cursor == null) return;
    final request = ++_generation;
    setState(() => _loading = true);
    await _loadPage(_cursor, request);
  }

  Future<void> _loadPage(String? after, int request) async {
    try {
      final next = await (widget.load ?? readCurrentGroveDocumentPage)(after);
      if (!mounted || request != _generation) return;
      if (after != null && (_projectId != next.projectId ||
          next.documents.any((doc) => _entries.any((old) => old.id == doc.id)))) {
        throw StateError('Project or page changed during document retrieval');
      }
      setState(() {
        _entries.addAll(next.documents);
        _projectId = next.projectId;
        _cursor = next.nextCursor;
        _error = null;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || request != _generation) return;
      setState(() {
        _entries.clear(); // Fail closed: don't retain another project's data.
        _projectId = null;
        _cursor = null;
        _error = 'Document shelf unavailable. Sign in, select a project or retry.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => EnvironmentPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('LIBRARY · PROJECT ATTACHMENTS',
          style: TextStyle(color: ArborEnvironmentTokens.cyan,
              letterSpacing: 1.3, fontSize: 11)),
        const SizedBox(height: 8),
        const Text('Read-only list of uploaded Firefly chat attachments. '
          'Not all project files, and no document has been opened or verified.',
          style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
        const SizedBox(height: 12),
        if (_projectId != null) ...[
          Text('Project: $_projectId',
            key: const ValueKey('grove-document-project'),
            style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
          Text('${_entries.length} listed attachment(s)',
            style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
          if (_entries.isEmpty)
            const Text('No uploaded chat attachments were returned for this project.',
              key: ValueKey('grove-document-empty'),
              style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
          for (final file in _entries)
            Padding(
              key: ValueKey('grove-document-' + file.id),
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(file.displayName,
                    style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
                  Text('UNOPENED ATTACHMENT · ID ${file.id}',
                    style: const TextStyle(
                      color: ArborEnvironmentTokens.textMuted, fontSize: 11)),
                ],
              ),
            ),
          if (_cursor != null)
            TextButton(
              onPressed: _loading ? null : _more,
              child: const Text('Load more attachments'),
            ),
        ],
        if (_loading) const Text('Reading project attachments…',
          key: ValueKey('grove-document-loading'),
          style: TextStyle(color: ArborEnvironmentTokens.firefly)),
        if (_error != null) Text(_error!,
          key: const ValueKey('grove-document-error'),
          style: const TextStyle(color: ArborEnvironmentTokens.firefly)),
        TextButton.icon(
          onPressed: _loading ? null : _refresh,
          icon: const Icon(Icons.refresh),
          label: const Text('Refresh attachments'),
        ),
      ],
    ),
  );
}
