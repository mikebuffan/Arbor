# Grove Android private release signing

This is an operator handoff, not a credential store. **Never commit, paste into chat, or put the keystore/passwords in a build log.**

The Grove release flavor now fails closed unless the trusted build environment provides:

- `GROVE_ANDROID_APPLICATION_ID` — owner-approved Android package ID.
- `GROVE_ANDROID_KEYSTORE_PATH` — filesystem path to the private keystore.
- `GROVE_ANDROID_KEYSTORE_PASSWORD`
- `GROVE_ANDROID_KEY_ALIAS`
- `GROVE_ANDROID_KEY_PASSWORD`

The repository ignores `*.jks`, `*.keystore`, and `**/key.properties`.

## Safe build sequence

1. Keep the keystore outside the repository.
2. Export the five values only in the trusted local/CI process that builds the private APK.
3. Build the Grove flavor with the real Grove Supabase/API `--dart-define` values.
4. Verify the APK signature and package ID before installing.
5. Install on the owner-approved device and run the acceptance path:
   sign in → authorized project → existing/new private thread → send one turn →
   close app → reopen → same thread/history.
6. Keep Voice OFF until private Text passes this acceptance.

A debug Grove APK remains useful for source/device layout testing, but it is **not** a release artifact and must never be reported as owner-accepted private Grove.
