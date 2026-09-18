import 'dart:async';
import 'dart:convert';

import '../api/arbor_api_client.dart';
import 'environment_state.dart';
import 'work_queue.dart';

abstract interface class EnvironmentRuntimeAdapter {
  Future<EnvironmentSnapshot> snapshot();
  Stream<EnvironmentSnapshot> watch();
}

abstract interface class ArkStatusReader {
  Future<Map<String, dynamic>?> read(String projectId);
}

class ArborApiArkStatusReader implements ArkStatusReader {
  ArborApiArkStatusReader(this.apiClient);

  final ArborApiClient apiClient;

  @override
  Future<Map<String, dynamic>?> read(String projectId) =>
      apiClient.get('/api/ark/status', queryParameters: {
        'projectId': projectId,
      });
}

class EnvironmentSnapshot {
  const EnvironmentSnapshot({
    required this.objective,
    required this.workItems,
    required this.source,
    required this.capturedAt,
    this.stale = false,
  });

  final EnvironmentObjectiveView objective;
  final List<WorkItemView> workItems;
  final String source;
  final DateTime capturedAt;
  final bool stale;
}

class ArkEnvironmentAdapter implements EnvironmentRuntimeAdapter {
  ArkEnvironmentAdapter({
    required this.reader,
    required this.projectId,
    this.refreshInterval = const Duration(seconds: 10),
  });

  final ArkStatusReader reader;
  final String projectId;
  final Duration refreshInterval;

  @override
  Future<EnvironmentSnapshot> snapshot() async {
    final payload = await reader.read(projectId);
    final capturedAt = _parseDate(payload?['capturedAt']) ?? DateTime.now();

    if (payload == null || payload['available'] != true) {
      return EnvironmentSnapshot(
        objective: const EnvironmentObjectiveView(
          title: 'ARK unavailable',
          state: EnvironmentRunState.unavailable,
        ),
        workItems: const [],
        source: 'ARK • UNAVAILABLE',
        capturedAt: capturedAt,
        stale: true,
      );
    }

    final objectives = _records(payload['objectives']);
    final tasks = _records(payload['tasks']);
    final checkpoints = _records(payload['checkpoints']);

    if (objectives.isEmpty) {
      return EnvironmentSnapshot(
        objective: const EnvironmentObjectiveView(
          title: 'No active ARK objective',
          state: EnvironmentRunState.idle,
        ),
        workItems: const [],
        source: 'ARK • READ ONLY',
        capturedAt: capturedAt,
      );
    }

    final objective = _selectObjective(objectives);
    final objectiveId = _string(objective['id']);
    final objectiveTasks = tasks
        .where((task) => _string(task['objective_id']) == objectiveId)
        .toList(growable: false);
    final objectiveCheckpoints = checkpoints
        .where((checkpoint) =>
            _string(checkpoint['objective_id']) == objectiveId)
        .toList(growable: false);

    final status = _string(objective['status']);
    final mappedState = _objectiveState(status);
    final blocker = _blockerText(objective['blocker']) ??
        _failedTaskError(objectiveTasks);
    final checkpointReceipt = objectiveCheckpoints.isEmpty
        ? null
        : _checkpointReceipt(objectiveCheckpoints.first);
    final completionReceipt =
        status == 'completed' ? _receipt(objective['completion_evidence']) : null;

    final nextAction = switch (status) {
      'awaiting_verification' => 'Verify objective completion',
      'running' || 'checkpointed' || 'queued' =>
        _nextTaskDescription(objectiveTasks),
      _ => null,
    };

    return EnvironmentSnapshot(
      objective: EnvironmentObjectiveView(
        title: _string(objective['goal']) ?? 'ARK objective',
        state: mappedState,
        nextAction: nextAction,
        blocker: blocker,
        checkpointReceipt: checkpointReceipt,
        completionReceipt: completionReceipt,
        isDemo: false,
        updatedAt: _parseDate(objective['updated_at']),
      ),
      workItems: objectiveTasks.map(_workItem).toList(growable: false),
      source: 'ARK • READ ONLY',
      capturedAt: capturedAt,
    );
  }

  @override
  Stream<EnvironmentSnapshot> watch() async* {
    yield await snapshot();
    await for (final _ in Stream<int>.periodic(refreshInterval, (count) => count)) {
      yield await snapshot();
    }
  }

  Map<String, dynamic> _selectObjective(
    List<Map<String, dynamic>> objectives,
  ) {
    const priority = [
      'running',
      'checkpointed',
      'blocked',
      'awaiting_verification',
      'queued',
    ];
    for (final status in priority) {
      for (final objective in objectives) {
        if (_string(objective['status']) == status) return objective;
      }
    }
    return objectives.first;
  }

  WorkItemView _workItem(Map<String, dynamic> task) {
    final status = _string(task['status']) ?? 'queued';
    final details = <String>[];

    final kind = _string(task['kind']);
    if (kind != null && kind.isNotEmpty) details.add(kind);

    final attempts = _int(task['attempt_count']);
    final maxAttempts = _int(task['max_attempts']);
    if (attempts != null && maxAttempts != null) {
      details.add('attempt $attempts/$maxAttempts');
    }

    final sequence = _int(task['checkpoint_sequence']);
    if (sequence != null && sequence > 0) {
      details.add('checkpoint #$sequence');
    }

    final error = _string(task['last_error']);
    if (error != null && error.isNotEmpty) details.add(error);

    return WorkItemView(
      _string(task['description']) ?? _string(task['task_key']) ?? 'ARK task',
      _workState(status),
      detail: details.isEmpty ? null : details.join(' • '),
      isDemo: false,
    );
  }
}

