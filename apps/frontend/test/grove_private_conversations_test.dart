import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/arbor_api_client.dart';
import 'package:frontend/config/grove_private_config.dart';
import 'package:frontend/environment/grove_private_conversations.dart';

const project = '00000000-0000-4000-8000-000000000003';
const conversation = '00000000-0000-4000-8000-000000000004';
const requestId = '00000000-0000-4000-8000-000000000005';
const apiUrl = 'https://private-grove.example.org';
const config = GrovePrivateConfig(
  authUrl: 'https://synthetic-private.supabase.co',
  publishableKey: 'sb_publishable_private_synthetic',
  apiUrl: apiUrl,
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
    final result = await client.send(
      projectId: project, conversationId: conversation,
      requestId: requestId, text: 'Continue our work.',
    );
    expect(result.persisted, isTrue);
    expect(api.path, '/api/grove/chat');
    expect(api.sent, {
      'projectId': project, 'conversationId': conversation,
      'requestId': requestId, 'message': 'Continue our work.',
    });
    final count = api.calls;
    expect(() => client.send(
      projectId: project, conversationId: 'foreign',
      requestId: requestId, text: 'Continue'), throwsFormatException);
    expect(api.calls, count);
  });
}
