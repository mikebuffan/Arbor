import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_window_time_selection.dart';

void main() {
  test('sundial is display only, never changes its clock argument', () {
    final preview = GroveWindowTimeSelection();
    addTearDown(preview.dispose);
    final real = DateTime(2026, 9, 21, 8, 30);
    final sunrise = DateTime(2026, 9, 21, 6, 12);

    expect(preview.displayedAt(real), real);
    preview.show(sunrise);
    expect(preview.displayedAt(real), sunrise);
    expect(preview.isPreviewing, isTrue);
    expect(real.hour, 8);
    preview.returnToNow();
    expect(preview.displayedAt(real), real);
    expect(preview.isPreviewing, isFalse);
  });

  test('two room listeners see same preview and return to live time', () {
    final preview = GroveWindowTimeSelection();
    addTearDown(preview.dispose);
    final seen = <DateTime?>[];
    preview.addListener(() => seen.add(preview.previewAt));
    preview.addListener(() => seen.add(preview.previewAt));

    final newTime = DateTime(2026, 9, 22, 21, 45);
    preview.show(newTime);
    expect(seen, [newTime, newTime]);
    preview.show(newTime);
    expect(seen, hasLength(2), reason: 'No duplicate update for same selection');
    preview.returnToNow();
    expect(seen, hasLength(4));
    expect(seen.last, isNull);
    preview.returnToNow();
    expect(seen, hasLength(4), reason: 'No duplicate live reset');
  });
}
