import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/chat_api.dart';

void main() {
  test('chat continuation retry delay is bounded', () {
    expect(chatContinuationRetryDelayMs(null), 400);
    expect(chatContinuationRetryDelayMs(-1), 400);
    expect(chatContinuationRetryDelayMs(250), 250);
    expect(chatContinuationRetryDelayMs(9000), 2000);
  });

  test('ChatResponse accepts canonical backend response', () {
    final response = ChatResponse.fromJson(
      {
        'ok': true,
        'projectId': 'project',
        'conversationId': 'conversation',
        'assistantText': 'hello',
      },
      turnId: 'turn',
    );

    expect(response.projectId, 'project');
    expect(response.conversationId, 'conversation');
    expect(response.turnId, 'turn');
    expect(response.assistantText, 'hello');
  });

  test('ChatResponse rejects malformed canonical response', () {
    expect(
      () => ChatResponse.fromJson(
        {
          'ok': true,
          'projectId': 'project',
          'conversationId': null,
          'assistantText': 'hello',
        },
        turnId: 'turn',
      ),
      throwsException,
    );
  });
}