class FallbackEnvironmentAdapter implements EnvironmentRuntimeAdapter {
  FallbackEnvironmentAdapter({
    required this.primary,
    required this.fallback,
  });

  final EnvironmentRuntimeAdapter primary;
  final DemoEnvironmentAdapter fallback;

  @override
  Future<EnvironmentSnapshot> snapshot() async {
    try {
      final primarySnapshot = await primary.snapshot();
      if (primarySnapshot.objective.state != EnvironmentRunState.unavailable) {
        return primarySnapshot;
      }
      return fallback.makeSnapshot(
        reason: primarySnapshot.source,
      );
    } catch (_) {
      return fallback.makeSnapshot(reason: 'ARK READ FAILED');
    }
  }

  @override
  Stream<EnvironmentSnapshot> watch() async* {
    yield await snapshot();
  }
}

class UnavailableEnvironmentAdapter implements EnvironmentRuntimeAdapter {
  const UnavailableEnvironmentAdapter(this.reason);

  final String reason;

  @override
  Future<EnvironmentSnapshot> snapshot() async => EnvironmentSnapshot(
        objective: EnvironmentObjectiveView(
          title: 'Environment runtime unavailable',
          state: EnvironmentRunState.unavailable,
          blocker: reason,
        ),
        workItems: const [],
        source: 'NO RUNTIME',
        capturedAt: DateTime.now(),
        stale: true,
      );

  @override
  Stream<EnvironmentSnapshot> watch() => Stream.fromFuture(snapshot());
}

class DemoEnvironmentAdapter implements EnvironmentRuntimeAdapter {
  DemoEnvironmentAdapter();

  EnvironmentSnapshot makeSnapshot({String reason = 'LIVE ARK NOT AVAILABLE'}) =>
      EnvironmentSnapshot(
        objective: EnvironmentFixture.houseHasWalls(),
        workItems: const [
          WorkItemView(
            'Environment demo fallback',
            WorkItemState.running,
            detail: 'Live ARK state is unavailable',
          ),
        ],
        source: 'DEMO DATA • $reason',
        capturedAt: DateTime.now(),
        stale: true,
      );

  @override
  Future<EnvironmentSnapshot> snapshot() async => makeSnapshot();

  @override
  Stream<EnvironmentSnapshot> watch() => Stream.value(makeSnapshot());
}

List<Map<String, dynamic>> _records(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((row) => row.map(
            (key, value) => MapEntry(key.toString(), value),
          ))
      .toList(growable: false);
}

EnvironmentRunState _objectiveState(String? status) => switch (status) {
      'queued' => EnvironmentRunState.idle,
      'running' || 'awaiting_verification' => EnvironmentRunState.working,
      'checkpointed' => EnvironmentRunState.checkpointed,
      'blocked' => EnvironmentRunState.blocked,
      'completed' => EnvironmentRunState.complete,
      'failed' || 'cancelled' => EnvironmentRunState.degraded,
      _ => EnvironmentRunState.unavailable,
    };

WorkItemState _workState(String status) => switch (status) {
      'running' => WorkItemState.running,
      'checkpointed' => WorkItemState.checkpointed,
      'blocked' => WorkItemState.blocked,
      'completed' => WorkItemState.complete,
      'failed' => WorkItemState.failed,
      'cancelled' => WorkItemState.cancelled,
      _ => WorkItemState.queued,
    };

String? _nextTaskDescription(List<Map<String, dynamic>> tasks) {
  const statusOrder = ['running', 'checkpointed', 'queued'];
  for (final status in statusOrder) {
    for (final task in tasks) {
      if (_string(task['status']) == status) {
        return _string(task['description']) ?? _string(task['task_key']);
      }
    }
  }
  return null;
}

String? _failedTaskError(List<Map<String, dynamic>> tasks) {
  for (final task in tasks) {
    if (_string(task['status']) == 'failed') {
      return _string(task['last_error']) ?? 'ARK task failed';
    }
  }
  return null;
}

String? _blockerText(dynamic value) {
  if (value is Map) {
    final message = value['message'];
    if (message is String && message.trim().isNotEmpty) return message;
    final kind = value['kind'];
    if (kind is String && kind.trim().isNotEmpty) return kind;
  }
  return value is String && value.trim().isNotEmpty ? value : null;
}

String _checkpointReceipt(Map<String, dynamic> checkpoint) {
  final sequence = _int(checkpoint['sequence']);
  final reason = _string(checkpoint['reason']);
  final nextAction = _string(checkpoint['next_action']);
  return [
    if (sequence != null) 'Checkpoint #$sequence',
    if (reason != null) reason,
    if (nextAction != null) nextAction,
  ].join(' • ');
}

String? _receipt(dynamic value) {
  if (value == null) return null;
  if (value is String) return value;
  try {
    return jsonEncode(value);
  } catch (_) {
    return value.toString();
  }
}

String? _string(dynamic value) =>
    value is String && value.trim().isNotEmpty ? value : null;

int? _int(dynamic value) =>
    value is int ? value : value is num ? value.toInt() : null;

DateTime? _parseDate(dynamic value) =>
    value is String ? DateTime.tryParse(value) : null;
