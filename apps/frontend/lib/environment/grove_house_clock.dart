import 'dart:async';

import 'package:flutter/widgets.dart';

import 'grove_astronomy.dart';

/// One temporal context for The Grove and every future room.
///
/// The window *displays* this clock; it does not own or alter it. UI time
/// preview must not modify the shared clock. Backend event timestamps remain
/// authoritative for ARK/history; this is device-local presentation time.
///
/// The singleton is intentionally location-free until a user selects a broad
/// nearby place. No GPS permission, network request, or location persistence.
class GroveHouseClock extends ChangeNotifier with WidgetsBindingObserver {
  GroveHouseClock({
    DateTime Function()? now,
    bool autoStart = true,
  }) : _now = now ?? DateTime.now {
    _localNow = _now().toLocal();
    if (autoStart) {
      WidgetsBinding.instance.addObserver(this);
      _timer = Timer.periodic(
        const Duration(seconds: 15),
        (_) => refresh(),
      );
    }
  }

  static final GroveHouseClock shared = GroveHouseClock();

  final DateTime Function() _now;
  Timer? _timer;
  late DateTime _localNow;
  GroveLocation? _location;

  DateTime get localNow => _localNow;
  GroveLocation? get location => _location;
  GroveSkySnapshot get sky =>
      GroveAstronomy.at(_localNow, location: _location);

  /// Reconcile after clock/timezone changes or returning to the foreground.
  /// Notify when calendar day, minute, or UTC offset changes.
  void refresh({bool force = false}) {
    final next = _now().toLocal();
    final previous = _localNow;
    final changed = next.year != previous.year ||
        next.month != previous.month ||
        next.day != previous.day ||
        next.hour != previous.hour ||
        next.minute != previous.minute ||
        next.timeZoneOffset != previous.timeZoneOffset ||
        next.timeZoneName != previous.timeZoneName;
    _localNow = next;
    if (changed || force) notifyListeners();
  }

  void setLocation(GroveLocation? value) {
    if (_location?.latitude == value?.latitude &&
        _location?.longitude == value?.longitude) {
      return;
    }
    _location = value;
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) refresh(force: true);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _timer = null;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
