import 'dart:math' as math;

/// Astronomy estimates for The Grove's Living Window.
///
/// Uses device-local DateTime for display and the local civil day (so DST is
/// honored). Coordinates are only an optional approximate latitude/longitude;
/// no precise tracking, server request, or account storage is required.
/// Solar threshold -0.833° includes approximate refraction + solar disk.
class GroveLocation {
  const GroveLocation({required this.latitude, required this.longitude});
  final double latitude;
  final double longitude;
}

enum GroveDayPhase { daylight, golden, twilight, night }

class GroveMoon {
  const GroveMoon(this.cycle, this.illuminated, this.name, this.waxing);
  final double cycle; // 0 new, ~0.5 full, 1 next new
  final double illuminated;
  final String name;
  final bool waxing;
}

class GroveSolarEvents {
  const GroveSolarEvents({this.sunrise, this.sunset, this.polar});
  final DateTime? sunrise, sunset;
  final String? polar;
}

class GroveSkySnapshot {
  const GroveSkySnapshot({
    required this.phase,
    required this.morning,
    required this.moon,
    required this.solarAltitude,
    required this.moonVisibleAtNight,
    this.moonAltitude,
    this.sun,
  });
  final GroveDayPhase phase;
  final bool morning;
  final GroveMoon moon;
  final double solarAltitude;
  final double? moonAltitude;
  final bool moonVisibleAtNight;
  final GroveSolarEvents? sun;
}

abstract final class GroveAstronomy {
  static const _rad = math.pi / 180;
  static const _dayMs = 86400000;
  static const _synodic = 29.530588853;
  static final _newMoonUtc =
      DateTime.utc(2000, 1, 6, 18, 14).millisecondsSinceEpoch;
  static const _obliquity = 23.4397 * _rad;

  static double _days(DateTime when) =>
      when.millisecondsSinceEpoch / _dayMs - 10957.5;

  static GroveMoon moonPhase(DateTime when) {
    final raw = (when.millisecondsSinceEpoch - _newMoonUtc) /
        _dayMs / _synodic;
    final phase = (raw % 1 + 1) % 1;
    final lit = (1 - math.cos(2 * math.pi * phase)) / 2;
    final name = phase < .035 || phase > .965
        ? 'New moon'
        : phase < .215
            ? 'Waxing crescent'
            : phase < .285
                ? 'First quarter'
                : phase < .465
                    ? 'Waxing gibbous'
                    : phase < .535
                        ? 'Full moon'
                        : phase < .715
                            ? 'Waning gibbous'
                            : phase < .785
                                ? 'Last quarter'
                                : 'Waning crescent';
    return GroveMoon(phase, lit, name, phase < .5);
  }

  static (double, double) _coordinates(DateTime when, bool moon) {
    final d = _days(when);
    late double l, b;
    if (!moon) {
      final m = _rad * (357.5291 + .98560028 * d);
      final c = _rad * (1.9148 * math.sin(m) +
          .02 * math.sin(2 * m) + .0003 * math.sin(3 * m));
      l = m + c + _rad * 102.9372 + math.pi;
      b = 0;
    } else {
      final ll = _rad * (218.316 + 13.176396 * d);
      final m = _rad * (134.963 + 13.064993 * d);
      final f = _rad * (93.272 + 13.229350 * d);
      l = ll + _rad * 6.289 * math.sin(m);
      b = _rad * 5.128 * math.sin(f);
    }
    final ra = math.atan2(
        math.sin(l) * math.cos(_obliquity) -
            math.tan(b) * math.sin(_obliquity),
        math.cos(l));
    final dec = math.asin(math.sin(b) * math.cos(_obliquity) +
        math.cos(b) * math.sin(_obliquity) * math.sin(l));
    return (ra, dec);
  }

  static double altitude(
      DateTime when, GroveLocation location, {bool moon = false}) {
    final (ra, dec) = _coordinates(when, moon);
    final phi = location.latitude * _rad;
    final lw = -location.longitude * _rad;
    final hourAngle =
        _rad * (280.16 + 360.9856235 * _days(when)) - lw - ra;
    return math.asin(math.sin(phi) * math.sin(dec) +
            math.cos(phi) * math.cos(dec) * math.cos(hourAngle)) /
        _rad;
  }

  /// Scans the device-local civil day, interpolating at solar horizon
  /// crossings. Handles DST-shortened/lengthened days and polar conditions.
  static GroveSolarEvents solarEvents(
      DateTime when, GroveLocation location) {
    final start = DateTime(when.year, when.month, when.day);
    final end = DateTime(when.year, when.month, when.day + 1);
    final endMs = end.millisecondsSinceEpoch;
    var previousMs = start.millisecondsSinceEpoch;
    var previous = altitude(start, location) + .833;
    DateTime? sunrise, sunset;
    for (var nextMs = previousMs + 600000;
        previousMs < endMs;
        nextMs += 600000) {
      final ms = math.min(nextMs, endMs);
      final current = altitude(
          DateTime.fromMillisecondsSinceEpoch(ms), location) + .833;
      if ((previous <= 0 && current > 0) ||
          (previous >= 0 && current < 0)) {
        final fraction = previous / (previous - current);
        final moment = DateTime.fromMillisecondsSinceEpoch(
          (previousMs + (ms - previousMs) * fraction).round());
        if (previous <= 0 && current > 0) sunrise ??= moment;
        if (previous >= 0 && current < 0) sunset ??= moment;
      }
      previous = current;
      previousMs = ms;
    }
    return GroveSolarEvents(
      sunrise: sunrise,
      sunset: sunset,
      polar: sunrise == null && sunset == null
          ? previous > 0 ? 'Midnight sun' : 'Polar night'
          : null,
    );
  }

  static GroveSkySnapshot at(
      DateTime when, {GroveLocation? location}) {
    final hour = when.hour + when.minute / 60;
    final solar = location == null
        ? math.cos(2 * math.pi * (hour - 12) / 24) * 90
        : altitude(when, location);
    final GroveDayPhase stage;
    if (location == null) {
      stage = hour >= 8 && hour < 17
          ? GroveDayPhase.daylight
          : (hour >= 6 && hour < 8) || (hour >= 17 && hour < 19)
              ? GroveDayPhase.golden
              : (hour >= 5 && hour < 6) || (hour >= 19 && hour < 20)
                  ? GroveDayPhase.twilight
                  : GroveDayPhase.night;
    } else {
      stage = solar >= 12 ? GroveDayPhase.daylight
          : solar >= 0 ? GroveDayPhase.golden
          : solar >= -6 ? GroveDayPhase.twilight
          : GroveDayPhase.night;
    }
    final moonAlt = location == null
        ? null
        : altitude(when, location, moon: true);
    final earlier = location == null
        ? hour < 12
        : altitude(when.subtract(const Duration(minutes: 30)),
            location) < solar;
    return GroveSkySnapshot(
      phase: stage,
      morning: earlier,
      moon: moonPhase(when),
      solarAltitude: solar,
      moonAltitude: moonAlt,
      moonVisibleAtNight:
          moonAlt != null && moonAlt > 0 && solar < 0,
      sun: location == null ? null : solarEvents(when, location),
    );
  }
}
