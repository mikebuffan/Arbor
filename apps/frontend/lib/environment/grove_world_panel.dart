import 'package:flutter/material.dart';

import 'environment_panel.dart';
import 'environment_tokens.dart';
import 'grove_world_state.dart';
import 'grove_world_store.dart';

/// Interactive *local scenery*. Its activity is explicitly visitor-driven,
/// not evidence that an ARK worker or a synthetic mind has been active.
class GroveWorldPanel extends StatefulWidget {
  const GroveWorldPanel({super.key, this.store, this.onLoaded});
  final GroveWorldStore? store;
  /// The parent house uses this device-local snapshot for its scenery marker.
  /// Null means the store could not be read; never keep displaying stale state.
  final ValueChanged<GroveWorldLoad?>? onLoaded;

  @override
  State<GroveWorldPanel> createState() => _GroveWorldPanelState();
}

class _GroveWorldPanelState extends State<GroveWorldPanel> {
  late final GroveWorldStore _store = widget.store ?? GroveWorldStore();
  GroveWorldLoad? _loaded;
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    try {
      final result = await _store.load();
      if (!mounted) return;
      setState(() {
        _loaded = result;
        _busy = false;
        _error = null;
      });
      widget.onLoaded?.call(result);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loaded = null;
        _busy = false;
        _error = 'Cannot read this device\'s Grove state.';
      });
      widget.onLoaded?.call(null);
    }
  }

  Future<void> _act(GroveWorldAction action, GroveZone zone) async {
    final previous = _loaded?.state;
    if (_busy || previous == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final next = previous.apply(action, zone: zone, at: DateTime.now());
      await _store.save(next, fromRevision: previous.revision);
      if (!mounted) return;
      final loaded = GroveWorldLoad(GroveWorldLoadStatus.restored, next);
      setState(() {
        _loaded = loaded;
        _busy = false;
      });
      widget.onLoaded?.call(loaded);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loaded = null;
        _busy = false;
        _error = 'Change not saved. State left intact; reopen to reload.';
      });
      widget.onLoaded?.call(null);
    }
  }

  Future<void> _confirmReset() async {
    if (_busy) return;
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset local Grove scenery?'),
        content: const Text(
          'This clears only the local room/Moss state on this device. '
          'ARK projects, manuscripts, and conversations are not touched.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep it')),
          TextButton(onPressed: () => Navigator.pop(context, true),
              child: const Text('Reset local state')),
        ],
      ),
    );
    if (approved != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await _store.reset();
      if (!mounted) return;
      await _reload();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Reset failed; stored data was not confirmed cleared.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final load = _loaded;
    final state = load?.state;
    final status = switch (load?.status) {
      GroveWorldLoadStatus.newHouse => 'NEW · NOT YET SAVED',
      GroveWorldLoadStatus.restored => 'RESTORED FROM THIS DEVICE',
      GroveWorldLoadStatus.incompatible => 'NEWER/UNKNOWN FORMAT · LOCKED',
      GroveWorldLoadStatus.damaged => 'DAMAGED DATA · LOCKED',
      null => 'LOADING',
    };

    final mossPlace = state?.mossZone == GroveZone.rug ? 'rug' : 'sofa';
    return EnvironmentPanel(child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('THE GROVE · LIVING WORLD',
            style: TextStyle(color: ArborEnvironmentTokens.cyan,
                letterSpacing: 1.3, fontSize: 11)),
        const SizedBox(height: 9),
        Text(status, style: const TextStyle(
            color: ArborEnvironmentTokens.firefly, fontSize: 12)),
        const SizedBox(height: 8),
        if (state != null) ...[
          Text('Moss is ${state.mossResting ? 'resting' : 'awake'} on the $mossPlace.',
              style: const TextStyle(
                  color: ArborEnvironmentTokens.textPrimary, fontSize: 17)),
          const SizedBox(height: 6),
          Text('Local scenery revision ${state.revision} · '
              '${state.events.length} recent visitor interactions',
              style: const TextStyle(color: ArborEnvironmentTokens.textMuted)),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            OutlinedButton.icon(
              onPressed: _busy ? null :
                  () => _act(GroveWorldAction.moveMoss, GroveZone.sofa),
              icon: const Icon(Icons.weekend_outlined),
              label: const Text('Moss on sofa'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null :
                  () => _act(GroveWorldAction.moveMoss, GroveZone.rug),
              icon: const Icon(Icons.pets_outlined),
              label: const Text('Moss on rug'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _act(
                state.mossResting ? GroveWorldAction.wakeMoss :
                    GroveWorldAction.settleMoss,
                state.mossZone,
              ),
              icon: Icon(state.mossResting ?
                  Icons.wb_sunny_outlined : Icons.bedtime_outlined),
              label: Text(state.mossResting ? 'Wake Moss' : 'Let Moss rest'),
            ),
          ]),
          const SizedBox(height: 10),
          Text('Last visitor change: '
              '${state.revision == 0 ? 'none yet' : state.updatedAtUtc.toLocal().toString()}',
              style: const TextStyle(
                  color: ArborEnvironmentTokens.textMuted, fontSize: 11)),
        ],
        if (state == null && !_busy)
          const Text('Stored scenery was preserved. No automatic overwrite.',
              style: TextStyle(color: ArborEnvironmentTokens.textMuted)),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(
              color: ArborEnvironmentTokens.danger)),
          TextButton(onPressed: _busy ? null : _reload,
              child: const Text('Reload local state')),
        ],
        if (_busy) const LinearProgressIndicator(),
        const SizedBox(height: 10),
        const Text('Only your taps update this panel. The real ARK task '
            'status lives in the separate read-only status views.',
            style: TextStyle(color: ArborEnvironmentTokens.textMuted,
                fontSize: 11)),
        if (state != null && state.revision > 0 ||
            load?.status == GroveWorldLoadStatus.incompatible ||
            load?.status == GroveWorldLoadStatus.damaged)
          TextButton.icon(
            onPressed: _busy ? null : _confirmReset,
            icon: const Icon(Icons.restart_alt),
            label: const Text('Reset device-local scenery'),
          ),
      ],
    ));
  }
}
