import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_house_clock.dart';
import 'package:frontend/environment/grove_astronomy.dart';

void main() {
  test('one house clock notifies every room on the same minute', () {
    var now = DateTime(2026, 9, 20, 16, 23, 0);
    final house = GroveHouseClock(now: () => now, autoStart: false);
    addTearDown(house.dispose);
    final roomReadings = <DateTime>[];
    void kitchenListener() => roomReadings.add(house.localNow);
    void groveListener() => roomReadings.add(house.localNow);
    house.addListener(groveListener);
    house.addListener(kitchenListener);
    now = DateTime(2026, 9, 20, 16, 23, 30);
    house.refresh();
    expect(roomReadings, isEmpty);
    now = DateTime(2026, 9, 20, 16, 24);
    house.refresh();
    expect(roomReadings, hasLength(2));
    expect(roomReadings[0], roomReadings[1]);
    expect(house.localNow.minute, 24);
  });

  test('foreground refresh reconciles a jumped clock', () {
    var now = DateTime(2026, 9, 20, 20, 0);
    final house = GroveHouseClock(now: () => now, autoStart: false);
    addTearDown(house.dispose);
    var count = 0;
    house.addListener(() => count++);
    now = DateTime(2026, 9, 21, 6, 15);
    house.refresh(force: true);
    expect(house.localNow.day, 21);
    expect(house.localNow.hour, 6);
    expect(count, 1);
  });

  test('approximate location is shared and can be cleared', () {
    final house = GroveHouseClock(autoStart: false);
    addTearDown(house.dispose);
    expect(house.location, isNull);
    expect(house.sky.sun, isNull);
    house.setLocation(const GroveLocation(
        latitude: 46.73, longitude: -117.18));
    expect(house.location, isNotNull);
    expect(house.sky.sun, isNotNull);
    house.setLocation(null);
    expect(house.sky.sun, isNull);
  });

  test('preview time does not change house time', () {
    final house = GroveHouseClock(
        now: () => DateTime(2026, 9, 20, 21), autoStart: false);
    addTearDown(house.dispose);
    final real = house.localNow;
    final visualPreview = DateTime(real.year, real.month, real.day, 6);
    expect(visualPreview.hour, 6);
    expect(house.localNow, real);
    expect(house.localNow.hour, 21);
  });
}
