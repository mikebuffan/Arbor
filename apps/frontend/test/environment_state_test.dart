import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_state.dart';

void main() {
  group('EnvironmentObjectiveView truth contract', () {
    test('working requires a next action', () {
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.working).hasTruthfulState, isFalse);
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.working, nextAction: 'continue').hasTruthfulState, isTrue);
    });

    test('checkpointed requires receipt', () {
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.checkpointed).hasTruthfulState, isFalse);
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.checkpointed, checkpointReceipt: 'cp-1').hasTruthfulState, isTrue);
    });

    test('blocked requires concrete blocker', () {
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.blocked).hasTruthfulState, isFalse);
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.blocked, blocker: 'authorization required').hasTruthfulState, isTrue);
    });

    test('complete requires completion receipt', () {
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.complete).hasTruthfulState, isFalse);
      expect(const EnvironmentObjectiveView(title: 'x', state: EnvironmentRunState.complete, completionReceipt: 'proof-1').hasTruthfulState, isTrue);
    });
  });
}
