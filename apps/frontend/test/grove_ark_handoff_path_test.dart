import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/environment/grove_ark_handoff.dart';

void main() {
  test('private Grove handoff uses the private broker path', () {
    expect(
      groveArkHandoffPath(privateGrove: true),
      '/api/grove/ark/handoff',
    );
    expect(
      groveArkHandoffPath(privateGrove: false),
      '/api/ark/handoff',
    );
  });
}
