import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/pages/chat_test_page.dart';
import 'package:frontend/pages/grove_talk_page.dart';
import 'package:frontend/pages/voice_page.dart';

void main() {
  testWidgets(
      'standalone private Grove never presents unsupported legacy chat/voice',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: GroveTalkPage(privateHostMode: true)),
    ));

    expect(find.text('THE GROVE · TALK'), findsOneWidget);
    expect(find.text('Private Text isn’t enabled in this Grove build.'),
        findsOneWidget);
    expect(find.textContaining('owner-scoped private Text path is built'), findsOneWidget);
    expect(find.textContaining('old Firefly or public-app chat service'),
        findsOneWidget);
    expect(find.byType(ChatTestPage), findsNothing);
    expect(find.byType(VoicePage), findsNothing);
    expect(find.byType(SegmentedButton<bool>), findsNothing);
  });
}
