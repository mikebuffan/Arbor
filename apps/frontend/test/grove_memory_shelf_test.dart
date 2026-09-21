import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_memory_shelf.dart';

Map<String, Object?> memory({
  String id = 'm1',
  String project = 'project-a',
  String scope = 'project',
  String? conversation,
  String tier = 'normal',
  bool triggerOnly = false,
  String status = 'active',
  Object? value,
  String? deleted,
}) => {
  'id': id,
  'key': 'remembered.fact',
  'value': value ?? {'text': 'A saved claim, not a source.'},
  'scope': scope,
  'project_id': project,
  'conversation_id': conversation,
  'tier': tier,
  'status': status,
  'deleted_at': deleted,
  'user_trigger_only': triggerOnly,
  'updated_at': '2026-09-21T12:00:00Z',
};

void main() {
  test('only actual active memories from selected project are shown', () {
    final result = projectGroveMemoryShelf({
      'items': [
        memory(),
        memory(id: 'other', project: 'project-b'),
        memory(id: 'deleted', deleted: '2026-09-21T14:00:00Z'),
        memory(id: 'tombstoned', status: 'tombstoned'),
        memory(id: 'sensitive', tier: 'sensitive'),
        memory(id: 'only-when-asked', triggerOnly: true),
        memory(id: 'duplicate'),
      ],
    }, projectId: 'project-a');
    expect(result.memories.map((item) => item.id), ['m1', 'duplicate']);
    expect(result.memories.first.text, 'A saved claim, not a source.');
    expect(result.rowsReceived, 7);
    expect(result.possiblyMoreOnServer, isFalse);
  });

  test('conversation-scoped memory requires exact current conversation', () {
    final response = {'items': [
      memory(id: 'c1', scope: 'conversation', conversation: 'thread-1'),
      memory(id: 'c2', scope: 'conversation', conversation: 'thread-2'),
      memory(id: 'global', scope: 'global'),
      memory(id: 'p1'),
    ]};
    expect(
      projectGroveMemoryShelf(response, projectId: 'project-a')
          .memories.map((item) => item.id),
      ['p1'],
    );
    expect(
      projectGroveMemoryShelf(response,
          projectId: 'project-a', conversationId: 'thread-1')
          .memories.map((item) => item.id),
      ['c1', 'p1'],
    );
  });

  test('does not invent text from malformed or unknown value structures', () {
    final result = projectGroveMemoryShelf({
      'items': [
        memory(id: 'good', value: {'text': 'Original stored text'}),
        memory(id: 'string', value: 'A literal claim'),
        memory(id: 'other-shape', value: {'summary': 'not a source text'}),
        memory(id: 'blank', value: {'text': '  '}),
        memory(id: 'bad-id', value: {'text': 'X'})..['id'] = 7,
        'not an object',
      ],
    }, projectId: 'project-a');
    expect(result.memories.map((item) => item.id), ['good', 'string']);
  });

  test('invalid response fails rather than showing demo or empty success', () {
    expect(() => projectGroveMemoryShelf(null, projectId: 'project-a'),
        throwsFormatException);
    expect(() => projectGroveMemoryShelf({'items': 'nope'},
        projectId: 'project-a'), throwsFormatException);
    expect(() => projectGroveMemoryShelf({'items': []}, projectId: ' '),
        throwsFormatException);
    expect(projectGroveMemoryShelf({'items': []}, projectId: 'project-a')
        .memories, isEmpty);
  });

  test('500 rows is explicitly marked potentially truncated', () {
    final records = List.generate(
      500, (i) => memory(id: 'memory-$i'),
    );
    final result = projectGroveMemoryShelf(
        {'items': records}, projectId: 'project-a');
    expect(result.rowsReceived, 500);
    expect(result.possiblyMoreOnServer, isTrue);
    expect(result.memories, hasLength(500));
    expect(() => result.memories.clear(), throwsUnsupportedError);
  });
}
