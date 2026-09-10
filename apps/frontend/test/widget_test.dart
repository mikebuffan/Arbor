import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pages/arbor_shell_page.dart';

void main() {
  testWidgets(
    'Arbor shell renders home and chat layers',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: ArborShellPage(
            chatLayer: Text('CHAT'),
          ),
        ),
      );

      expect(
        find.text('ARBOR'),
        findsOneWidget,
      );

      expect(
        find.text('CHAT'),
        findsOneWidget,
      );
    },
  );
}
