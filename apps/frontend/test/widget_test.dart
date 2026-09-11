import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pages/arbor_shell_page.dart';
import 'package:frontend/pages/voice_page.dart';
import 'package:frontend/widgets/arbor_visual.dart';

void main() {
  testWidgets('Arbor shell switches between Text and Voice surfaces',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ArborShellPage(
          chatLayer: Text('CHAT'),
          voiceLayer: Text('VOICE'),
        ),
      ),
    );

    IndexedStack stack() => tester.widget<IndexedStack>(
          find.byKey(const ValueKey('arbor-surface-stack')),
        );

    expect(find.text('ARBOR'), findsOneWidget);
    expect(find.byType(ArborVisual), findsOneWidget);
    expect(stack().index, 0);

    await tester.tap(find.text('Voice'));
    await tester.pump(const Duration(milliseconds: 350));

    expect(stack().index, 1);
  });

  testWidgets('Voice is inactive until its surface is fully opened',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ArborShellPage(
          chatLayer: Text('CHAT'),
        ),
      ),
    );

    VoicePage voice() =>
        tester.widget<VoicePage>(find.byType(VoicePage));

    expect(voice().active, isFalse);

    await tester.tap(find.text('Voice'));
    await tester.pump(const Duration(milliseconds: 350));

    expect(voice().active, isTrue);
  });

  testWidgets('Arbor visual supports every runtime state',
      (WidgetTester tester) async {
    for (final state in ArborVisualState.values) {
      await tester.pumpWidget(
        MaterialApp(
          home: SizedBox(
            width: 400,
            height: 800,
            child: ArborVisual(state: state),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 16));
      expect(find.byType(ArborVisual), findsOneWidget);
    }
  });

  testWidgets('Arbor title yields focus while active',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ArborVisual(state: ArborVisualState.listening),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));

    final opacity = tester.widget<AnimatedOpacity>(
      find.ancestor(
        of: find.text('ARBOR'),
        matching: find.byType(AnimatedOpacity),
      ),
    );
    expect(opacity.opacity, 0);
  });
}
