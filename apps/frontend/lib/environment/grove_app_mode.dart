/// Build-time app entrypoint; changing rooms never changes this installation.
const bool groveStandalone =
    bool.fromEnvironment('GROVE_STANDALONE', defaultValue: false);
