import '../api/arbor_api_client.dart';

/// Persisted read-only ARK state. "Running" is not a worker heartbeat.
class GroveArkHandoff {
  const GroveArkHandoff({
    required this.projectId,
    required this.available,
    required this.capturedAt,
    required this.goal,
    required this.status,
    required this.objectiveId,
    required this.nextAction,
    required this.checkpoint,
    required this.blocker,
    required this.needsOwnerDecision,
    required this.completionEvidenceRecorded,
  });
  final String projectId;
  final bool available;
  final DateTime capturedAt;
  final String? goal;
  final String? status;
  final String? objectiveId;
  final String? nextAction;
  final String? checkpoint;
  final String? blocker;
  final bool needsOwnerDecision;
  final bool completionEvidenceRecorded;
}

String? _text(dynamic value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;

/// Reject incomplete/mismatched responses rather than inventing active work.
GroveArkHandoff parseGroveArkHandoff(
  Map<String, dynamic>? payload, {
  required String projectId,
}) {
  if (projectId.isEmpty ||
      payload?['ok'] != true ||
      payload?['projectId'] != projectId ||
      payload?['handoff'] is! Map) {
    throw const FormatException('Invalid ARK handoff response');
  }
  final handoff = Map<String, dynamic>.from(payload!['handoff'] as Map);
  final capturedAt = DateTime.tryParse((handoff['capturedAt'] ?? '').toString());
  if (handoff['version'] != 1 ||
      handoff['source'] != 'ark_read_only' ||
      handoff['available'] is! bool ||
      handoff['liveExecutionVerified'] != false ||
      handoff['completionEvidenceRecorded'] is! bool ||
      capturedAt == null) {
    throw const FormatException('ARK handoff truth contract failed');
  }
  final rawObjective = handoff['objective'];
  final rawCheckpoint = handoff['checkpoint'];
  final rawBlocker = handoff['blocker'];
  if ((rawObjective != null && rawObjective is! Map) ||
      (rawCheckpoint != null && rawCheckpoint is! Map) ||
      (rawBlocker != null && rawBlocker is! Map) ||
      (handoff['nextAction'] != null &&
          _text(handoff['nextAction']) == null)) {
    throw const FormatException('Malformed ARK handoff state');
  }
  final objective = rawObjective is Map
      ? Map<String, dynamic>.from(rawObjective) : null;
  final checkpoint = rawCheckpoint is Map
      ? Map<String, dynamic>.from(rawCheckpoint) : null;
  final blocker = rawBlocker is Map
      ? Map<String, dynamic>.from(rawBlocker) : null;
  if (objective != null &&
      (_text(objective['id']) == null ||
          _text(objective['goal']) == null ||
          _text(objective['status']) == null)) {
    throw const FormatException('Malformed persisted objective');
  }
  if (objective == null &&
      (handoff['nextAction'] != null ||
          checkpoint != null ||
          blocker != null ||
          handoff['completionEvidenceRecorded'] == true)) {
    throw const FormatException('Handoff states work without an objective');
  }
  if (checkpoint != null &&
      (_text(checkpoint['id']) == null ||
          checkpoint['sequence'] is! int ||
          (checkpoint['sequence'] as int) <= 0 ||
          _text(checkpoint['nextAction']) == null)) {
    throw const FormatException('Malformed persisted checkpoint');
  }
  if (blocker != null &&
      (blocker['needsOwnerDecision'] is! bool ||
          _text(blocker['message']) == null)) {
    throw const FormatException('Malformed persisted blocker');
  }
  const decisionKinds = {
    'external_authority',
    'missing_preference',
    'high_consequence_fork',
    'irreversible_action',
  };
  return GroveArkHandoff(
    projectId: projectId,
    available: handoff['available'] as bool,
    capturedAt: capturedAt.toUtc(),
    goal: _text(objective?['goal']),
    status: _text(objective?['status']),
    objectiveId: _text(objective?['id']),
    nextAction: _text(handoff['nextAction']),
    checkpoint: checkpoint == null ? null
        : 'Checkpoint #' + checkpoint['sequence'].toString() +
            ' · ' + (checkpoint['nextAction'] as String) +
            (_text(checkpoint['reason']) == null
                ? '' : ' · ' + (checkpoint['reason'] as String)),
    blocker: _text(blocker?['message']),
    needsOwnerDecision: blocker?['needsOwnerDecision'] == true &&
        decisionKinds.contains(_text(blocker?['kind'])),
    completionEvidenceRecorded: handoff['completionEvidenceRecorded'] as bool,
  );
}

class GroveArkHandoffReader {
  const GroveArkHandoffReader(this.api);
  final ArborApiClient api;
  Future<GroveArkHandoff> read(String projectId) async {
    final response = await api.get('/api/ark/handoff',
        queryParameters: {'projectId': projectId});
    return parseGroveArkHandoff(response, projectId: projectId);
  }
}
