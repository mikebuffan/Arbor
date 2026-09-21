import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_world_state.dart';

void main() {
  final t0 = DateTime.utc(2026, 9, 21, 10);

  test('new house has Moss resting but NO invented activity', () {
    final world = GroveWorldState.initial(t0);
    expect(world.revision, 0);
    expect(world.events, isEmpty);
    expect(world.visitorZone, GroveZone.observatory);
    expect(world.mossZone, GroveZone.sofa);
    expect(world.mossResting, isTrue);
  });

  test('visitor interaction persists through roundtrip with exact provenance',
      () {
    final world = GroveWorldState.initial(t0)
        .apply(GroveWorldAction.moveMoss,
            zone: GroveZone.rug, at: t0.add(const Duration(minutes: 1)))
        .apply(GroveWorldAction.wakeMoss,
            zone: GroveZone.rug, at: t0.add(const Duration(minutes: 2)));
    final restored = GroveWorldState.fromJson(jsonDecode(jsonEncode(
        world.toJson())));
    expect(restored.revision, 2);
    expect(restored.mossZone, GroveZone.rug);
    expect(restored.mossResting, isFalse);
    expect(restored.events.map((e) => e.actor), everyElement('visitor'));
    expect(restored.events.last.action, GroveWorldAction.wakeMoss);
    expect(restored.events.last.atUtc, t0.add(const Duration(minutes: 2)));
  });

  test('reopening world or advancing wall clock creates no activity', () {
    final saved = GroveWorldState.initial(t0).apply(
        GroveWorldAction.enterRoom,
        zone: GroveZone.library,
        at: t0.add(const Duration(minutes: 4)));
    final restored = GroveWorldState.fromJson(jsonDecode(jsonEncode(
        saved.toJson())));
    expect(restored.revision, 1);
    expect(restored.events, hasLength(1));
    expect(restored.visitorZone, GroveZone.library);
  });

  test('history bounded while revision remains monotonic', () {
    var state = GroveWorldState.initial(t0);
    for (var index = 0; index < 80; index++) {
      state = state.apply(GroveWorldAction.moveMoss,
          zone: index.isEven ? GroveZone.rug : GroveZone.sofa,
          at: t0.add(Duration(minutes: index + 1)));
    }
    expect(state.revision, 80);
    expect(state.events, hasLength(GroveWorldState.maxEvents));
    expect(state.events.first.revision, 49);
    expect(state.events.last.revision, 80);
    expect(() => state.events.clear(), throwsUnsupportedError);
  });

  test('invalid visitor/Moss zones and unknown schema fail closed', () {
    final state = GroveWorldState.initial(t0);
    expect(() => state.apply(GroveWorldAction.enterRoom,
        zone: GroveZone.sofa, at: t0), throwsArgumentError);
    expect(() => state.apply(GroveWorldAction.moveMoss,
        zone: GroveZone.kitchen, at: t0), throwsArgumentError);
    final serialized = state.toJson();
    expect(() => GroveWorldState.fromJson(
        {...serialized, 'schemaVersion': 999}), throwsFormatException);
    expect(() => GroveWorldState.fromJson(
        {...serialized, 'visitorZone': 'the_moon'}), throwsFormatException);
    expect(() => GroveWorldState.fromJson(
        {...serialized, 'mossZone': 'workshop'}), throwsFormatException);
  });
}
