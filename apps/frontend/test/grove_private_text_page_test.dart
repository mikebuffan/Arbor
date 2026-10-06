import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/arbor_api_client.dart';
import 'package:frontend/config/grove_private_config.dart';
import 'package:frontend/environment/grove_private_conversations.dart';
import 'package:frontend/environment/grove_pending_turn_store.dart';

import 'support/device_string_store_fake.dart';
import 'package:frontend/pages/grove_private_text_page.dart';

const projectId = '00000000-0000-4000-8000-000000000003';
const conversationId = '00000000-0000-4000-8000-000000000004';
const expectedProjectId = projectId;
const expectedConversationId = conversationId;
const requestId = '00000000-0000-4000-8000-000000000005';
const apiOrigin = 'https://grove-private.example.org';
const config = GrovePrivateConfig(
  authUrl: 'https://fqjqpuaoifgbweiguacf.supabase.co',
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
  int creations = 0;
  bool created = false;
  bool empty = false;
  bool failOnce = false;
  bool staleHistoryOnce = false;
  bool lostReplyOnce = false;
  void Function()? afterSaved;
  final retryIds = <String>[];
  final saved = <GrovePrivateCompleteTurn>[];

  @override
  Future<GrovePrivateConversationChoices> listExisting(String projectId) async {
    discoveries++;
    return GrovePrivateConversationChoices(
      projectId: projectId, mayBeTruncated: false,
      conversations: empty && !created ? [] : [
        GrovePrivateConversationChoice(
          conversationId: conversationId,
          createdAt: DateTime.utc(2026, 9, 23),
          updatedAt: DateTime.utc(2026, 9, 23, 1),
        ),
      ],
    );
  }

  @override
  Future<GrovePrivateConversationChoice> createNew(String projectId) async {
    expect(projectId, expectedProjectId);
    creations++;
    created = true;
    return GrovePrivateConversationChoice(
      conversationId: conversationId,
      createdAt: DateTime.utc(2026, 9, 23),
      updatedAt: DateTime.utc(2026, 9, 23, 1),
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
    afterSaved?.call();
    if (lostReplyOnce) {
      lostReplyOnce = false;
      throw StateError('Reply lost after server save');
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


GrovePendingTurnStore pendingStore(FakeDeviceStringStore disk, {
  String owner = '00000000-0000-4000-8000-000000000001',
}) => GrovePendingTurnStore(userId: owner, projectId: projectId,
    apiOrigin: apiOrigin, authOrigin: config.authUrl, storage: disk);

Widget recoveryPhone(_FakePrivateClient client, GrovePendingTurnStore store, {
  bool Function()? valid,
}) => MaterialApp(home: Scaffold(body: GrovePrivateTextPanel(
  client: client, projectId: projectId,
  initialConversationId: conversationId, pendingStore: store,
  sessionStillValid: valid ?? () => true,
  onConversationSelected: (_) async {},
)));

Future<void> roomForRecovery(WidgetTester tester) async {
  await tester.binding.setSurfaceSize(const Size(900, 1100));
  addTearDown(() => tester.binding.setSurfaceSize(null));
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
    expect(find.text('New private conversation'), findsNothing);
    expect(find.textContaining('not enabled in this Grove build'), findsOneWidget);
    expect(client.creations, 0);
    expect(client.sends, 0);
  });

  testWidgets('creates a real approved new private thread only after user taps',
      (tester) async {
    final client = _FakePrivateClient()..empty = true;
    Widget phone() => MaterialApp(
      home: Scaffold(body: GrovePrivateTextPanel(
        client: client,
        projectId: projectId,
        allowNewConversations: true,
        sessionStillValid: () => true,
        onConversationSelected: (_) async {},
      )),
    );
    await tester.pumpWidget(phone());
    await tester.pumpAndSettle();
    expect(client.creations, 0);
    expect(client.sends, 0);
    expect(find.text('Send'), findsNothing);
    await tester.tap(find.text('New private conversation'));
    await tester.pumpAndSettle();
    expect(client.creations, 1);
    expect(client.historyReads, 1);
    expect(find.text('Send'), findsOneWidget);

    // Reopening discovers the same database-provided conversation ID and
    // never generates another one on startup.
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    await tester.pumpAndSettle();
    await tester.pumpWidget(phone());
    await tester.pumpAndSettle();
    expect(client.creations, 1);
    expect(client.discoveries, 2);
    expect(find.text('Send'), findsOneWidget);
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
  testWidgets('unsent draft retention is explicit and restores without a send', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    final client = _FakePrivateClient();
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.pumpAndSettle();
    expect(disk.writes, 0);
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    expect(disk.writes, 1);
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    await tester.pumpAndSettle();
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    expect(find.text('Continue Arbor'), findsOneWidget);
    expect(find.textContaining('Nothing was resent'), findsOneWidget);
    expect(client.sends, 0);
  });

  testWidgets('uncertain send survives remount and reuses the original retry ID', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    final client = _FakePrivateClient()..failOnce = true;
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    final originalId = client.retryIds.single;
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    await tester.pumpAndSettle();
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    expect(client.sends, 1);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.retryIds, [originalId, originalId]);
    expect(client.saved, hasLength(1));
    expect((await pendingStore(disk).load(conversationId))?.requestId, isNull);
  });

  testWidgets('lost reply after server completion recovers without repeat inference', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    final client = _FakePrivateClient()..lostReplyOnce = true;
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    await tester.pumpAndSettle();
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    expect(client.sends, 1);
    expect(client.saved, hasLength(1));
    expect(find.text('Ready to continue.'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
    expect((await pendingStore(disk).load(conversationId))?.requestId, isNull);
  });

  testWidgets('device write failure stops send and preserves retry identity', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    final client = _FakePrivateClient();
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    disk.failWrites = true;
    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.sends, 0);
    expect(find.textContaining('could not confirm that reply'), findsOneWidget);
    disk.failWrites = false;
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.sends, 1);
    expect(client.saved, hasLength(1));
  });

  testWidgets('unknown saved draft blocks send until explicit confirmed discard', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    final store = pendingStore(disk);
    await store.save(conversationId, const GrovePendingTurn(text: 'Private draft'));
    disk.values[disk.values.keys.single] = '{"version":99}';
    final client = _FakePrivateClient();
    await tester.pumpWidget(recoveryPhone(client, store));
    await tester.pumpAndSettle();
    expect(find.textContaining('Sending is blocked'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Send')).onPressed,
      isNull);
    await tester.tap(find.text('Discard unfinished message'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Keep message'));
    await tester.pumpAndSettle();
    expect(disk.values.values.single, '{"version":99}');
    await tester.tap(find.text('Discard unfinished message'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Discard message'));
    await tester.pumpAndSettle();
    expect(await store.load(conversationId), isNull);
    expect(client.sends, 0);
  });

  testWidgets('other account never restores local private text', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    await pendingStore(disk).save(conversationId,
      const GrovePendingTurn(text: 'Other owner private draft'));
    final client = _FakePrivateClient();
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk,
      owner: '00000000-0000-4000-8000-000000000009')));
    await tester.pumpAndSettle();
    expect(find.text('Other owner private draft'), findsNothing);
    expect(disk.writes, 1);
    expect(client.sends, 0);
  });

  testWidgets('revocation while device save waits prevents model disclosure', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    final client = _FakePrivateClient();
    var valid = true;
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk),
      valid: () => valid));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    final gate = Completer<void>();
    disk.pauseWrite = gate.future;
    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pump();
    expect(client.sends, 0);
    valid = false;
    gate.complete();
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk),
      valid: () => valid));
    await tester.pumpAndSettle();
    expect(client.sends, 0);
    expect(find.text('Continue Arbor'), findsNothing);
    expect(find.textContaining('Private Grove access changed'), findsOneWidget);
  });

  testWidgets('cleanup failure keeps original retry until storage recovers', (tester) async {
    await roomForRecovery(tester);
    final disk = FakeDeviceStringStore();
    final client = _FakePrivateClient();
    client.afterSaved = () => disk.failWrites = true;
    await tester.pumpWidget(recoveryPhone(client, pendingStore(disk)));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Continue Arbor');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    final id = client.retryIds.single;
    expect((await pendingStore(disk).load(conversationId))?.requestId, id);
    expect(find.textContaining('could not confirm that reply'), findsOneWidget);
    disk.failWrites = false;
    client.afterSaved = null;
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(client.retryIds, [id, id]);
    expect(client.saved, hasLength(1));
    expect((await pendingStore(disk).load(conversationId))?.requestId, isNull);
  });

}
