import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/arbor_api_client.dart';
import 'package:frontend/config/grove_private_config.dart';
import 'package:frontend/environment/grove_private_conversations.dart';
import 'package:frontend/pages/grove_private_text_page.dart';

const projectId = '00000000-0000-4000-8000-000000000003';
const conversationId = '00000000-0000-4000-8000-000000000004';
const expectedProjectId = projectId;
const expectedConversationId = conversationId;
const requestId = '00000000-0000-4000-8000-000000000005';
const apiOrigin = 'https://grove-private.example.org';
const config = GrovePrivateConfig(
  authUrl: 'https://synthetic-private.supabase.co',
  publishableKey: 'sb_publishable_private_fixture',
  apiUrl: apiOrigin,
);

class _FakePrivateClient extends GrovePrivateConversationClient {
  _FakePrivateClient() : super(
    api: ArborApiClient(baseUrl: apiOrigin),
    config: config,
    enabled: true,
  );

  int discoveries = 0;
  int historyReads = 0;
  int sends = 0;
  bool empty = false;
  bool failOnce = false;
  bool staleHistoryOnce = false;
  final retryIds = <String>[];
  final saved = <GrovePrivateCompleteTurn>[];

  @override
  Future<GrovePrivateConversationChoices> listExisting(String projectId) async {
    discoveries++;
    return GrovePrivateConversationChoices(
      projectId: projectId, mayBeTruncated: false,
      conversations: empty ? [] : [
        GrovePrivateConversationChoice(
          conversationId: conversationId,
          createdAt: DateTime.utc(2026, 9, 23),
          updatedAt: DateTime.utc(2026, 9, 23, 1),
        ),
      ],
    );
  }

  @override
  Future<GrovePrivateHistory> loadRecent({
    required String projectId,
    required String conversationId,
  }) async {
    historyReads++;
    final showSaved = !staleHistoryOnce || saved.isEmpty;
    if (saved.isNotEmpty) staleHistoryOnce = false;
    return GrovePrivateHistory(
      projectId: projectId,
      conversationId: conversationId,
      mayBeTruncated: false,
      turnsNewestFirst: [
        if (showSaved) ...saved.reversed,
        GrovePrivateCompleteTurn(
          requestId: requestId,
          userText: 'Earlier private question',
          assistantText: 'Earlier private answer',
          replyVerification: 'unverified_model_text',
          createdAt: DateTime.utc(2026, 9, 23),
        ),
      ],
    );
  }

  @override
  Future<GrovePrivateReply> send({
    required String projectId,
    required String conversationId,
    required String requestId,
    required String text,
  }) async {
    expect(projectId, expectedProjectId);
    expect(conversationId, expectedConversationId);
    expect(text, 'Continue Arbor');
    sends++;
    retryIds.add(requestId);
    if (failOnce) {
      failOnce = false;
      throw StateError('Private provider detail should not reach UI');
    }
    if (!saved.any((turn) => turn.requestId == requestId)) {
      saved.add(GrovePrivateCompleteTurn(
        requestId: requestId, userText: text,
        assistantText: 'Ready to continue.',
        replyVerification: 'unverified_model_text',
        createdAt: DateTime.utc(2026, 9, 23, 2),
      ));
    }
    return GrovePrivateReply(
      text: 'Ready to continue.',
      requestId: requestId,
      persisted: true,
      replayed: sends > 1,
      replyVerification: 'unverified_model_text',
    );
  }
}

