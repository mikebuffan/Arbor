import 'dart:async';
import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_astronomy.dart';
import 'grove_house_clock.dart';

/// Native Flutter Living Window controls, backed by the same optional-location
/// model as the stand-alone reference-image proof of concept.
/// Never changes device time, reads or writes ARK, or requests precise GPS.
class GroveLivingWindowPanel extends StatefulWidget {
  const GroveLivingWindowPanel({super.key, this.clock});
  final DateTime Function()? clock;

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
  String? _place;
  bool _preview = false;
  int _minutes = 720;
  int _dayOffset = 0;
  late DateTime _live;

  @override
  void initState() {
    super.initState();
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
      _houseClock!.addListener(_onHouseTimeChanged);
    }
  }

  void _onHouseTimeChanged() {
    if (!mounted) return;
    setState(() => _live = _houseClock!.localNow);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _houseClock?.removeListener(_onHouseTimeChanged);
    _houseClock?.detach();
    super.dispose();
  }

  DateTime get _shown {
    if (!_preview) return _live;
    // Construct wall-clock fields, not elapsed minutes: a DST transition
    // must not shift the user's selected local sundial time by an hour.
    return DateTime(_live.year, _live.month, _live.day + _dayOffset,
        _minutes ~/ 60, _minutes % 60);
  }

  @override
  Widget build(BuildContext context) {
    final time = _shown;
    final sky = GroveAstronomy.at(time, location: _places[_place]);
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
          Text('$date • ${_preview ? 'PREVIEW TIME' : 'LOCAL TIME · LIVE'}',
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
              onPressed: () => setState(() {
                if (!_preview) {
                  _minutes = _live.hour * 60 + _live.minute;
                  _dayOffset = 0;
                }
                _preview = true;
              }),
              child: const Text('Preview another time'),
            ),
            if (_preview) TextButton(
              onPressed: () => setState(() => _preview = false),
              child: const Text('Return to Now'),
            ),
          ]),
          if (_preview) ...[
            Row(children: [
              TextButton(onPressed: () => setState(() => _dayOffset--),
                  child: const Text('← Day')),
              TextButton(onPressed: () => setState(() => _dayOffset++),
                  child: const Text('Day →')),
            ]),
            Slider(
              value: _minutes.toDouble(),
              min: 0,
              max: 1439,
              divisions: 287,
              label: localTime,
              onChanged: (value) => setState(() => _minutes = value.round()),
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
