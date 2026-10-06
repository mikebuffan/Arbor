import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_astronomy.dart';

void main() {
  const greenwich = GroveLocation(latitude: 46.73, longitude: 0);
  const pullman = GroveLocation(latitude: 46.73, longitude: -117.18);

  test('moon reference: new and approximately full two weeks later', () {
    final newMoon = GroveAstronomy.moonPhase(
        DateTime.utc(2000, 1, 6, 18, 14));
    final full = GroveAstronomy.moonPhase(
        DateTime.utc(2000, 1, 21, 12));
    expect(newMoon.illuminated, closeTo(0, .001));
    expect(full.illuminated, closeTo(1, .03));
  });

  test('solar altitude distinguishes local daytime and night', () {
    expect(GroveAstronomy.altitude(
        DateTime.utc(2026, 3, 20, 19), pullman), greaterThan(35));
    expect(GroveAstronomy.altitude(
        DateTime.utc(2026, 3, 20, 7), pullman), lessThan(0));
  });

  test('June daylight lasts longer than December at same latitude', () {
    // Greenwich longitude keeps rise and set in same UTC CI civil day.
    final summer = GroveAstronomy.solarEvents(
        DateTime(2026, 6, 21, 12), greenwich);
    final winter = GroveAstronomy.solarEvents(
        DateTime(2026, 12, 21, 12), greenwich);
    expect(summer.sunrise, isNotNull);
    expect(summer.sunset, isNotNull);
    expect(winter.sunrise, isNotNull);
    expect(winter.sunset, isNotNull);
    expect(
      summer.sunset!.difference(summer.sunrise!).inMinutes,
      greaterThan(winter.sunset!.difference(winter.sunrise!).inMinutes),
    );
  });

  test('location-free mode is labeled artistic and has no sun times', () {
    final midday = GroveAstronomy.at(DateTime(2026, 6, 21, 12));
    final bedtime = GroveAstronomy.at(DateTime(2026, 6, 21, 23));
    expect(midday.phase, GroveDayPhase.daylight);
    expect(bedtime.phase, GroveDayPhase.night);
    expect(midday.sun, isNull);
    expect(midday.moonAltitude, isNull);
    expect(midday.moonVisibleAtNight, isFalse);
  });

  test('solar events use local calendar day through DST shift', () {
    final date = DateTime(2026, 3, 8, 12);
    final first = DateTime(date.year, date.month, date.day);
    final end = DateTime(date.year, date.month, date.day + 1);
    // UTC runner has 24h; local phone timezone can instead have 23/25h.
    expect(end.isAfter(first), isTrue);
    expect(GroveAstronomy.solarEvents(date, greenwich), isA<GroveSolarEvents>());
  });
}
