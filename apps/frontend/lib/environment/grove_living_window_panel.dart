import 'dart:async';
import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_astronomy.dart';
import 'grove_house_clock.dart';
import 'grove_window_time_selection.dart';

/// Native Flutter Living Window controls, backed by the same optional-location
/// model as the stand-alone reference-image proof of concept.
/// Never changes device time, reads or writes ARK, or requests precise GPS.
class GroveLivingWindowPanel extends StatefulWidget {
  const GroveLivingWindowPanel({super.key, this.clock, this.windowPreview});
  final DateTime Function()? clock;
  /// Injected only for tests/embedding; normal Grove rooms share one preview.
  final GroveWindowTimeSelection? windowPreview;

  @override
  State<GroveLivingWindowPanel> createState() => _GroveLivingWindowPanelState();
}

class _GroveLivingWindowPanelState extends State<GroveLivingWindowPanel> {
  static const _places = <String, GroveLocation>{
    'Pullman, WA (approx.)': GroveLocation(latitude: 46.73, longitude: -117.18),
    'Spokane, WA (approx.)': GroveLocation(latitude: 47.66, longitude: -117.43),
    'Seattle, WA (approx.)': GroveLocation(latitude: 47.61, longitude: -122.33),
  };
  Timer? _timer;
  GroveHouseClock? _houseClock;
  late final GroveWindowTimeSelection _windowPreview;
  String? _place;
  late DateTime _live;

  @override
  void initState() {
    super.initState();
    _windowPreview = widget.windowPreview ?? GroveWindowTimeSelection.shared;
    _windowPreview.addListener(_onWindowSelectionChanged);
    if (widget.clock != null) {
      // Allows deterministic widget tests without a shared running timer.
      _live = widget.clock!().toLocal();
      _timer = Timer.periodic(const Duration(minutes: 1), (_) {
        if (!mounted) return;
        setState(() => _live = widget.clock!().toLocal());
      });
    } else {
      _houseClock = GroveHouseClock.shared;
      _houseClock!.attach();
      _houseClock!.refresh();
      _live = _houseClock!.localNow;
      _place = _placeFor(_houseClock!.location);
      _houseClock!.addListener(_onHouseTimeChanged);
    }
  }

  void _onHouseTimeChanged() {
    if (!mounted) return;
    setState(() {
      _live = _houseClock!.localNow;
      _place = _placeFor(_houseClock!.location);
    });
  }

  void _onWindowSelectionChanged() {
    if (mounted) setState(() {});
  }

  static String? _placeFor(GroveLocation? location) {
    if (location == null) return null;
    for (final entry in _places.entries) {
      if (entry.value.latitude == location.latitude &&
          entry.value.longitude == location.longitude) return entry.key;
    }
    return null;
  }

  @override
  void dispose() {
    _timer?.cancel();
    _windowPreview.removeListener(_onWindowSelectionChanged);
    _houseClock?.removeListener(_onHouseTimeChanged);
    _houseClock?.detach();
    super.dispose();
  }

  DateTime get _shown => _windowPreview.displayedAt(_live);

  void _previewDay(int delta) {
    final time = _shown;
    // Change the *civil day*, not elapsed seconds across a DST boundary.
    _windowPreview.show(DateTime(time.year, time.month, time.day + delta,
        time.hour, time.minute));
  }

  void _previewMinute(int minutes) {
    final time = _shown;
    _windowPreview.show(DateTime(time.year, time.month, time.day,
        minutes ~/ 60, minutes % 60));
  }

  @override
  Widget build(BuildContext context) {
    final time = _shown;
    final preview = _windowPreview.isPreviewing;
    final sky =  GroveAstronomy.at(time, location: _places[_place]);
    final localTime = MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay.fromDateTime(time),
    );
    final date = MaterialLocalizations.of(context).formatMediumDate(time);
    final stage = switch (sky.phase) {
      GroveDayPhase.daylight => 'Daylight',
      GroveDayPhase.golden => sky.morning ? 'Morning light' : 'Golden hour',
      GroveDayPhase.twilight => sky.morning ? 'Predawn' : 'Dusk',
      GroveDayPhase.night => 'Night at The Grove',
    };
    return EnvironmentPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('THE LIVING WINDOW',
              style: TextStyle(color: ArborEnvironmentTokens.cyan,
                  fontSize: 11, letterSpacing: 1.4)),
          const SizedBox(height: 8),
          Text(localTime, style: const TextStyle(
              color: ArborEnvironmentTokens.textPrimary, fontSize: 28)),
          Text('$date • ${preview ? 'PREVIEW TIME · WINDOW ONLY' : 'LOCAL TIME · LIVE'}',
              style: const TextStyle(
                  color: ArborEnvironmentTokens.textMuted, fontSize: 12)),
          const SizedBox(height: 9),
          Text(stage, style: const TextStyle(
              color: ArborEnvironmentTokens.firefly, fontSize: 18)),
          const SizedBox(height: 6),
          Text('${sky.moon.name} • ${(sky.moon.illuminated * 100).round()}% lit',
              style: const TextStyle(color: ArborEnvironmentTokens.textPrimary)),
          if (sky.sun != null) Text(
            'Sunrise: ${_time(context, sky.sun!.sunrise)} · '
            'Sunset: ${_time(context, sky.sun!.sunset)}',
            style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
          if (sky.sun == null)
            const Text('Time-based art · select a nearby city for approximate sunrise and sunset.',
                style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
          if (sky.moonAltitude != null)
            Text(sky.moonVisibleAtNight
                ? 'Moon is estimated above the horizon at night.'
                : 'Moon is not in the nighttime window.',
                style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
          const SizedBox(height: 8),
          DropdownButton<String?>(
            value: _place,
            isExpanded: true,
            dropdownColor: ArborEnvironmentTokens.midnight,
            items: [
              const DropdownMenuItem<String?>(
                  value: null, child: Text('Time only · no location')),
              ..._places.keys.map((label) => DropdownMenuItem<String?>(
                  value: label, child: Text(label))),
            ],
            onChanged: (value) {
              _houseClock?.setLocation(_places[value]);
              setState(() => _place = value);
            },
          ),
          Wrap(spacing: 9, runSpacing: 5, children: [
            TextButton(
              onPressed: preview ? null : () => _windowPreview.show(_live),
              child: const Text('Preview another time'),
            ),
            if (preview) TextButton(
              onPressed: _windowPreview.returnToNow,
              child: const Text('Return to Now'),
            ),
          ]),
          if (preview) ...[
            const Text('The room window follows this preview. House time and research timestamps remain live.',
              style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
            Row(children: [
              TextButton(onPressed: () => _previewDay(-1),
                  child: const Text('← Day')),
              TextButton(onPressed: () => _previewDay(1),
                  child: const Text('Day →')),
            ]),
            Slider(
              value: (time.hour * 60 + time.minute).toDouble(),
              min: 0,
              max: 1439,
              divisions: 1439,
              label: localTime,
              onChanged: (value) => _previewMinute(value.round()),
            ),
          ],
          const Text('Sky calculations are approximate. The room artwork stays the approved Grove scene.',
              style: TextStyle(color: ArborEnvironmentTokens.textMuted,
                  fontSize: 11)),
        ],
      ),
    );
  }

  String _time(BuildContext context, DateTime? date) {
    if (date == null) return '—';
    return MaterialLocalizations.of(context)
        .formatTimeOfDay(TimeOfDay.fromDateTime(date));
  }
}
