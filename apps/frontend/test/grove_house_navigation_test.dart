import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/arbor_environment_shell.dart';
import 'package:frontend/environment/grove_house_room.dart';
import 'package:frontend/environment/annabelle_kitchen_view.dart';

void main() {
  testWidgets('narrow phone Grove pins provide readable touch targets',
      (tester) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: GroveHouseRoom(onOpen: (_) {}),
        ),
      ),
    ));
    await tester.pump();

    for (final label in [
      'The staircase',
      'Moss on the couch',
      'Talk to Arbor',
      'The Living Window',
    ]) {
      final pin = find.byTooltip(label);
      expect(pin, findsOneWidget, reason: label);
      final target = find.descendant(
        of: pin, matching: find.byType(InkWell));
      expect(target, findsOneWidget, reason: label);
      final size = tester.getSize(target);
      expect(size.width, greaterThanOrEqualTo(44), reason: label);
      expect(size.height, greaterThanOrEqualTo(44), reason: label);
    }
  });

  testWidgets('Grove kitchen door opens a distinct shared-clock room',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / ANNABELLE’S KITCHEN'), findsOneWidget);
    expect(find.textContaining('Same house clock'), findsOneWidget);
    expect(find.textContaining('writing/voice-mode switch is not yet wired'),
        findsOneWidget);
    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
  });

  testWidgets('Grove guest-room door opens the visitor room and returns home',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 150));
    await tester.ensureVisible(
        find.widgetWithText(OutlinedButton, 'Guest Room'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Guest Room'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / GUEST ROOM'), findsOneWidget);
    expect(find.textContaining('A room for the person who comes to visit'),
        findsOneWidget);
    expect(find.textContaining('saves no note, memory, task, location'),
        findsOneWidget);
    await tester.tap(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
  });

  testWidgets('Grove window door opens live temporal controls',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 150));
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Window'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Window'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE LIVING WINDOW'), findsWidgets);
    expect(find.text('Preview another time'), findsWidgets);
  });

  testWidgets('Grove stairs open the Observatory and return home',
      (tester) async {
    await tester.pumpWidget(
        const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 150));
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Stairs'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Stairs'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / OBSERVATORY'), findsOneWidget);
    expect(find.textContaining('Illustrative sky card, not a live camera'),
        findsOneWidget);
    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE • HOME'), findsOneWidget);
  });

  testWidgets('Grove shelves tap requests the existing Library destination',
      (tester) async {
    GroveRoomAction? opened;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: GroveHouseRoom(onOpen: (action) => opened = action),
        ),
      ),
    ));
    await tester.pump();
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Shelves'));
    await tester.pump(const Duration(milliseconds: 150));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Shelves'));
    expect(opened, GroveRoomAction.shelves);
    // Scoped saved-memory and unopened-attachment truth are covered by their
    // dedicated injected-loader widget tests; do not bootstrap real Supabase
    // or perform a private network read in this room-navigation test.
  });

  testWidgets('Kitchen scratchpad does not survive leaving the room',
      (tester) async {
    await tester.pumpWidget(
        const MaterialApp(home: ArborEnvironmentShell()));
    await tester.pump(const Duration(milliseconds: 150));
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / ANNABELLE’S KITCHEN'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'unsaved scene note');
    await tester.pump();
    expect(find.text('unsaved scene note'), findsOneWidget);
    // Settle the test keyboard/focus before tearing down the editable route.
    // This is visit-only persistence coverage, not a keyboard-focus regression.
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();
    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Back to the Grove'));
    // The real Grove house clock keeps ticking: pumpAndSettle would wait
    // forever for the clock, even when the confirmation dialog is correct.
    await tester.pump(const Duration(milliseconds: 300));
    // Deliberate confirmation, never a silent note loss.
    expect(find.text('Leave Annabelle’s kitchen?'), findsOneWidget);
    expect(find.text('unsaved scene note'), findsOneWidget);
    await tester.tap(find.text('Leave without saving'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('THE GROVE / ANNABELLE’S KITCHEN'), findsOneWidget);
    expect(find.text('unsaved scene note'), findsNothing);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty);
  });

  testWidgets('Kitchen exposes one explicit discard decision to the shell',
      (tester) async {
    final kitchenKey = GlobalKey<AnnabelleKitchenViewState>();
    var homeCalls = 0;
    var talkCalls = 0;
    await tester.pumpWidget(MaterialApp(home: Scaffold(
      body: SingleChildScrollView(child: AnnabelleKitchenView(
        key: kitchenKey,
        onReturnHome: () => homeCalls++,
        onOpenConversation: () => talkCalls++,
      )),
    )));
    await tester.enterText(find.byType(TextField), 'Unsaved kitchen scene.');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();

    final keep = kitchenKey.currentState!.confirmNavigationAway();
    await tester.pump();
    expect(find.text('Leave Annabelle’s kitchen?'), findsOneWidget);
    await tester.tap(find.text('Keep writing'));
    await tester.pump();
    expect(await keep, isFalse);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Unsaved kitchen scene.');

    final discard = kitchenKey.currentState!.confirmNavigationAway();
    await tester.pump();
    expect(find.text('Leave Annabelle’s kitchen?'), findsOneWidget);
    await tester.tap(find.text('Leave without saving'));
    await tester.pump();
    expect(await discard, isTrue);
    // The Kitchen returns an answer; only the shell actually navigates.
    expect(homeCalls, 0);
    expect(talkCalls, 0);
  });

  testWidgets('Empty Kitchen scratchpad permits ordinary navigation',
      (tester) async {
    var homeCalls = 0;
    await tester.pumpWidget(MaterialApp(home: Scaffold(
      body: SingleChildScrollView(child: AnnabelleKitchenView(
        onReturnHome: () => homeCalls++,
        onOpenConversation: () {},
      )),
    )));
    await tester.ensureVisible(find.text('Back to the Grove'));
    await tester.tap(find.text('Back to the Grove'));
    await tester.pump();
    expect(find.text('Leave Annabelle’s kitchen?'), findsNothing);
    expect(homeCalls, 1);
  });

  testWidgets('320px Grove painting pins each activate their own room action',
      (tester) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final taps = <GroveRoomAction>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: GroveHouseRoom(onOpen: taps.add),
        ),
      ),
    ));
    await tester.pump();

    const expected = <String, GroveRoomAction>{
      'Annabelle’s Kitchen': GroveRoomAction.kitchen,
      'The staircase': GroveRoomAction.stairs,
      'The shelves and memory': GroveRoomAction.shelves,
      'Moss on the couch': GroveRoomAction.moss,
      'The Living Window': GroveRoomAction.window,
      'Talk to Arbor': GroveRoomAction.arbor,
      'The desk and projects': GroveRoomAction.desk,
    };
    for (final entry in expected.entries) {
      await tester.tap(find.byTooltip(entry.key));
      await tester.pump();
      expect(taps.last, entry.value, reason: entry.key);
    }
  });

  testWidgets('large phone text still permits accessible Kitchen door tap',
      (tester) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    GroveRoomAction? opened;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.8)),
          child: SingleChildScrollView(
            child: GroveHouseRoom(onOpen: (action) => opened = action),
          ),
        ),
      ),
    ));
    await tester.pump();
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Kitchen'));
    await tester.pump();
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kitchen'));
    expect(opened, GroveRoomAction.kitchen);
    expect(tester.takeException(), isNull);
  });

}
