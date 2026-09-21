import 'package:flutter/material.dart';

import 'environment_tokens.dart';
import 'grove_astronomy.dart';
import 'grove_house_clock.dart';
import 'grove_window_time_selection.dart';

/// The approved nighttime room is the floor plan: left stairs and shelves,
/// Moss on left couch, central living window and Arbor, desk on the right.
/// Daylight is a *preview overlay* on that image, not finished daytime art.
enum GroveRoomAction { arbor, desk, shelves, stairs, kitchen, moss, window }

class GroveHouseRoom extends StatefulWidget {
  const GroveHouseRoom({
    super.key,
    required this.onOpen,
    this.clock,
    this.windowPreview,
  });

  final ValueChanged<GroveRoomAction> onOpen;
  final GroveHouseClock? clock;
  final GroveWindowTimeSelection? windowPreview;

  @override
  State<GroveHouseRoom> createState() => _GroveHouseRoomState();
}

class _GroveHouseRoomState extends State<GroveHouseRoom> {
  late final GroveHouseClock _clock;
  late final GroveWindowTimeSelection _windowPreview;

  @override
  void initState() {
    super.initState();
    _clock = widget.clock ?? GroveHouseClock.shared;
    _windowPreview = widget.windowPreview ?? GroveWindowTimeSelection.shared;
    _clock.attach();
    _clock.addListener(_refresh);
    _windowPreview.addListener(_refresh);
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _clock.removeListener(_refresh);
    _windowPreview.removeListener(_refresh);
    _clock.detach();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final houseNow = _clock.localNow;
    final now = _windowPreview.displayedAt(houseNow);
    final preview = _windowPreview.isPreviewing;
    final sky = GroveAstronomy.at(now, location: _clock.location);
    final phase = switch (sky.phase) {
      GroveDayPhase.daylight => 'Daylight',
      GroveDayPhase.golden =>
        sky.morning ? 'Sunrise' : 'Golden hour',
      GroveDayPhase.twilight =>
        sky.morning ? 'Before sunrise' : 'Twilight',
      GroveDayPhase.night => 'Night',
    };
    final tint = switch (sky.phase) {
      GroveDayPhase.daylight => const Color(0xAA95CFF4),
      GroveDayPhase.golden => const Color(0x88FFB56D),
      GroveDayPhase.twilight => const Color(0x557860CB),
      GroveDayPhase.night => Colors.transparent,
    };
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('THE GROVE • HOME',
          style: TextStyle(color: ArborEnvironmentTokens.cyan,
              letterSpacing: 1.6, fontSize: 11)),
      const SizedBox(height: 7),
      Text('${preview ? 'WINDOW PREVIEW' : 'LIVE'} • $phase • ${TimeOfDay.fromDateTime(now).format(context)}',
          style: const TextStyle(
              color: ArborEnvironmentTokens.textPrimary, fontSize: 17)),
      const SizedBox(height: 9),
      LayoutBuilder(builder: (context, bounds) {
        // Keep the original 709:409 composition and scale all hotspots with it.
        final width = bounds.maxWidth;
        return ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: SizedBox(
            width: width,
            height: width * 409 / 709,
            child: Stack(children: [
              Positioned.fill(child: Image.asset(
                'assets/grove_reference.webp',
                fit: BoxFit.fill,
                errorBuilder: (_, error, stack) => Container(
                  color: ArborEnvironmentTokens.midnight,
                  alignment: Alignment.center,
                  child: const Text(
                    'Grove art unavailable • the room remains accessible below.',
                    style: TextStyle(color: ArborEnvironmentTokens.textMuted),
                  ),
                ),
              )),
              // No whole-room tint: light should originate at the window.
              if (sky.phase != GroveDayPhase.night)
                Positioned(
                  left: width * .385,
                  top: width * 409 / 709 * .045,
                  width: width * .292,
                  height: width * 409 / 709 * .492,
                  child: IgnorePointer(child: AnimatedContainer(
                    duration: const Duration(milliseconds: 500),
                    decoration: BoxDecoration(color: tint,
                      borderRadius: BorderRadius.circular(2)),
                  )),
                ),
              _pin(width, .085, .15, Icons.restaurant_menu,
                  'Annabelle’s Kitchen', GroveRoomAction.kitchen),
              _pin(width, .13, .42, Icons.stairs_outlined,
                  'The staircase', GroveRoomAction.stairs),
              _pin(width, .20, .29, Icons.auto_stories_outlined,
                  'The shelves and memory', GroveRoomAction.shelves),
              _pin(width, .19, .68, Icons.pets_outlined,
                  'Moss on the couch', GroveRoomAction.moss),
              _pin(width, .50, .22, Icons.wb_twilight_outlined,
                  'The Living Window', GroveRoomAction.window),
              _pin(width, .59, .78, Icons.bubble_chart_outlined,
                  'Talk to Arbor', GroveRoomAction.arbor),
              _pin(width, .83, .51, Icons.desktop_mac_outlined,
                  'The desk and projects', GroveRoomAction.desk),
            ]),
          ),
        );
      }),
      const SizedBox(height: 10),
      const Text('Tap a room feature or use the accessible doors below.',
          style: TextStyle(color: ArborEnvironmentTokens.textMuted,
              fontSize: 12)),
      const SizedBox(height: 8),
      Wrap(spacing: 6, runSpacing: 6, children: [
        _door(Icons.chat_outlined, 'Arbor', GroveRoomAction.arbor),
        _door(Icons.restaurant_menu, 'Kitchen', GroveRoomAction.kitchen),
        _door(Icons.desktop_mac_outlined, 'Desk', GroveRoomAction.desk),
        _door(Icons.auto_stories_outlined, 'Shelves', GroveRoomAction.shelves),
        _door(Icons.stairs_outlined, 'Stairs', GroveRoomAction.stairs),
        _door(Icons.wb_twilight_outlined, 'Window', GroveRoomAction.window),
        _door(Icons.pets_outlined, 'Moss', GroveRoomAction.moss),
      ]),
      const SizedBox(height: 7),
      if (preview) ...[
        const Text('The sundial changes only the window artwork, not the House Clock.',
            style: TextStyle(color: ArborEnvironmentTokens.textMuted,
                fontSize: 11)),
        TextButton(
          onPressed: _windowPreview.returnToNow,
          child: const Text('Return window to Now'),
        ),
      ],
      if (sky.phase != GroveDayPhase.night)
        const Text('Daytime artwork is an atmospheric preview of the approved night scene.',
            style: TextStyle(color: ArborEnvironmentTokens.textMuted,
                fontSize: 11)),
    ]);
  }

  Widget _door(IconData icon, String label, GroveRoomAction target) =>
      OutlinedButton.icon(
        onPressed: () => widget.onOpen(target),
        icon: Icon(icon, size: 15),
        label: Text(label),
      );

  Widget _pin(double width, double x, double y, IconData icon,
      String label, GroveRoomAction target) {
    final height = width * 409 / 709;
    final size = width < 450 ? 31.0 : 43.0;
    return Positioned(
      left: (width * x - size / 2).clamp(0, width - size).toDouble(),
      top: (height * y - size / 2).clamp(0, height - size).toDouble(),
      child: Semantics(
        button: true, label: label,
        child: Tooltip(
          message: label,
          child: Material(
            color: const Color(0xB5081B24),
            shape: const CircleBorder(
              side: BorderSide(color: ArborEnvironmentTokens.cyan, width: .75)),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: () => widget.onOpen(target),
              child: SizedBox(width: size, height: size,
                child: Icon(icon, size: width < 450 ? 17 : 22,
                    color: ArborEnvironmentTokens.textPrimary)),
            ),
          ),
        ),
      ),
    );
  }
}
