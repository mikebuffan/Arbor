import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_adapter.dart';
import 'package:frontend/environment/environment_state.dart';

class _Reader implements ArkStatusReader {
  const _Reader(this.blocker);
  final Object? blocker;

  @override
  Future<Map<String, dynamic>?> read(String projectId) async => {
    'available': true,
    'objectives': [
      {
        'id': 'objective-1',
        'goal': 'Trace an evidence source',
        'status': 'blocked',
        'blocker': blocker,
      },
    ],
    'tasks': [],
    'checkpoints': [],
    'events': [],
  };
}

void main() {
  test('explicit external authority blocker is a human decision', () async {
    final snapshot = await ArkEnvironmentAdapter(
      reader: const _Reader({
        'kind': 'external_authority',
        'message': 'Confirm deployment before proceeding',
      }),
      projectId: 'project-1',
    ).snapshot();
    expect(snapshot.objective.state, EnvironmentRunState.blocked);
    expect(snapshot.objective.requiresUserAction, isTrue);
    expect(snapshot.objective.blocker, 'Confirm deployment before proceeding');
  });

  test('missing preference is an explicit request', () async {
    final snapshot = await ArkEnvironmentAdapter(
      reader: const _Reader({
        'kind': 'missing_preference',
        'message': 'Choose a research budget',
      }),
      projectId: 'project-1',
    ).snapshot();
    expect(snapshot.objective.requiresUserAction, isTrue);
  });

  test('unsupported capability does not turn into a human request', () async {
    final snapshot = await ArkEnvironmentAdapter(
      reader: const _Reader({
        'kind': 'unsupported_capability',
        'message': 'Binary PDF parser unavailable',
      }),
      projectId: 'project-1',
    ).snapshot();
    expect(snapshot.objective.requiresUserAction, isFalse);
  });

  test('unstructured blocker text cannot be reclassified by keyword', () async {
    final snapshot = await ArkEnvironmentAdapter(
      reader: const _Reader('Please approve this after review'),
      projectId: 'project-1',
    ).snapshot();
    expect(snapshot.objective.state, EnvironmentRunState.blocked);
    expect(snapshot.objective.requiresUserAction, isFalse);
  });

  test('unknown blocker kind does not guess that a person is needed', () async {
    final snapshot = await ArkEnvironmentAdapter(
      reader: const _Reader({
        'kind': 'unknown_kind',
        'message': 'Blocked',
      }),
      projectId: 'project-1',
    ).snapshot();
    expect(snapshot.objective.requiresUserAction, isFalse);
  });
}
