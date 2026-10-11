import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/arbor_api_client.dart';
import 'package:frontend/config/grove_private_config.dart';
import 'package:frontend/environment/grove_private_conversations.dart';

const project = '00000000-0000-4000-8000-000000000003';
const conversation = '00000000-0000-4000-8000-000000000004';
const requestId = '00000000-0000-4000-8000-000000000005';
const apiUrl = 'https://private-grove.example.org';
const config = GrovePrivateConfig(
  authUrl: 'https://fqjqpuaoifgbweiguacf.supabase.co',
  publishableKey: 'sb_publishable_private_synthetic',
  apiUrl: apiUrl,
  approvedApiHost: 'private-grove.example.org',
);

Map<String, dynamic> choices() => {
  'ok': true,
  'projectId': project,
  'conversations': [
    {
      'conversationId': conversation,
      'createdAt': '2026-09-23T00:00:00Z',
      'updatedAt': '2026-09-23T01:00:00Z',
    },
  ],
  'mayBeTruncated': false,
  'createsConversation': false,
  'grantsExecution': false,
};
Map<String, dynamic> created() => {
  'ok': true,
  'projectId': project,
  'conversation': {
    'conversationId': conversation,
    'createdAt': '2026-09-23T00:00:00Z',
    'updatedAt': '2026-09-23T01:00:00Z',
  },
  'created': true,
  'grantsExecution': false,
  'verifiesCompletion': false,
};
Map<String, dynamic> history() => {
  'ok': true,
  'projectId': project,
  'conversationId': conversation,
  'order': 'newest_first',
  'windowLimit': 6,
  'historyMayBeTruncated': false,
  'turns': [
    {
      'requestId': requestId,
      'userText': 'Continue our work.',
      'assistantText': 'The task is still open.',
      'replyVerification': 'unverified_model_text',
      'createdAt': '2026-09-23T02:00:00Z',
    },
  ],
  'liveExecutionVerified': false,
  'workReceipts': <Object>[],
  'grantsExecution': false,
};
Map<String, dynamic> reply() => {
  'ok': true,
  'reply': 'The task is still open.',
  'model': 'arbor-lm-v0.3',
  'replyVerification': 'unverified_model_text',
  'arkConnected': true,
  'continuityFetched': true,
  'liveExecutionVerified': false,
  'workReceipts': <Object>[],
  'grantsExecution': false,
  'verifiesCompletion': false,
  'persisted': true,
  'replayed': false,
  'requestId': requestId,
};
class FakeApi extends ArborApiClient {
  FakeApi(String host) : super(baseUrl: host);
  int calls = 0;
  String? path;
  Map<String, String>? query;
  Map<String, dynamic>? sent;
  Map<String, dynamic>? getResult;
  Map<String, dynamic>? postResult;

  @override
  Future<Map<String, dynamic>?> get(String path,
      {Map<String, String>? queryParameters}) async {
    calls++;
    this.path = path;
    query = queryParameters;
    return getResult;
  }

  @override
  Future<Map<String, dynamic>> post(String path,
      {required Map<String, dynamic> body}) async {
    calls++;
    this.path = path;
    sent = body;
    return postResult!;
  }
}

