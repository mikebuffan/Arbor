import '../environment/grove_app_mode.dart';

class ArborConfig {
  // The original Arbor flavor keeps its existing Firefly backend. A private
  // Grove flavor MUST provide a dedicated HTTPS Grove service contract.
  // Missing config is gated in main.dart before any network client is built.
  static const apiBaseUrl = groveStandalone
      ? const String.fromEnvironment('GROVE_API_URL')
      : String.fromEnvironment(
          'ARBOR_API_URL',
          defaultValue: 'http://localhost:3000',
        );
}