void main() {
  testWidgets('Grove picker never fabricates a conversation when none exists',
      (tester) async {
    final client = _FakePrivateClient()..empty = true;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: GrovePrivateTextPanel(
        client: client,
        projectId: projectId,
        sessionStillValid: () => true,
        onConversationSelected: (_) async {},
      )),
    ));
    await tester.pumpAndSettle();
    expect(client.discoveries, 1);
    expect(find.textContaining('will not invent one'), findsOneWidget);
    expect(find.text('Send'), findsNothing);
    expect(client.sends, 0);
  });

  testWidgets('leaving and reopening private Text restores the saved pair',
      (tester) async {
    final client = _FakePrivateClient();
    Widget phone() => MaterialApp(
      home: Scaffold(body: GrovePrivateTextPanel(
        client: client, projectId: projectId,
        initialConversationId: conversationId,
        sessionStillValid: () => true,
        onConversationSelected: (_) async {},
      )),
    );
    await tester.pumpWidget(phone());
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.saved, hasLength(1));
    expect(client.sends, 1);

    // Destroy the screen as if leaving Grove, then construct a fresh one.
    // Only the fake server-side store survives, not widget-local chat state.
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    await tester.pumpAndSettle();
    await tester.pumpWidget(phone());
    await tester.pumpAndSettle();
    expect(client.historyReads, 3);
    expect(find.text('Continue Arbor'), findsOneWidget);
    expect(find.text('Ready to continue.'), findsOneWidget);
    expect(client.sends, 1);
  });

  testWidgets('stale reopen history preserves the original draft and retry ID',
      (tester) async {
    final client = _FakePrivateClient()..staleHistoryOnce = true;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: GrovePrivateTextPanel(
        client: client, projectId: projectId,
        initialConversationId: conversationId,
        sessionStillValid: () => true,
        onConversationSelected: (_) async {},
      )),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.sends, 1);
    expect(client.historyReads, 2);
    expect(find.textContaining('could not confirm that reply'), findsOneWidget);
    expect(find.text('Continue Arbor'), findsOneWidget);
    expect(find.text('Ready to continue.'), findsNothing);
    final originalId = client.retryIds.single;

    // The same persisted request is replayed. Only confirmed history permits
    // the phone to clear its draft; no second logical turn is created.
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.retryIds, [originalId, originalId]);
    expect(client.saved, hasLength(1));
    expect(find.text('Continue Arbor'), findsOneWidget);
    expect(find.text('Ready to continue.'), findsOneWidget);
    expect(find.textContaining('could not confirm that reply'), findsNothing);
  });

  testWidgets('private Text restores only an approved existing conversation',
      (tester) async {
    final client = _FakePrivateClient()..failOnce = true;
    final selected = <String>[];
    var stillOwner = true;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: GrovePrivateTextPanel(
        client: client,
        projectId: projectId,
        initialConversationId: conversationId,
        sessionStillValid: () => stillOwner,
        onConversationSelected: (id) async { selected.add(id); },
      )),
    ));
    await tester.pumpAndSettle();
    expect(selected, [conversationId]);
    expect(client.historyReads, 1);
    expect(find.text('Earlier private question'), findsOneWidget);
    expect(find.text('Earlier private answer'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.sends, 1);
    expect(find.textContaining('could not confirm that reply'), findsOneWidget);
    expect(find.text('Continue Arbor'), findsOneWidget);
    final firstId = client.retryIds.single;
    expect(RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    ).hasMatch(firstId), isTrue);

    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.sends, 2);
    expect(client.retryIds, [firstId, firstId]);
    expect(client.historyReads, 2);
    expect(find.textContaining('could not confirm that reply'), findsNothing);
    expect(find.textContaining('Model text is not a verified ARK action'),
      findsOneWidget);

    // The private transcript disappears immediately when owner scope changes.
    stillOwner = false;
    // In production a Supabase auth event rebuilds/unmounts the host.
    // Mirror that change here; changing a captured bool alone does not
    // schedule a Flutter frame.
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: GrovePrivateTextPanel(
        client: client,
        projectId: projectId,
        initialConversationId: conversationId,
        sessionStillValid: () => stillOwner,
        onConversationSelected: (id) async { selected.add(id); },
      )),
    ));
    expect(find.text('Earlier private answer'), findsNothing);
    expect(find.textContaining('Private Grove access changed'), findsOneWidget);
    expect(client.sends, 2);
  });
}
