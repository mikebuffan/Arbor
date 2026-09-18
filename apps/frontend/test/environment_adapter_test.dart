import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/environment_adapter.dart';

void main() {
  test('demo adapter identifies its source and never masquerades as live data', () async {
    final adapter = DemoEnvironmentAdapter();
    final snapshot = await adapter.snapshot();

    expect(snapshot.source, 'DEMO DATA');
    expect(snapshot.objective.isDemo, isTrue);
    expect(snapshot.workItems.every((item) => item.isDemo), isTrue);
  });

  test('demo snapshot preserves explicit ARK boundary', () async {
    final snapshot = await DemoEnvironmentAdapter().snapshot();
    final ark = snapshot.workItems.singleWhere((item) => item.title.contains('ARK adapter'));

    expect(ark.detail, contains('Exact ARK checkpoint recovery required'));
  });
}
