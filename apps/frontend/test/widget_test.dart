import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/main.dart';

void main() {
  testWidgets(
    'Arbor app renders the Arbor shell',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const ArborApp(),
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
