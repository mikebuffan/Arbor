import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/attention_banner.dart';
import 'package:frontend/environment/attention_status.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:frontend/environment/objective_strip.dart';

void main() {
  const authorizedBlocker = EnvironmentObjectiveView(
    title: 'Research',
    state: EnvironmentRunState.blocked,
    blocker: 'Approval required before enabling an external worker.',
    requiresUserAction: true,
  );

  test('explicit fresh blocker is a request for a decision', () {
    final result = attentionForObjective(
      objective: authorizedBlocker,
      runtimeStale: false,
    );
    expect(result.level, AttentionLevel.needsYou);
    expect(result.explanation, contains('Approval required'));
  });

  test('generic blocked objective never demands user action', () {
    const objective = EnvironmentObjectiveView(
      title: 'Research',
      state: EnvironmentRunState.blocked,
      blocker: 'Document parser not installed',
    );
    final result = attentionForObjective(
      objective: objective,
      runtimeStale: false,
    );
    expect(result.level, AttentionLevel.systemBlocked);
    expect(result.headline, contains('no request for you'));
  });

  test('stale snapshot cannot request action despite old blocker', () {
    final result = attentionForObjective(
      objective: authorizedBlocker,
      runtimeStale: true,
    );
    expect(result.level, AttentionLevel.unknown);
    expect(result.headline, contains('not verified'));
  });

  test('demo snapshot cannot request action despite fixture blocker', () {
    final result = attentionForObjective(
      objective: const EnvironmentObjectiveView(
        title: 'Demo',
        state: EnvironmentRunState.blocked,
        blocker: 'Approval required',
        requiresUserAction: true,
        isDemo: true,
      ),
      runtimeStale: false,
    );
    expect(result.level, AttentionLevel.unknown);
    expect(result.headline, 'Demo only');
  });

  test('working snapshot reports no request, not guaranteed autonomy', () {
    final result = attentionForObjective(
      objective: const EnvironmentObjectiveView(
        title: 'Research',
        state: EnvironmentRunState.working,
        nextAction: 'Inspect next source',
      ),
      runtimeStale: false,
    );
    expect(result.level, AttentionLevel.noRequestRecorded);
    expect(result.explanation, contains('latest reported'));
  });

  test('unavailable and evidence-free completion cannot imply action status', () {
    for (final objective in [
      const EnvironmentObjectiveView(
        title: 'No runtime',
        state: EnvironmentRunState.unavailable,
      ),
      const EnvironmentObjectiveView(
        title: 'No proof',
        state: EnvironmentRunState.complete,
      ),
    ]) {
      expect(
        attentionForObjective(objective: objective, runtimeStale: false).level,
        AttentionLevel.unknown,
      );
    }
  });

  testWidgets('a verified decision blocker is visible on the operator surface',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: AttentionBanner(
          objective: authorizedBlocker,
          runtimeStale: false,
        ),
      ),
    ));
    expect(find.text('NEEDS YOU'), findsOneWidget);
    expect(find.text('Your decision is needed'), findsOneWidget);
    expect(find.textContaining('Approval required'), findsOneWidget);
  });


  testWidgets('persistent strip reports NEEDS YOU only for fresh data',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: ObjectiveStrip(
          objective: authorizedBlocker,
          runtimeStale: false,
        ),
      ),
    ));
    expect(find.text('NEEDS YOU'), findsOneWidget);
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: ObjectiveStrip(
          objective: authorizedBlocker,
          runtimeStale: true,
        ),
      ),
    ));
    expect(find.text('NEEDS YOU'), findsNothing);
    expect(find.text('BLOCKED'), findsOneWidget);
  });

  testWidgets('stale decision blocker is NOT a live user request',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: AttentionBanner(
          objective: authorizedBlocker,
          runtimeStale: true,
        ),
      ),
    ));
    expect(find.text('NEEDS YOU'), findsNothing);
    expect(find.text('UNVERIFIED'), findsOneWidget);
  });
}
