import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_adapter.dart';
import 'package:frontend/environment/environment_runtime_host.dart';
import 'package:frontend/environment/environment_state.dart';

class _PrivateGroveReader implements ArkStatusReader {
  _PrivateGroveReader(this.payload, {this.fail = false});

  final Map<String, dynamic>? payload;
  final bool fail;

  @override
  Future<Map<String, dynamic>?> read(String projectId) async {
    if (fail) throw StateError('Synthetic private Grove API outage');
    return payload;
  }
}

void main() {
  test('private Grove keeps an unavailable ARK response truthful', () async {
    final result = await readPrivateGroveArkSnapshot(
      primary: ArkEnvironmentAdapter(
        reader: _PrivateGroveReader({'available': false}),
        projectId: 'synthetic-project',
      ),
    );

    expect(result.objective.state, EnvironmentRunState.unavailable);
    expect(result.objective.isDemo, isFalse);
    expect(result.workItems, isEmpty);
    expect(result.stale, isTrue);
    expect(result.source, 'ARK • UNAVAILABLE');
  });

  test('private Grove does not use demo data on a null ARK response', () async {
    final result = await readPrivateGroveArkSnapshot(
      primary: ArkEnvironmentAdapter(
        reader: _PrivateGroveReader(null),
        projectId: 'synthetic-project',
      ),
    );

    expect(result.objective.state, EnvironmentRunState.unavailable);
    expect(result.objective.isDemo, isFalse);
    expect(result.workItems, isEmpty);
    expect(result.source, isNot(contains('DEMO')));
  });

  test('private Grove reports an API failure without invented work', () async {
    final result = await readPrivateGroveArkSnapshot(
      primary: ArkEnvironmentAdapter(
        reader: _PrivateGroveReader(null, fail: true),
        projectId: 'synthetic-project',
      ),
    );

    expect(result.objective.state, EnvironmentRunState.unavailable);
    expect(result.objective.isDemo, isFalse);
    expect(result.workItems, isEmpty);
    expect(result.stale, isTrue);
    expect(result.source, 'NO RUNTIME');
    expect(result.objective.blocker, contains('Retrying automatically'));
  });

  test('private Grove preserves a real, read-only ARK objective', () async {
    final result = await readPrivateGroveArkSnapshot(
      primary: ArkEnvironmentAdapter(
        reader: _PrivateGroveReader({
          'available': true,
          'objectives': [
            {
              'id': 'synthetic-objective',
              'goal': 'Restore the read-only Grove shelf',
              'status': 'queued',
            },
          ],
          'tasks': [],
          'checkpoints': [],
          'events': [],
        }),
        projectId: 'synthetic-project',
      ),
    );

    expect(result.objective.title, 'Restore the read-only Grove shelf');
    expect(result.objective.isDemo, isFalse);
    expect(result.objective.state, EnvironmentRunState.idle);
    expect(result.source, 'ARK • READ ONLY');
  });

  test('original Firefly demo fallback remains explicitly labeled', () async {
    final result = await FallbackEnvironmentAdapter(
      primary: ArkEnvironmentAdapter(
        reader: _PrivateGroveReader({'available': false}),
        projectId: 'synthetic-project',
      ),
      fallback: DemoEnvironmentAdapter(),
    ).snapshot();

    expect(result.objective.isDemo, isTrue);
    expect(result.source, startsWith('DEMO DATA'));
    expect(result.stale, isTrue);
  });
}
