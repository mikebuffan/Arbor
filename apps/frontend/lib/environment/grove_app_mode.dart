/// Build-time app entrypoint; changing rooms never changes this installation.
const bool groveStandalone =
    bool.fromEnvironment('GROVE_STANDALONE', defaultValue: false);


/// The memory and attachment shelves still use Firefly-only API endpoints.
/// Standalone Grove's private host deliberately denies those routes. Never
/// send a Grove owner token to them, even if a caller constructs the reader.
void requireFireflyShelfRoutes({bool standalone = groveStandalone}) {
  if (standalone) {
    throw StateError('Firefly shelf routes are unavailable in private Grove.');
  }
}
