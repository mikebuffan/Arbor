import '../api/arbor_api_client.dart';

class GroveDocument {
  const GroveDocument({
    required this.id,
    required this.projectId,
    required this.conversationId,
    required this.displayName,
  });
  final String id;
  final String projectId;
  final String conversationId;
  final String displayName;
}

class GroveDocumentPage {
  const GroveDocumentPage({
    required this.projectId,
    required this.documents,
    this.nextCursor,
  });
  final String projectId;
  final List<GroveDocument> documents;
  final String? nextCursor;
}

/// Fails closed on malformed metadata or a mismatched project.
/// No storage paths, signed URLs, or bytes belong in this list.
GroveDocumentPage parseGroveDocumentPage(
  Map<String, dynamic>? response, {
  required String projectId,
}) {
  if (projectId.isEmpty ||
      response?['ok'] != true ||
      response?['projectId'] != projectId ||
      response?['documents'] is! List) {
    throw const FormatException('Invalid Grove document response');
  }
  final raw = response!['documents'] as List;
  if (raw.length > 25) {
    throw const FormatException('Grove document page is oversized');
  }
  final documents = <GroveDocument>[];
  final seen = <String>{};
  for (final item in raw) {
    if (item is! Map ||
        item['projectId'] != projectId ||
        item['id'] is! String ||
        item['conversationId'] is! String ||
        item['displayName'] is! String) {
      throw const FormatException('Grove document is malformed');
    }
    final id = item['id'] as String;
    final conversationId = item['conversationId'] as String;
    final label = (item['displayName'] as String).trim();
    if (id.isEmpty ||
        conversationId.isEmpty ||
        label.isEmpty ||
        label.length > 120 ||
        !seen.add(id) ||
        item.containsKey('storage_path') ||
        item.containsKey('signedUrl')) {
      throw const FormatException('Unsafe Grove document metadata');
    }
    documents.add(GroveDocument(
      id: id,
      projectId: projectId,
      conversationId: conversationId,
      displayName: label,
    ));
  }
  final cursor = response['nextCursor'];
  if (cursor != null && (cursor is! String ||
      cursor.isEmpty || documents.isEmpty ||
      cursor != documents.last.id)) {
    throw const FormatException('Invalid Grove document page cursor');
  }
  return GroveDocumentPage(
    projectId: projectId,
    documents: List.unmodifiable(documents),
    nextCursor: cursor as String?,
  );
}

class GroveDocumentShelfReader {
  const GroveDocumentShelfReader(this.api);
  final ArborApiClient api;

  Future<GroveDocumentPage> load({
    required String projectId,
    String? after,
  }) async {
    final result = await api.get('/api/chat/attachments/grove-list',
      queryParameters: {
        'projectId': projectId,
        if (after != null) 'after': after,
      },
    );
    return parseGroveDocumentPage(result, projectId: projectId);
  }
}
