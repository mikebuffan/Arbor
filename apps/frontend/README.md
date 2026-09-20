# Firefly / Arbor mobile client

This is the Flutter **mobile app source**, not a generated Next.js build and not
the deployed Vercel backend. The mobile shell contains Text, Voice, read-only
ARK status, and the shared signed-in conversation session.

## Verification

From `apps/frontend`:

```bash
flutter pub get
flutter analyze
flutter test
```

GitHub Actions also builds an **Android debug APK**. A successful debug build
proves the project compiles; it is **not** a production-configured, signed, or
device-acceptance-tested release.

## Local/device configuration

The app requires three **build-time** values:

- `SUPABASE_URL`: original Firefly Supabase project URL.
- `SUPABASE_ANON_KEY`: its *publishable/anon* client key only.
- `ARBOR_API_URL`: original Firefly's HTTPS backend URL, without trailing slash.

Use `--dart-define` or a private build process to supply these. The backend
URL defaults to localhost **for local development only**, so a CI debug APK
built without these values is not ready for an Android device to sign in.

Never put a Supabase service-role key, `CRON_SECRET`, OAuth bearer token,
other secret, or a user's password in app code, `--dart-define`, build logs,
or this repository. Public client configuration does not bypass row-level
security: sign in to Firefly before using Text, Voice, or user-owned ARK status.

## Readiness status

The source provides Text and Voice through Firefly's backend and a read-only
ARK dashboard. The mobile landing route opens Talk, and the dashboard remains
available through navigation. Finish a real-device signed-in Text -> Voice ->
Text continuity/microphone test and Android release signing before describing
the app as ready for everyday distribution.

The separately deployed ARK backend may remain installed while its
autonomous-execution switches are intentionally **off**. Never change those
switches as part of a mobile build.
