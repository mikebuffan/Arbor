import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_world_state.dart';
import 'package:frontend/environment/grove_world_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  final fixed = DateTime.utc(2026, 9, 21, 12);
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('fresh local house persists between store instances', () async {
    final first = GroveWorldStore();
    final initial = await first.load(now: () => fixed);
    expect(initial.status, GroveWorldLoadStatus.newHouse);
    final next = initial.state!.apply(GroveWorldAction.moveMoss,
        zone: GroveZone.rug, at: fixed);
    await first.save(next, fromRevision: 0);

    final reopened = await GroveWorldStore().load(
        now: () => fixed.add(const Duration(days: 1)));
    expect(reopened.status, GroveWorldLoadStatus.restored);
    expect(reopened.state!.mossZone, GroveZone.rug);
    expect(reopened.state!.revision, 1);
    expect(reopened.state!.events, hasLength(1));
  });

  test('stale revision cannot overwrite recent local state', () async {
    final store = GroveWorldStore();
    final initial = (await store.load(now: () => fixed)).state!;
    await store.save(initial.apply(GroveWorldAction.wakeMoss,
        zone: GroveZone.sofa, at: fixed), fromRevision: 0);
    await expectLater(store.save(initial.apply(
        GroveWorldAction.moveMoss,
        zone: GroveZone.rug, at: fixed), fromRevision: 0),
        throwsStateError);
    expect((await store.load()).state!.mossZone, GroveZone.sofa);
  });

  test('unknown future version is preserved until explicit reset', () async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode({'schemaVersion': 99, 'room': 'unknown'});
    await prefs.setString(GroveWorldStore.storageKey, raw);
    final store = GroveWorldStore(preferences: prefs);
    final loaded = await store.load();
    expect(loaded.status, GroveWorldLoadStatus.incompatible);
    expect(loaded.state, isNull);
    final next = GroveWorldState.initial(fixed).apply(
        GroveWorldAction.wakeMoss, zone: GroveZone.sofa, at: fixed);
    await expectLater(store.save(next, fromRevision: 0),
        throwsStateError);
    expect(prefs.getString(GroveWorldStore.storageKey), raw);
    await store.reset();
    expect((await store.load(now: () => fixed)).status,
        GroveWorldLoadStatus.newHouse);
  });

  test('bad JSON is preserved instead of silently discarded', () async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(GroveWorldStore.storageKey, '{oops');
    final loaded = await GroveWorldStore(preferences: prefs).load();
    expect(loaded.status, GroveWorldLoadStatus.damaged);
    expect(prefs.getString(GroveWorldStore.storageKey), '{oops');
  });
}
