import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/api/arbor_session.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/environment_adapter.dart';
import 'package:frontend/environment/environment_runtime_host.dart';
import 'package:frontend/environment/environment_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _PushAdapter implements EnvironmentRuntimeAdapter {
  final StreamController<EnvironmentSnapshot> controller =
      StreamController<EnvironmentSnapshot>.broadcast(sync: true);

  @override
  Future<EnvironmentSnapshot> snapshot() =>
      throw UnimplementedError('Only watch() is used by this test.');

  @override
  Stream<EnvironmentSnapshot> watch() => controller.stream;

  void emit(String title) => controller.add(EnvironmentSnapshot(
        objective: EnvironmentObjectiveView(
          title: title,
          state: EnvironmentRunState.idle,
        ),
        workItems: const [],
        source: 'ARK · READ ONLY',
        capturedAt: DateTime.utc(2026, 9, 21),
      ));
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('project change immediately clears previous ARK runtime state',
      (tester) async {
    tester.view.physicalSize = const Size(390, 840);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final adapter = _PushAdapter();
    addTearDown(adapter.controller.close);
    await tester.pumpWidget(MaterialApp(
      home: EnvironmentRuntimeHost(
        adapter: adapter,
        initialDestination: EnvironmentDestination.objective,
      ),
    ));

    adapter.emit('Project A objective');
    await tester.pump();
    expect(find.text('Project A objective'), findsWidgets);

    await ArborSession.instance.adopt(
      userId: 'runtime-scope-test',
      projectId: 'project-b',
      conversationId: 'conversation-b',
    );
    await tester.pump();
    expect(find.text('Project A objective'), findsNothing);
    expect(find.text('Reading ARK state…'), findsWidgets);

    adapter.emit('Project B objective');
    await tester.pump();
    expect(find.text('Project B objective'), findsWidgets);
    expect(find.text('Project A objective'), findsNothing);
  });

  testWidgets('adapter replacement clears previous snapshot before next read',
      (tester) async {
    final oldAdapter = _PushAdapter();
    final nextAdapter = _PushAdapter();
    addTearDown(oldAdapter.controller.close);
    addTearDown(nextAdapter.controller.close);

    await tester.pumpWidget(MaterialApp(
      home: EnvironmentRuntimeHost(
        adapter: oldAdapter,
        initialDestination: EnvironmentDestination.objective,
      ),
    ));
    oldAdapter.emit('Previous adapter objective');
    await tester.pump();
    expect(find.text('Previous adapter objective'), findsWidgets);

    await tester.pumpWidget(MaterialApp(
      home: EnvironmentRuntimeHost(
        adapter: nextAdapter,
        initialDestination: EnvironmentDestination.objective,
      ),
    ));
    expect(find.text('Previous adapter objective'), findsNothing);
    expect(find.text('Reading ARK state…'), findsWidgets);

    oldAdapter.emit('Late stale snapshot');
    await tester.pump();
    expect(find.text('Late stale snapshot'), findsNothing);

    nextAdapter.emit('Fresh objective');
    await tester.pump();
    expect(find.text('Fresh objective'), findsWidgets);
  });
}