void main() {
  test('list parses only IDs from an explicit project, never creates chats', () {
    final parsed = parseGrovePrivateConversations(
      choices(), projectId: project,
    );
    expect(parsed.conversations.single.conversationId, conversation);
    expect(parsed.mayBeTruncated, isFalse);
    expect(parsed.conversations.single.createdAt.isUtc, isTrue);
    expect(() => parsed.conversations.add(parsed.conversations.single),
      throwsUnsupportedError);
    for (final bad in [
      {...choices(), 'projectId': conversation},
      {...choices(), 'createsConversation': true},
      {...choices(), 'grantsExecution': true},
      {...choices(), 'conversations': [
        ...choices()['conversations'] as List,
        ...choices()['conversations'] as List,
      ]},
      {...choices(), 'conversations': [
        {'conversationId': 'foreign'}
      ]},
      {...choices(), 'conversations': List.filled(21,
          {'conversationId': conversation})},
      {...choices(), 'conversations': [
        {'conversationId': conversation, 'createdAt': 'bad',
          'updatedAt': '2026-09-23T01:00:00Z'}
      ]},
    ]) {
      expect(() => parseGrovePrivateConversations(
        bad, projectId: project,
      ), throwsFormatException);
    }
    final empty = parseGrovePrivateConversations(
      {...choices(), 'conversations': <Object>[]}, projectId: project);
    expect(empty.conversations, isEmpty);
  });

  test('case-varied duplicate conversation IDs fail closed', () {
    const id = 'abcdefab-1234-4000-8000-abcdef123456';
    final entry = {
      ...(choices()['conversations'] as List).single as Map<String, dynamic>,
      'conversationId': id,
    };
    expect(() => parseGrovePrivateConversations({
      ...choices(), 'conversations': [entry, {...entry, 'conversationId': id.toUpperCase()}],
    }, projectId: project), throwsFormatException);
  });

  test('case-varied duplicate saved request IDs fail closed', () {
    const id = 'abcdefab-1234-4000-8000-abcdef123456';
    final entry = {
      ...(history()['turns'] as List).single as Map<String, dynamic>,
      'requestId': id,
    };
    expect(() => parseGrovePrivateHistory({
      ...history(), 'turns': [entry, {
        ...entry, 'requestId': id.toUpperCase(),
        'createdAt': '2026-09-23T01:00:00Z',
      }],
    }, projectId: project, conversationId: conversation), throwsFormatException);
  });

  test('explicit new private conversation uses database-minted ID and no work authority', () {
    final parsed = parseGrovePrivateCreatedConversation(
      created(), projectId: project,
    );
    expect(parsed.conversationId, conversation);
    for (final bad in [
      {...created(), 'projectId': conversation},
      {...created(), 'created': false},
      {...created(), 'grantsExecution': true},
      {...created(), 'verifiesCompletion': true},
      {...created(), 'conversation': {
        ...(created()['conversation'] as Map<String, dynamic>),
        'conversationId': 'foreign-id',
      }},
      {...created(), 'conversation': {
        ...(created()['conversation'] as Map<String, dynamic>),
        'createdAt': 'not-a-date',
      }},
    ]) {
      expect(() => parseGrovePrivateCreatedConversation(
        bad, projectId: project,
      ), throwsFormatException);
    }
  });

  test('history accepts only completed bounded pairs and discloses window', () {
    final parsed = parseGrovePrivateHistory(
      history(), projectId: project, conversationId: conversation,
    );
    expect(parsed.turnsNewestFirst.single.userText, 'Continue our work.');
    expect(parsed.turnsNewestFirst.single.replyVerification,
        'unverified_model_text');
    final six = parseGrovePrivateHistory({
      ...history(),
      'historyMayBeTruncated': true,
      'turns': List.generate(6, (i) => {
        ...((history()['turns'] as List).single as Map<String, dynamic>),
        'requestId': '00000000-0000-4000-8000-' +
            (i + 101).toString().padLeft(12, '0'),
      }),
    }, projectId: project, conversationId: conversation);
    expect(six.turnsNewestFirst, hasLength(6));
    expect(six.mayBeTruncated, isTrue);
    for (final bad in [
      {...history(), 'conversationId': project},
      {...history(), 'liveExecutionVerified': true},
      {...history(), 'workReceipts': ['invented tool success']},
      {...history(), 'grantsExecution': true},
      {...history(), 'order': 'oldest_first'},
      {...history(), 'windowLimit': 10000},
      {...history(), 'turns': List.filled(7,
          (history()['turns'] as List).single)},
      {...history(), 'turns': [
        {...((history()['turns'] as List).single as Map),
          'assistantText': ''},
      ]},
    ]) {
      expect(() => parseGrovePrivateHistory(bad,
        projectId: project, conversationId: conversation),
        throwsFormatException);
    }
  });

  test('phone rejects reversed exact-conversation history even if response advertises newest_first', () {
    final latest = {...((history()['turns'] as List).single as Map<String, dynamic>),
      'requestId': '00000000-0000-4000-8000-000000000016',
      'userText': 'Latest saved message',
      'createdAt': '2026-10-10T03:00:00Z'};
    final older = {...latest,
      'requestId': '00000000-0000-4000-8000-000000000017',
      'userText': 'Older saved message',
      'createdAt': '2026-10-10T02:00:00Z'};

    final valid = parseGrovePrivateHistory({
      ...history(), 'turns': [latest, older],
    }, projectId: project, conversationId: conversation);
    expect(valid.turnsNewestFirst.map((t) => t.userText).toList(),
      ['Latest saved message', 'Older saved message']);

    expect(() => parseGrovePrivateHistory({
      ...history(), 'turns': [older, latest],
    }, projectId: project, conversationId: conversation),
      throwsFormatException);

    // Timestamp ties carry no proven ordering; do not invent a precedence.
    final sameTime = {...older, 'createdAt': latest['createdAt']};
    expect(parseGrovePrivateHistory({
      ...history(), 'turns': [latest, sameTime],
    }, projectId: project, conversationId: conversation)
      .turnsNewestFirst, hasLength(2));
  });

  test('private model words never become a verified ARK action', () {
    final parsed = parseGrovePrivateReply(
      reply(), requestId: requestId,
    );
    expect(parsed.persisted, isTrue);
    expect(parsed.replayed, isFalse);
    expect(parsed.requestId, requestId);
    for (final bad in [
      {...reply(), 'verifiesCompletion': true},
      {...reply(), 'liveExecutionVerified': true},
      {...reply(), 'grantsExecution': true},
      {...reply(), 'workReceipts': ['fabricated receipt']},
      {...reply(), 'requestId': conversation},
      {...reply(), 'replyVerification': 'verified_execution'},
      {...reply(), 'persisted': false},
      {...reply(), 'reply': ''},
    ]) {
      expect(() => parseGrovePrivateReply(
        bad, requestId: requestId,
      ), throwsFormatException);
    }
    final off = parseGrovePrivateReply({
      ...reply(), 'persisted': false,
    }..remove('requestId')..remove('replayed'), requestId: requestId);
    expect(off.persisted, isFalse);
    expect(off.requestId, isNull);
  });

  test('OFF client refuses every private call, including public API substitute',
      () async {
    final fake = FakeApi(apiUrl);
    final off = GrovePrivateConversationClient(
      api: fake, config: config,
    );
    expect(() => off.listExisting(project), throwsStateError);
    expect(() => off.createNew(project), throwsStateError);
    expect(() => off.loadRecent(
      projectId: project, conversationId: conversation), throwsStateError);
    expect(() => off.send(
      projectId: project, conversationId: conversation,
      requestId: requestId, text: 'Continue'), throwsStateError);
    final publicApi = FakeApi('https://firefly-coral.vercel.app');
    final rejected = GrovePrivateConversationClient(
      api: publicApi, config: config, enabled: true,
    );
    expect(() => rejected.listExisting(project), throwsStateError);
    expect(publicApi.calls, 0);
    expect(fake.calls, 0);
  });

  test('private Grove deletion requires exact signed host response and scope', () async {
    final api = FakeApi(apiUrl)..postResult = {
      'ok': true, 'deleted': true,
      'projectId': project, 'conversationId': conversation,
      'scope': 'grove_saved_transcript_only',
      'grantsExecution': false, 'verifiesCompletion': false,
    };
    final client = GrovePrivateConversationClient(
      api: api, config: config, enabled: true,
    );
    await client.deleteSaved(projectId: project, conversationId: conversation);
    expect(api.path, '/api/grove/chat/conversations/delete');
    expect(api.sent, {
      'projectId': project, 'conversationId': conversation,
      'confirmation': 'DELETE',
    });
    final count = api.calls;
    await expectLater(client.deleteSaved(
      projectId: project, conversationId: 'foreign'), throwsFormatException);
    expect(api.calls, count);
    for (final response in [
      {...api.postResult!, 'deleted': false},
      {...api.postResult!, 'conversationId': '00000000-0000-4000-8000-000000000006'},
      {...api.postResult!, 'scope': 'all_apps'},
      {...api.postResult!, 'grantsExecution': true},
      {...api.postResult!, 'verifiesCompletion': true},
      {...api.postResult!, 'workReceipts': ['fake-proof']},
    ]) {
      api.postResult = response;
      await expectLater(client.deleteSaved(
        projectId: project, conversationId: conversation),
        throwsFormatException);
    }
    final off = GrovePrivateConversationClient(api: api, config: config);
    await expectLater(off.deleteSaved(
      projectId: project, conversationId: conversation), throwsStateError);
  });

  test('enabled client uses only verified Grove scope and fixed endpoints',
      () async {
    final api = FakeApi(apiUrl)
      ..getResult = choices()
      ..postResult = reply();
    final client = GrovePrivateConversationClient(
      api: api, config: config, enabled: true,
    );
    expect((await client.listExisting(project))
      .conversations.single.conversationId, conversation);
    expect(api.path, '/api/grove/chat/conversations');
    expect(api.query, {'projectId': project});
    api.postResult = created();
    final newConversation = await client.createNew(project);
    expect(newConversation.conversationId, conversation);
    expect(api.path, '/api/grove/chat/conversations');
    expect(api.sent, {'projectId': project});
    api.getResult = history();
    expect((await client.loadRecent(
      projectId: project, conversationId: conversation))
      .turnsNewestFirst, hasLength(1));
    expect(api.path, '/api/grove/chat/history');
    expect(api.query, {
      'projectId': project, 'conversationId': conversation,
    });
    api.postResult = reply();
    final result = await client.send(
      projectId: project, conversationId: conversation,
      requestId: requestId, text: 'Continue our work.',
    );
    expect(result.persisted, isTrue);
    expect(api.path, '/api/grove/chat');
    expect(api.sent, {
      'projectId': project, 'conversationId': conversation,
      'requestId': requestId, 'message': 'Continue our work.',
      'timeZoneOffsetMinutes': DateTime.now().timeZoneOffset.inMinutes,
    });
    final count = api.calls;
    expect(() => client.send(
      projectId: project, conversationId: 'foreign',
      requestId: requestId, text: 'Continue'), throwsFormatException);
    expect(api.calls, count);
  });


  test('manual archive pages require an exact cursor and retain no model authority', () async {
    final cursor = 'c2NvcGVk'.padRight(64, 'a') + '.' + ('0' * 64);
    final api = FakeApi(apiUrl)..getResult = {
      ...choices(), 'mayBeTruncated': true, 'nextCursor': cursor,
    };
    final client = GrovePrivateConversationClient(
      api: api, config: config, enabled: true,
    );
    final first = await client.listArchive(project);
    expect(first.nextCursor, cursor);
    expect(first.mayBeTruncated, isTrue);
    expect(api.query, {'projectId': project, 'page': 'archive'});
    api.getResult = {...choices(), 'nextCursor': null};
    final next = await client.listArchive(project, cursor: cursor);
    expect(next.nextCursor, isNull);
    expect(api.query, {
      'projectId': project, 'page': 'archive', 'cursor': cursor,
    });
    final calls = api.calls;
    await expectLater(client.listArchive(project, cursor: 'not-signed'),
        throwsFormatException);
    expect(api.calls, calls);
    for (final invalid in [
      {...choices(), 'mayBeTruncated': true},
      {...choices(), 'mayBeTruncated': true, 'nextCursor': null},
      {...choices(), 'mayBeTruncated': false, 'nextCursor': cursor},
      {...choices(), 'mayBeTruncated': true, 'nextCursor': 'bad'},
      {...choices(), 'mayBeTruncated': false, 'nextCursor': 5},
    ]) {
      expect(() => parseGrovePrivateConversations(invalid,
          projectId: project, archive: true), throwsFormatException);
    }
    final off = GrovePrivateConversationClient(api: api, config: config);
    await expectLater(off.listArchive(project), throwsStateError);
  });

  test('manual saved-turn archive keeps page boundaries separate from model input', () async {
    final cursor = 'c2NvcGU'.padRight(64, 'a') + '.' + ('f' * 64);
    final api = FakeApi(apiUrl)..getResult = {
      ...history(), 'historyMayBeTruncated': true, 'nextCursor': cursor,
    };
    final client = GrovePrivateConversationClient(
      api: api, config: config, enabled: true,
    );
    final first = await client.loadArchive(
      projectId: project, conversationId: conversation,
    );
    expect(first.nextCursor, cursor);
    expect(first.turnsNewestFirst.single.userText, 'Continue our work.');
    expect(api.query, {
      'projectId': project, 'conversationId': conversation, 'page': 'archive',
    });
    api.getResult = {...history(), 'nextCursor': null};
    final second = await client.loadArchive(
      projectId: project, conversationId: conversation, cursor: cursor,
    );
    expect(second.nextCursor, isNull);
    expect(api.query, {
      'projectId': project, 'conversationId': conversation,
      'page': 'archive', 'cursor': cursor,
    });
    final count = api.calls;
    await expectLater(client.loadArchive(
      projectId: project, conversationId: conversation, cursor: 'bad',
    ), throwsFormatException);
    expect(api.calls, count);
    for (final invalid in [
      {...history(), 'historyMayBeTruncated': true},
      {...history(), 'historyMayBeTruncated': true, 'nextCursor': null},
      {...history(), 'historyMayBeTruncated': false, 'nextCursor': cursor},
      {...history(), 'historyMayBeTruncated': true, 'nextCursor': 'bad'},
    ]) {
      expect(() => parseGrovePrivateHistory(invalid,
        projectId: project, conversationId: conversation, archive: true,
      ), throwsFormatException);
    }
  });


  test('saved phrase search validates exact Grove scope without sending to model', () async {
    final api = FakeApi(apiUrl)..getResult = {
      ...history(),
      'searchMode': 'literal_phrase',
      'searchedOnlyThisConversation': true,
      'searchMayBeTruncated': false,
    };
    final client = GrovePrivateConversationClient(
      api: api, config: config, enabled: true,
    );
    final result = await client.findSavedPhrase(
      projectId: project, conversationId: conversation, phrase: 'Ever After',
    );
    expect(result.turnsNewestFirst.single.userText, 'Continue our work.');
    expect(api.path, '/api/grove/chat/history');
    expect(api.query, {
      'projectId': project,
      'conversationId': conversation,
      'search': 'Ever After',
    });
    final calls = api.calls;
    for (final bad in ['hi', 'foo%bar', 'a.b', '   ', 'hello,world', 'x' * 65]) {
      await expectLater(client.findSavedPhrase(
        projectId: project, conversationId: conversation, phrase: bad,
      ), throwsFormatException);
    }
    expect(api.calls, calls);
    for (final invalid in [
      {...history(), 'searchedOnlyThisConversation': true},
      {...history(), 'searchMode': 'literal_phrase',
        'searchedOnlyThisConversation': false, 'searchMayBeTruncated': false},
      {...history(), 'searchMode': 'literal_phrase',
        'searchedOnlyThisConversation': true, 'searchMayBeTruncated': true},
      {...history(), 'searchMode': 'literal_phrase',
        'searchedOnlyThisConversation': true, 'searchMayBeTruncated': false,
        'nextCursor': 'forged'},
    ]) {
      expect(() => parseGrovePrivateHistory(invalid,
        projectId: project, conversationId: conversation, search: true,
      ), throwsFormatException);
    }
    final off = GrovePrivateConversationClient(api: api, config: config);
    await expectLater(off.findSavedPhrase(projectId: project,
      conversationId: conversation, phrase: 'Ever After'), throwsStateError);
  });

}
