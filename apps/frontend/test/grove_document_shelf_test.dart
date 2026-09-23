import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_document_shelf.dart';

Map<String, Object?> file(String id, String project) => {
  'id': id,
  'projectId': project,
  'conversationId': 'conversation-one',
  'displayName': 'Report $id.pdf',
};

void main() {
  test('real scoped attachment metadata parses without claiming to open a file', () {
    final result = parseGroveDocumentPage({
      'ok': true,
      'projectId': 'project-a',
      'documents': [file('one', 'project-a')],
      'nextCursor': null,
    }, projectId: 'project-a');
    expect(result.documents.single.displayName, 'Report one.pdf');
    expect(result.documents.single.id, 'one');
    expect(result.nextCursor, isNull);
    expect(() => result.documents.clear(), throwsUnsupportedError);
  });

  test('rejects forged project, malformed rows and leaked private storage paths', () {
    for (final raw in [
      {'ok': true, 'projectId': 'project-b', 'documents': []},
      {'ok': true, 'projectId': 'project-a', 'documents': 'bad'},
      {'ok': true, 'projectId': 'project-a',
        'documents': [file('one', 'project-b')]},
      {'ok': true, 'projectId': 'project-a',
        'documents': [{...file('one', 'project-a'),
          'storage_path': 'someone/secret'}]},
      {'ok': true, 'projectId': 'project-a',
        'documents': [file('one', 'project-a'), file('one', 'project-a')]},
      {'ok': true, 'projectId': 'project-a', 'documents': [],
        'nextCursor': 'a-cursor'},
    ]) {
      expect(() => parseGroveDocumentPage(raw, projectId: 'project-a'),
          throwsFormatException);
    }
  });

  test('refuses oversized pages and dishonest continuation cursors', () {
    expect(() => parseGroveDocumentPage({
      'ok': true, 'projectId': 'project-a',
      'documents': List.generate(26,
          (index) => file('$index', 'project-a')),
    }, projectId: 'project-a'), throwsFormatException);
    expect(() => parseGroveDocumentPage({
      'ok': true, 'projectId': 'project-a',
      'documents': [file('one', 'project-a')],
      'nextCursor': 'not-the-last-document',
    }, projectId: 'project-a'), throwsFormatException);
  });
}
