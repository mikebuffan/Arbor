import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_adapter.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:frontend/environment/work_queue.dart';

class _FixtureReader implements ArkStatusReader {
  _FixtureReader(this.snapshots);

  final List<Map<String, dynamic>> snapshots;
  var index = 0;

  @override
  Future<Map<String, dynamic>?> read(String projectId) async {
    final snapshot = snapshots[index];
    if (index < snapshots.length - 1) index += 1;
    return snapshot;
  }
}

void main() {
  test('Environment consumes the same full-stack canary truth as ChatGPT', () async {
    final raw = jsonDecode(
      File('../../fixtures/ark_full_stack_canary.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    final projectId = raw['projectId'] as String;
    final snapshots = (raw['snapshots'] as List<dynamic>)
        .cast<Map<String, dynamic>>();

    final adapter = ArkEnvironmentAdapter(
      reader: _FixtureReader(snapshots),
      projectId: projectId,
    );

    final observed = <EnvironmentRunState>[];
    EnvironmentSnapshot? finalSnapshot;

    for (var i = 0; i < snapshots.length; i += 1) {
      final snapshot = await adapter.snapshot();
      observed.add(snapshot.objective.state);
      expect(snapshot.objective.hasTruthfulState, isTrue);
      expect(snapshot.source, 'ARK • READ ONLY');
      expect(snapshot.objective.isDemo, isFalse);
      finalSnapshot = snapshot;
    }

    expect(
      observed,
      [
        EnvironmentRunState.idle,
        EnvironmentRunState.working,
        EnvironmentRunState.checkpointed,
        EnvironmentRunState.working,
        EnvironmentRunState.complete,
      ],
    );

    expect(finalSnapshot, isNotNull);
    expect(
      finalSnapshot!.objective.completionReceipt,
      contains('"verification":"passed"'),
    );
    expect(finalSnapshot.workItems, hasLength(1));
    expect(finalSnapshot.workItems.single.state, WorkItemState.complete);
    expect(finalSnapshot.workItems.single.detail, contains('attempt 2/3'));
    expect(finalSnapshot.workItems.single.detail, contains('checkpoint #1'));
  });
}
