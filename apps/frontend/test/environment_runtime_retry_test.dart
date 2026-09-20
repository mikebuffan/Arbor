import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_runtime_host.dart';
import 'package:frontend/environment/environment_state.dart';

void main() {
  test('ARK runtime polling retries after a failed refresh', () async {
    var attempts = 0;
    final recovered = EnvironmentSnapshot(
      objective: const EnvironmentObjectiveView(
        title: 'Recovered ARK state',
        state: EnvironmentRunState.idle,
      ),
      workItems: const [],
      source: 'ARK • READ ONLY',
      capturedAt: DateTime.utc(2026, 9, 20),
    );

    final iterator = StreamIterator<EnvironmentSnapshot>(
      retryingEnvironmentSnapshots(
        read: () async {
          attempts += 1;
          if (attempts == 1) {
            throw StateError('Simulated transient session read error');
          }
          return recovered;
        },
        refreshInterval: Duration.zero,
      ),
    );

    try {
      expect(await iterator.moveNext(), isTrue);
      final failure = iterator.current;
      expect(failure.objective.state, EnvironmentRunState.unavailable);
      expect(failure.objective.isDemo, isFalse);
      expect(failure.stale, isTrue);
      expect(failure.source, 'NO RUNTIME');
      expect(failure.objective.blocker, contains('Retrying automatically'));

      expect(await iterator.moveNext(), isTrue);
      final success = iterator.current;
      expect(success, same(recovered));
      expect(success.source, 'ARK • READ ONLY');
      expect(attempts, 2);
    } finally {
      await iterator.cancel();
    }
  });
}
