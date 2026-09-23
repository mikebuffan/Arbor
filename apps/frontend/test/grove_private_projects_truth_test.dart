import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/project_view.dart';

const selected = '00000000-0000-4000-8000-000000000003';

void main() {
  testWidgets('private Grove projects screen shows only selected grant',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: ProjectsView(
          privateGrove: true,
          selectedProjectId: selected,
        ),
      ),
    ));
    expect(find.text('THE GROVE · AUTHORIZED PROJECT'), findsOneWidget);
    expect(find.text('Selected private ARK project'), findsOneWidget);
    expect(find.textContaining('Project ID: $selected.'), findsOneWidget);
    expect(find.textContaining('this card is not a work receipt'),
        findsOneWidget);
    expect(find.text('Epstein Evidence Project'), findsNothing);
    expect(find.text('QUEUED'), findsNothing);
    expect(find.text('BUILDING'), findsNothing);
  });

  testWidgets('private Grove never invents a default project',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: ProjectsView(privateGrove: true, selectedProjectId: ''),
      ),
    ));
    expect(find.textContaining('No private project is selected'),
        findsOneWidget);
    expect(find.text('Epstein Evidence Project'), findsNothing);
  });

  testWidgets('original non-Grove visual placeholders are unchanged',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: ProjectsView(privateGrove: false),
      ),
    ));
    expect(find.text('Epstein Evidence Project'), findsOneWidget);
    expect(find.text('QUEUED'), findsOneWidget);
  });
}
