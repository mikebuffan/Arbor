import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/environment_adapter.dart';
import 'package:frontend/environment/environment_state.dart';

class _ActivityReader implements ArkStatusReader {
  const _ActivityReader(this.events);
  final List<Map<String, dynamic>> events;

  @override
  Future<Map<String, dynamic>?> read(String projectId) async => {
    'available':true,
    'capturedAt':'2026-09-21T15:00:00Z',
    'objectives':[{
      'id':'objective-1',
      'goal':'Source investigation',
      'status':'running',
    }],
    'tasks':[{
      'objective_id':'objective-1',
      'task_key':'fetch',
      'description':'Read original evidence',
      'status':'running',
    }],
    'checkpoints':[],
    'events':events,
  };
}

void main() {
  test('real ARK activity is scoped, timestamped, and cannot be fabricated', () async {
    final snapshot=await ArkEnvironmentAdapter(
      reader:const _ActivityReader([
        {
          'id':'event-1','objective_id':'objective-1',
          'event_type':'task_claimed',
          'created_at':'2026-09-21T14:00:00Z',
        },
        {
          'id':'event-other','objective_id':'objective-2',
          'event_type':'completed',
          'created_at':'2026-09-21T14:05:00Z',
        },
        {
          'id':'no-time','objective_id':'objective-1',
          'event_type':'completed',
        },
      ]),
      projectId:'project-1',
    ).snapshot();
    expect(snapshot.activityEvents,hasLength(1));
    final event=snapshot.activityEvents.single;
    expect(event.title,'ARK event: task_claimed');
    expect(event.detail,contains('2026-09-21T14:00:00.000Z'));
    expect(event.detail,contains('event-1'));
    expect(event.isDemo,isFalse);
    expect(event.title, isNot(contains('completed')));
  });

  test('no source events means no claim of recorded activity', () async {
    final snapshot=await ArkEnvironmentAdapter(
      reader:const _ActivityReader([]),projectId:'project-1',
    ).snapshot();
    expect(snapshot.activityEvents,isEmpty);
  });

  testWidgets('Home shows a recorded event, not environment branch claims', (tester) async {
    tester.view.physicalSize=const Size(1500,1000);
    tester.view.devicePixelRatio=1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final snapshot=await ArkEnvironmentAdapter(
      reader:const _ActivityReader([{
        'id':'event-1','objective_id':'objective-1',
        'event_type':'task_claimed',
        'created_at':'2026-09-21T14:00:00Z',
      }]),projectId:'project-1',
    ).snapshot();
    await tester.pumpWidget(MaterialApp(
      home:ArborEnvironmentShell(
        initialDestination:EnvironmentDestination.home,
        objective:snapshot.objective,
        activityEvents:snapshot.activityEvents,
        runtimeSource:snapshot.source,
        runtimeStale:snapshot.stale,
      ),
    ));
    expect(find.text('ARK event: task_claimed'),findsOneWidget);
    expect(find.textContaining('Environment branch isolated'),findsNothing);
    expect(find.textContaining('No production mutation.'),findsNothing);
  });

  testWidgets('Home explicitly says when no ARK activity was recorded', (tester) async {
    tester.view.physicalSize=const Size(1500,1000);
    tester.view.devicePixelRatio=1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(
      home:ArborEnvironmentShell(
        objective:EnvironmentObjectiveView(
          title:'Unfinished work',
          state:EnvironmentRunState.idle,
        ),
        runtimeSource:'ARK • READ ONLY',
        initialDestination:EnvironmentDestination.home,
      ),
    ));
    expect(find.text('No recorded ARK events for the displayed objective.'),
      findsOneWidget);
  });
}
