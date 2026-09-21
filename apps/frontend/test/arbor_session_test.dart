import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/arbor_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

}
