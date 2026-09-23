import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_adapter.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:frontend/environment/work_queue.dart';

class _FakeReader implements ArkStatusReader {
  _FakeReader(this.payload);

  final Map<String, dynamic>? payload;

  @override
  Future<Map<String, dynamic>?> read(String projectId) async => payload;
}

class _SequenceReader implements ArkStatusReader {
  _SequenceReader(this.payloads);

  final List<Map<String, dynamic>> payloads;
  var index = 0;

  @override
  Future<Map<String, dynamic>?> read(String projectId) async {
    final current = payloads[index];
    if (index < payloads.length - 1) index += 1;
    return current;
  }
}

void main() {
  test('private Grove uses its own ARK read route', () {
    expect(arkStatusPath(privateGrove: true), '/api/grove/ark/status');
    expect(arkStatusPath(privateGrove: false), '/api/ark/status');
  });

  test('demo adapter identifies itself as fallback data', () async {
    final snapshot = await DemoEnvironmentAdapter().snapshot();

    expect(snapshot.source, startsWith('DEMO DATA'));
    expect(snapshot.objective.isDemo, isTrue);
    expect(snapshot.stale, isTrue);
    expect(snapshot.workItems.every((item) => item.isDemo), isTrue);
  });

  test('ARK adapter maps running objective and real task attempts', () async {
    final adapter = ArkEnvironmentAdapter(
      reader: _FakeReader({
        'available': true,
        'capturedAt': '2026-09-18T20:00:00Z',
        'objectives': [
          {
            'id': 'objective-1',
            'goal': 'Finish ARK canary',
            'status': 'running',
            'updated_at': '2026-09-18T19:59:00Z',
          },
        ],
        'tasks': [
          {
            'id': 'task-1',
            'objective_id': 'objective-1',
            'task_key': 'step-1',
            'kind': 'arbor.agency-tool',
            'description': 'Inspect project state',
            'status': 'running',
            'attempt_count': 2,
            'max_attempts': 3,
            'checkpoint_sequence': 0,
          },
        ],
        'checkpoints': [],
        'events': [],
      }),
      projectId: 'project-1',
    );

    final snapshot = await adapter.snapshot();

    expect(snapshot.source, 'ARK • READ ONLY');
    expect(snapshot.objective.isDemo, isFalse);
    expect(snapshot.objective.state, EnvironmentRunState.working);
    expect(snapshot.objective.nextAction, 'Inspect project state');
    expect(snapshot.objective.hasTruthfulState, isTrue);
    expect(snapshot.workItems, hasLength(1));
    expect(snapshot.workItems.single.state, WorkItemState.running);
    expect(snapshot.workItems.single.detail, contains('attempt 2/3'));
  });

  test('ARK adapter surfaces persisted checkpoint receipt', () async {
    final adapter = ArkEnvironmentAdapter(
      reader: _FakeReader({
        'available': true,
        'objectives': [
          {
            'id': 'objective-1',
            'goal': 'Resume durable work',
            'status': 'checkpointed',
          },
        ],
        'tasks': [
          {
            'objective_id': 'objective-1',
            'task_key': 'step-1',
            'description': 'Continue extraction',
            'status': 'checkpointed',
            'attempt_count': 1,
            'max_attempts': 3,
            'checkpoint_sequence': 2,
          },
        ],
        'checkpoints': [
          {
            'objective_id': 'objective-1',
            'sequence': 2,
            'reason': 'interruption',
            'next_action': 'Resume at cursor 7',
          },
        ],
        'events': [],
      }),
      projectId: 'project-1',
    );

    final snapshot = await adapter.snapshot();

    expect(snapshot.objective.state, EnvironmentRunState.checkpointed);
    expect(snapshot.objective.checkpointReceipt, contains('Checkpoint #2'));
    expect(snapshot.objective.checkpointReceipt, contains('Resume at cursor 7'));
    expect(snapshot.objective.hasTruthfulState, isTrue);
    expect(snapshot.workItems.single.state, WorkItemState.checkpointed);
  });

  test('ARK adapter never calls completed without completion evidence', () async {
    final adapter = ArkEnvironmentAdapter(
      reader: _FakeReader({
        'available': true,
        'objectives': [
          {
            'id': 'objective-1',
            'goal': 'Verified work',
            'status': 'completed',
            'completion_evidence': {'gate': 'verified'},
          },
        ],
        'tasks': [
          {
            'objective_id': 'objective-1',
            'task_key': 'step-1',
            'description': 'Finish work',
            'status': 'completed',
          },
        ],
        'checkpoints': [],
        'events': [],
      }),
      projectId: 'project-1',
    );

    final snapshot = await adapter.snapshot();

    expect(snapshot.objective.state, EnvironmentRunState.complete);
    expect(snapshot.objective.completionReceipt, contains('verified'));
    expect(snapshot.objective.hasTruthfulState, isTrue);
  });

  test('malformed completed state without evidence is degraded, never shown complete', () async {
    final adapter = ArkEnvironmentAdapter(
      reader: _FakeReader({
        'available': true,
        'objectives': [
          {
            'id': 'objective-1',
            'goal': 'Missing proof',
            'status': 'completed',
          },
        ],
        'tasks': [
          {
            'objective_id': 'objective-1',
            'task_key': 'step-1',
            'description': 'Finish work',
            'status': 'completed',
          },
        ],
        'checkpoints': [],
        'events': [],
      }),
      projectId: 'project-1',
    );

    final snapshot = await adapter.snapshot();

    expect(snapshot.objective.state, EnvironmentRunState.degraded);
    expect(snapshot.objective.completionReceipt, isNull);
    expect(snapshot.objective.hasTruthfulState, isTrue);
  });

  test('canary lifecycle stays truthful from queue through verified completion', () async {
    Map<String, dynamic> payload(
      String objectiveStatus,
      String taskStatus, {
      Map<String, dynamic>? checkpoint,
      Object? evidence,
    }) =>
        {
          'available': true,
          'objectives': [
            {
              'id': 'objective-1',
              'goal': 'Canary objective',
              'status': objectiveStatus,
              if (evidence != null) 'completion_evidence': evidence,
            },
          ],
          'tasks': [
            {
              'objective_id': 'objective-1',
              'task_key': 'execute',
              'description': 'Execute canary',
              'status': taskStatus,
              'attempt_count': 1,
              'max_attempts': 3,
              'checkpoint_sequence': checkpoint == null ? 0 : 1,
            },
          ],
          'checkpoints': checkpoint == null ? [] : [checkpoint],
          'events': [],
        };

    final adapter = ArkEnvironmentAdapter(
      reader: _SequenceReader([
        payload('queued', 'queued'),
        payload('running', 'running'),
        payload(
          'checkpointed',
          'checkpointed',
          checkpoint: {
            'objective_id': 'objective-1',
            'sequence': 1,
            'reason': 'interruption',
            'next_action': 'Resume canary',
          },
        ),
        payload('running', 'running'),
        payload(
          'completed',
          'completed',
          evidence: {'verification': 'passed'},
        ),
      ]),
      projectId: 'project-1',
    );

    final states = <EnvironmentRunState>[];
    for (var i = 0; i < 5; i += 1) {
      final snapshot = await adapter.snapshot();
      states.add(snapshot.objective.state);
      expect(snapshot.objective.hasTruthfulState, isTrue);
    }

    expect(
      states,
      [
        EnvironmentRunState.idle,
        EnvironmentRunState.working,
        EnvironmentRunState.checkpointed,
        EnvironmentRunState.working,
        EnvironmentRunState.complete,
      ],
    );
  });

  test('unavailable ARK can fall back without masquerading as live state', () async {
    final adapter = FallbackEnvironmentAdapter(
      primary: ArkEnvironmentAdapter(
        reader: _FakeReader({
          'available': false,
          'objectives': [],
          'tasks': [],
          'checkpoints': [],
          'events': [],
        }),
        projectId: 'project-1',
      ),
      fallback: DemoEnvironmentAdapter(),
    );

    final snapshot = await adapter.snapshot();

    expect(snapshot.objective.isDemo, isTrue);
    expect(snapshot.source, contains('DEMO DATA'));
    expect(snapshot.source, contains('ARK • UNAVAILABLE'));
    expect(snapshot.stale, isTrue);
  });
}
