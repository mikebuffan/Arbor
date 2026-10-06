import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/arbor_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/device_string_store_fake.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('session persists project and conversation per user', () async {
    final first = ArborSession();

    await first.adopt(
      userId: 'user-a',
      projectId: 'project-a',
      conversationId: 'conversation-a',
    );

    final restored = ArborSession();
    final context = await restored.contextFor('user-a');

    expect(context?.projectId, 'project-a');
    expect(context?.conversationId, 'conversation-a');
  });

  test('new thread preserves project and clears conversation', () async {
    final session = ArborSession();

    await session.adopt(
      userId: 'user-a',
      projectId: 'project-a',
      conversationId: 'conversation-a',
    );

    await session.startNewThread(userId: 'user-a');

    final context = await session.contextFor('user-a');

    expect(context?.projectId, 'project-a');
    expect(context?.conversationId, isNull);
  });

  test('sessions are isolated by signed-in user', () async {
    final session = ArborSession();

    await session.adopt(
      userId: 'user-a',
      projectId: 'project-a',
      conversationId: 'conversation-a',
    );

    expect(await session.contextFor('user-b'), isNull);
  });

  test('session change signals follow the new in-memory scope, not old data',
      () async {
    final session = ArborSession();
    final observed = <String>[];
    final subscription = session.contextChanges.listen((userId) {
      final state = session.peek(userId);
      observed.add(userId + ':' +
          (state?.projectId ?? '<none>') + ':' +
          (state?.conversationId ?? '<none>'));
    });
    await session.adopt(
      userId: 'user-a',
      projectId: 'project-a',
      conversationId: 'thread-a',
    );
    await session.startNewThread(
      userId: 'user-a',
      projectId: 'project-b',
    );
    await session.clearStoredUser('user-a');
    expect(observed, [
      'user-a:project-a:thread-a',
      'user-a:project-b:<none>',
      'user-a:<none>:<none>',
    ]);
    await subscription.cancel();
  });

  test('failed adoption does not publish or persist a different scope', () async {
    final disk = FakeDeviceStringStore();
    final session = ArborSession(storage: disk);
    await session.adopt(userId: 'u', projectId: 'p', conversationId: 'a');
    final signals = <String>[];
    final subscription = session.contextChanges.listen(signals.add);
    disk.failWrites = true;
    await expectLater(session.adopt(userId: 'u', projectId: 'q',
      conversationId: 'b'), throwsStateError);
    expect(session.peek('u')?.conversationId, 'a');
    expect((await ArborSession(storage: disk).contextFor('u'))?.projectId, 'p');
    expect(signals, isEmpty);
    disk.failWrites = false;
    await session.adopt(userId: 'u', projectId: 'q', conversationId: 'b');
    expect(signals, ['u']);
    await subscription.cancel();
  });

  test('failed new-thread save retains the original conversation', () async {
    final disk = FakeDeviceStringStore();
    final session = ArborSession(storage: disk);
    await session.adopt(userId: 'u', projectId: 'p', conversationId: 'a');
    disk.failWrites = true;
    await expectLater(session.startNewThread(userId: 'u'), throwsStateError);
    expect(session.peek('u')?.conversationId, 'a');
    expect((await ArborSession(storage: disk).contextFor('u'))?.conversationId, 'a');
  });

  test('legacy read is unchanged; cleared tombstone prevents legacy resurrection', () async {
    final disk = FakeDeviceStringStore();
    disk.values['arbor.session.u.projectId'] = 'p';
    disk.values['arbor.session.u.conversationId'] = 'a';
    final session = ArborSession(storage: disk);
    expect((await session.contextFor('u'))?.conversationId, 'a');
    expect(disk.writes, 0);
    await session.clearStoredUser('u');
    expect(await ArborSession(storage: disk).contextFor('u'), isNull);
    expect(disk.writes, 1);
  });

  test('failed clear hides visible scope while honestly reporting disk failure', () async {
    final disk = FakeDeviceStringStore();
    final session = ArborSession(storage: disk);
    await session.adopt(userId: 'u', projectId: 'p', conversationId: 'a');
    disk.failWrites = true;
    await expectLater(session.clearStoredUser('u'), throwsStateError);
    expect(session.peek('u'), isNull);
    expect(await session.contextFor('u'), isNull);
    // Failure is not proof of physical deletion across restart.
    expect((await ArborSession(storage: disk).contextFor('u'))?.conversationId, 'a');
  });

  test('queued adoption and thread reset cannot persist a mixed scope', () async {
    final disk = FakeDeviceStringStore();
    final gate = Completer<void>();
    disk.pauseWrite = gate.future;
    final session = ArborSession(storage: disk);
    final adopt = session.adopt(userId: 'u', projectId: 'p', conversationId: 'a');
    final reset = session.startNewThread(userId: 'u');
    await Future<void>.delayed(Duration.zero);
    expect(session.peek('u'), isNull);
    gate.complete();
    await Future.wait([adopt, reset]);
    final restarted = await ArborSession(storage: disk).contextFor('u');
    expect(restarted?.projectId, 'p');
    expect(restarted?.conversationId, isNull);
    expect(disk.values.length, 1);
  });

  test('damaged or newer envelope never falls back to legacy scope', () async {
    final disk = FakeDeviceStringStore();
    disk.values['arbor.session.u.projectId'] = 'stale';
    disk.values['arbor.session.u.context.v1'] = jsonEncode({
      'version': 99, 'userId': 'u', 'projectId': 'p', 'conversationId': 'a',
    });
    await expectLater(ArborSession(storage: disk).contextFor('u'), throwsFormatException);
    expect(disk.writes, 0);
  });

}
