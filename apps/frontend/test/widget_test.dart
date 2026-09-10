import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pages/arbor_shell_page.dart';

void main() {
  testWidgets(
    'Arbor shell switches between Text and Voice surfaces',
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
            find.byKey(
              const ValueKey('arbor-surface-stack'),
            ),
          );

      expect(find.text('ARBOR'), findsOneWidget);
      expect(stack().index, 0);

      await tester.tap(find.text('Voice'));
      await tester.pumpAndSettle();

      expect(stack().index, 1);
    },
  );
}
