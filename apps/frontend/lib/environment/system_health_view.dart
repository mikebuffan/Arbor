import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

class SystemHealthView extends StatelessWidget {
  const SystemHealthView({
    super.key,
    required this.runtimeSource,
    required this.runtimeStale,
  });

  final String runtimeSource;
  final bool runtimeStale;

  @override
  Widget build(BuildContext context) => EnvironmentPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'SYSTEM HEALTH',
              style: TextStyle(
                color: ArborEnvironmentTokens.cyan,
                fontSize: 11,
                letterSpacing: 1.4,
              ),
            ),
            const SizedBox(height: 12),
            const _HealthLine(
              'Environment shell',
              'AVAILABLE',
              ArborEnvironmentTokens.teal,
            ),
            const _HealthLine(
              'Conversation',
              'EXISTING CLIENT',
              ArborEnvironmentTokens.teal,
            ),
            const _HealthLine(
              'Voice',
              'EXISTING CLIENT',
              ArborEnvironmentTokens.teal,
            ),
            _HealthLine(
              'ARK read adapter',
              runtimeSource.startsWith('ARK') && !runtimeStale
                  ? 'READ ONLY'
                  : runtimeStale
                      ? 'FALLBACK/STALE'
                      : 'UNAVAILABLE',
              runtimeSource.startsWith('ARK') && !runtimeStale
                  ? ArborEnvironmentTokens.teal
                  : ArborEnvironmentTokens.firefly,
            ),
            const _HealthLine(
              'ARK execution',
              'OFF BY DEFAULT',
              ArborEnvironmentTokens.violet,
            ),
            const _HealthLine(
              'Production',
              'UNTOUCHED',
              ArborEnvironmentTokens.violet,
            ),
          ],
        ),
      );
}

class _HealthLine extends StatelessWidget {
  const _HealthLine(this.label, this.value, this.color);

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: ArborEnvironmentTokens.textMuted,
                ),
              ),
            ),
            Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
}
