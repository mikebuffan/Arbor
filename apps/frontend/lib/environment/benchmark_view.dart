import 'package:flutter/material.dart';
import 'environment_panel.dart';
import 'environment_tokens.dart';

class BenchmarkMetric {
  const BenchmarkMetric(this.label, this.value, {this.note});
  final String label;
  final String value;
  final String? note;
}

class BenchmarkView extends StatelessWidget {
  const BenchmarkView({super.key, required this.metrics});
  final List<BenchmarkMetric> metrics;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 16,
    runSpacing: 16,
    children: [
      ...metrics.map((metric) => SizedBox(
        width: 250,
        child: EnvironmentPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(metric.label.toUpperCase(), style: const TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 10, letterSpacing: 1.2)),
              const SizedBox(height: 8),
              Text(metric.value, style: const TextStyle(color: ArborEnvironmentTokens.textPrimary, fontSize: 28, fontWeight: FontWeight.w300)),
              if (metric.note != null) ...[
                const SizedBox(height: 6),
                Text(metric.note!, style: const TextStyle(color: ArborEnvironmentTokens.textMuted, fontSize: 11)),
              ],
            ],
          ),
        ),
      )),
      const SizedBox(
        width: 516,
        child: EnvironmentPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('BENCHMARK PRINCIPLE', style: TextStyle(color: ArborEnvironmentTokens.cyan, fontSize: 11, letterSpacing: 1.4)),
              SizedBox(height: 10),
              Text(
                'Measure wall time, model-displayed work time, human interventions, correctness, provenance accuracy, duplicate actions, recovery success, and completion proof. Speed without correctness does not win.',
                style: TextStyle(color: ArborEnvironmentTokens.textMuted, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}
