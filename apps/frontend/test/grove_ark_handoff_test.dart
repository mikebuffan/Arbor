import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_ark_handoff.dart';

Map<String, dynamic> handoff({
  String project = 'project-a',
  bool available = true,
  Object? objective,
  Object? checkpoint,
  Object? blocker,
  String? nextAction,
  bool evidence = false,
  Object? live = false,
}) => {
  'ok': true,
  'projectId': project,
  'handoff': {
    'version': 1,
    'source': 'ark_read_only',
    'capturedAt': '2026-09-21T20:00:00Z',
    'available': available,
    'objective': objective,
    'nextAction': nextAction,
    'checkpoint': checkpoint,
    'blocker': blocker,
    'completionEvidenceRecorded': evidence,
    'liveExecutionVerified': live,
  },
};

final objective = {
  'id': 'objective-1',
  'goal': 'Finish the Grove',
  'status': 'checkpointed',
};

void main() {
  test('project-matched checkpoint and next step preserve recorded provenance',
      () {
    final result = parseGroveArkHandoff(handoff(
      objective: objective,
      nextAction: 'Review remaining tests',
      checkpoint: {
        'id': 'checkpoint-2',
        'sequence': 2,
        'nextAction': 'Review remaining tests',
        'reason': 'interrupted',
      },
    ), projectId: 'project-a');
    expect(result.goal, 'Finish the Grove');
    expect(result.status, 'checkpointed');
    expect(result.nextAction, 'Review remaining tests');
    expect(result.checkpoint, contains('Checkpoint #2'));
    expect(result.capturedAt.isUtc, isTrue);
  });

  test('not available is distinct from an empty but available project', () {
    expect(parseGroveArkHandoff(
      handoff(available: false), projectId: 'project-a',
    ).available, isFalse);
    final empty = parseGroveArkHandoff(handoff(), projectId: 'project-a');
    expect(empty.available, isTrue);
    expect(empty.objectiveId, isNull);
    expect(empty.nextAction, isNull);
  });

  test('explicit owner blockers only; generic text cannot demand approval', () {
    final authorized = parseGroveArkHandoff(handoff(
      objective: {...objective, 'status': 'blocked'},
      blocker: {
        'kind': 'external_authority',
        'message': 'Approve release',
        'needsOwnerDecision': true,
      },
    ), projectId: 'project-a');
    expect(authorized.needsOwnerDecision, isTrue);
    final generic = parseGroveArkHandoff(handoff(
      objective: {...objective, 'status': 'blocked'},
      blocker: {
        'kind': 'unsupported_capability',
        'message': 'Approve release',
        'needsOwnerDecision': true,
      },
    ), projectId: 'project-a');
    expect(generic.needsOwnerDecision, isFalse);
  });

  test('rejects mismatched project and fabricated live execution', () {
    expect(() => parseGroveArkHandoff(
      handoff(project: 'project-b'), projectId: 'project-a',
    ), throwsFormatException);
    expect(() => parseGroveArkHandoff(
      handoff(live: true), projectId: 'project-a',
    ), throwsFormatException);
    expect(() => parseGroveArkHandoff(
      handoff()..['ok'] = false, projectId: 'project-a',
    ), throwsFormatException);
  });

  test('rejects objective-free work and malformed checkpoints', () {
    expect(() => parseGroveArkHandoff(
      handoff(nextAction: 'Pretend next step'),
      projectId: 'project-a',
    ), throwsFormatException);
    expect(() => parseGroveArkHandoff(handoff(
      objective: objective,
      checkpoint: {
        'id': 'checkpoint-2',
        'sequence': 0,
        'nextAction': 'Bad checkpoint',
      },
    ), projectId: 'project-a'), throwsFormatException);
    expect(() => parseGroveArkHandoff(handoff(
      objective: objective,
      blocker: {
        'kind': 'external_authority',
        'message': '',
        'needsOwnerDecision': true,
      },
    ), projectId: 'project-a'), throwsFormatException);
  });
}
