import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/chat_api.dart';

void main() {
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
