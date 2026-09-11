class ArborConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'ARBOR_API_URL',
    defaultValue: 'http://localhost:3000',
  );
}
