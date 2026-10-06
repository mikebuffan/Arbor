import 'package:flutter/material.dart';

import 'environment_tokens.dart';
import 'grove_astronomy.dart';
import 'grove_house_clock.dart';
import 'grove_living_window_panel.dart';
import 'grove_window_time_selection.dart';

/// A real navigable Grove room displaying the existing local House Clock and
/// approximate sky calculations. This is NOT ARK research, a live telescope,
/// a location permission, or a second model/personality.
class GroveObservatoryView extends StatefulWidget {
  const GroveObservatoryView({
    super.key,
    required this.onReturnHome,
    this.clock,
    this.windowPreview,
  });

  final VoidCallback onReturnHome;
  final GroveHouseClock? clock;
  final GroveWindowTimeSelection? windowPreview;

  @override
  State<GroveObservatoryView> createState() => _GroveObservatoryViewState();
}

class _GroveObservatoryViewState extends State<GroveObservatoryView> {
  late final GroveHouseClock _clock;
  late final GroveWindowTimeSelection _preview;

  @override
  void initState() {
    super.initState();
    _clock = widget.clock ?? GroveHouseClock.shared;
    _preview = widget.windowPreview ?? GroveWindowTimeSelection.shared;
    _clock.attach();
    _clock.addListener(_refresh);
    _preview.addListener(_refresh);
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _preview.removeListener(_refresh);
    _clock.removeListener(_refresh);
    _clock.detach();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final real = _clock.localNow;
    final viewed = _preview.displayedAt(real);
    final sky = GroveAstronomy.at(viewed, location: _clock.location);
    final isNight = sky.phase == GroveDayPhase.night;
    final phase = switch (sky.phase) {
      GroveDayPhase.daylight => 'Daylight',
      GroveDayPhase.golden => sky.morning ? 'Morning light' : 'Golden hour',
      GroveDayPhase.twilight => sky.morning ? 'Predawn' : 'Twilight',
      GroveDayPhase.night => 'Night',
    };
    final moon = sky.moon;
    final local = MaterialLocalizations.of(context);
    final shownDate = local.formatMediumDate(viewed);
    final shownTime =
        local.formatTimeOfDay(TimeOfDay.fromDateTime(viewed));
    final actualTime =
        local.formatTimeOfDay(TimeOfDay.fromDateTime(real));

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('THE GROVE / OBSERVATORY',
          style: TextStyle(color: ArborEnvironmentTokens.cyan,
              fontSize: 11, letterSpacing: 1.4)),
      const SizedBox(height: 9),
      const Text('Upstairs, the sky is yours.',
          style: TextStyle(color: ArborEnvironmentTokens.textPrimary,
              fontSize: 25)),
      const SizedBox(height: 7),
      Text('HOUSE CLOCK · $actualTime',
          style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
      const SizedBox(height: 14),
      Semantics(
        label: 'Illustrative Grove sky. '
            '${_preview.isPreviewing ? 'Window preview' : 'Live clock'}: '
            '$phase, $shownDate $shownTime. '
            '${moon.name}, ${(moon.illuminated * 100).round()} percent lit.',
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 155),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: ArborEnvironmentTokens.violet),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isNight
                  ? const [Color(0xFF12152D), Color(0xFF32204C),
                      Color(0xFF0B2730)]
                  : const [Color(0xFF496A83), Color(0xFF8F7667),
                      Color(0xFF253E47)],
            ),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(isNight ? Icons.nights_stay_outlined
                  : Icons.wb_sunny_outlined, size: 32,
                  color: ArborEnvironmentTokens.firefly),
              const SizedBox(height: 10),
              Text('${_preview.isPreviewing ? 'WINDOW PREVIEW' : 'LIVE'} • $phase',
                  style: const TextStyle(
                    color: ArborEnvironmentTokens.textPrimary,
                    fontSize: 19)),
              const SizedBox(height: 5),
              Text('$shownDate · $shownTime',
                  style: const TextStyle(
                    color: ArborEnvironmentTokens.textPrimary)),
              const SizedBox(height: 6),
              Text('${moon.name} · ${(moon.illuminated * 100).round()}% lit',
                  style: const TextStyle(
                    color: ArborEnvironmentTokens.firefly)),
            ],
          ),
        ),
      ),
      const SizedBox(height: 8),
      const Text('Illustrative sky card, not a live camera or new painting. '
          'The approved Grove home artwork remains untouched.',
          style: TextStyle(
              color: ArborEnvironmentTokens.textMuted, fontSize: 11)),
      const SizedBox(height: 17),
      GroveLivingWindowPanel(
        windowPreview: _preview,
        clock: widget.clock == null ? null : () => _clock.localNow,
      ),
      const SizedBox(height: 13),
      FilledButton.icon(
        onPressed: widget.onReturnHome,
        icon: const Icon(Icons.home_outlined),
        label: const Text('Back to the Grove'),
      ),
    ]);
  }
}
