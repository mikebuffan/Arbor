import '../api/arbor_api_client.dart';

/// A claim saved by Firefly's memory system, NOT a primary-source document.
/// The API response is already owner-checked; this projection additionally
/// fails closed on mismatched project/conversation scope and private tiers.
class GroveSavedMemory {
  const GroveSavedMemory({
    required this.id,
    required this.key,
    required this.text,
    required this.scope,
    required this.updatedAt,
  });

  final String id;
  final String key;
  final String text;
  final String scope;
  final DateTime? updatedAt;
}

class GroveMemoryShelfSnapshot {
  const GroveMemoryShelfSnapshot({
    required this.projectId,
    required this.memories,
    required this.rowsReceived,
    required this.possiblyMoreOnServer,
  });

  final String projectId;
  final List<GroveSavedMemory> memories;
  final int rowsReceived;
  /// Existing GET /api/memory/items currently returns at most 500 rows and
  /// has no page cursor. Never call a 500-row response a complete archive.
  final bool possiblyMoreOnServer;
}

class GroveMemoryShelfUnavailable implements Exception {
  const GroveMemoryShelfUnavailable(this.message);
  final String message;
}

/// No generated summaries, default examples, or cross-project suggestions.
/// Each visible entry must be a concrete, active row from a scoped response.
GroveMemoryShelfSnapshot projectGroveMemoryShelf(
  Map<String, dynamic>? response, {
  required String projectId,
  String? conversationId,
}) {
  if (projectId.trim().isEmpty) {
    throw const FormatException('A project must be selected');
  }
  final raw = response?['items'];
  if (raw is! List) {
    throw const FormatException('Memory response has no item list');
  }
  final kept = <GroveSavedMemory>[];
  final seen = <String>{};
  for (final row in raw) {
    if (row is! Map) continue;
    if (row['project_id'] != projectId ||
        row['deleted_at'] != null ||
        row['status'] != 'active' ||
        row['user_trigger_only'] != false ||
        row['tier'] == 'sensitive') {
      continue;
    }
    final scope = row['scope'];
    if (scope != 'project' &&
        !(scope == 'conversation' &&
            conversationId != null &&
            row['conversation_id'] == conversationId)) {
      continue;
    }
    final id = row['id'], key = row['key'], value = row['value'];
    if (id is! String || id.isEmpty || !seen.add(id) ||
        key is! String || key.trim().isEmpty) {
      continue;
    }
    final text = switch (value) {
      String value => value.trim(),
      Map value when value['text'] is String =>
        (value['text'] as String).trim(),
      _ => '',
    };
    if (text.isEmpty) continue;
    final updated = row['updated_at'];
    kept.add(GroveSavedMemory(
      id: id,
      key: key,
      text: text,
      scope: scope as String,
      updatedAt: updated is String ? DateTime.tryParse(updated) : null,
    ));
  }
  return GroveMemoryShelfSnapshot(
    projectId: projectId,
    memories: List.unmodifiable(kept),
    rowsReceived: raw.length,
    possiblyMoreOnServer: raw.length >= 500,
  );
}

/// Reuses the existing authenticated read-only endpoint. Does NOT call POST,
/// mutate memory, browse private documents, or enable ARK execution.
class GroveMemoryShelfReader {
  const GroveMemoryShelfReader(this.api);

  final ArborApiClient api;

  Future<GroveMemoryShelfSnapshot> load({
    required String projectId,
    String? conversationId,
  }) async {
    final response = await api.get(
      '/api/memory/items',
      queryParameters: {'projectId': projectId},
    );
    return projectGroveMemoryShelf(
      response,
      projectId: projectId,
      conversationId: conversationId,
    );
  }
}
