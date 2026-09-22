# Grove phone acceptance feedback — private home vs public Arbor App

2026-09-21 local device review. Scope: The Grove draft branch stacked on #148; no merges, releases, signing or production edits.

## What actual Samsung screenshots establish
- Private Grove debug APK installs and opens as a separate Android launcher.
- House/Window and Talk destinations render on the device.
- The intended private house imagery is the approved nighttime room. Additional kitchen, desk and observatory images supplied in chat are design references, **not shipped screens or approved replacements** for the exact nighttime home asset.
- The house's golden-hour window appeared as an opaque peach rectangle; the committed bitmap was also visibly soft.
- Grove Talk incorrectly displayed the pre-existing ARBOR debug UI (purple) with raw auth/session identifiers. It used the same Supabase and API compile-time configuration as the original Arbor flavor. A distinct Android package is **not** an independently provisioned authentication realm or backend.
- 'Signed in' in the photographed prototype proves an existing Firefly Supabase session in this Grove installation; it does NOT prove a public-alpha account or a dedicated newly provisioned Grove account.
- The independent public Arbor App lives in separate draft PR #140 → #146, with its own planned alpha data/service boundary. It has not been deployed as a real public login here. Never treat the screenshot as proof of a public-alpha login.

## Immediate isolated fixes in this draft branch
- Remove the opaque daytime rectangle from approved house painting. Keep artwork unchanged and explicitly say daylight art is not ready rather than simulate a flat panel. Existing time/astronomy/window control still shows time and allows preview.
- Route the grove-flavored Talk destination into Grove-only teal text/voice presentation with the existing underlying text/voice clients. Original arbor-flavored app remains on the classic shell.
- Change Talk heading to name the private Grove and explain existing Firefly sign-in; hide raw user/project/thread identifiers in Grove display. The original debug Arbor display is unaffected.

## Still blocked / do not tell the owner it is fixed
1. Private Grove account provisioning and distinct Grove authentication + API contract if owner requires independence from existing Firefly; no credentials have been created or supplied by these UI changes. Do not mint passwords, simulate a signed-in user, or silently reuse a public alpha provider.
2. Public alpha needs its **own** dedicated provisioned backend as designed in #140/#146; do not point it at existing Firefly or Grove identities.
3. Inspect and approve exact visual assets per room (canonical master, then kitchen/desk/observatory); ship actual high-resolution assets as binaries, not HTML mockups/screenshots with phone chrome.
4. Grove's model/ARK Text→Voice→Text and auth/data isolation still require physical acceptance; window astronomy/art is not validated as a live rendered dynamic sky.
5. CI, on-device install of the new APK, retention/rollback, and owner-approved deployment still required.

## Isolation contract
The Grove is Danelle's private immersive household. The public Arbor App is a separate product for other users. They may reuse audited *source code*, but must not share app package, account/session storage, conversations, user/project records, secrets or deployment assumptions by accident. No app should silently sign a user into another app. Existing Firefly credentials must not be re-described as public-alpha credentials.

## CI and Android artifact
- Combined GitHub Actions run [35676266408](https://github.com/mikebuffan/Arbor/actions/runs/35676266408) **passed all three jobs**, including backend/control tests and builds, Flutter analysis and tests, existing Arbor and distinct Grove Android debug APK builds/uploads, at exact tested head `b34328f1e424a3ed50154de552f7fdeb340176c3`.
- Grove artifact `10673136859` (`the-grove-android-debug`) is from this run; APK ZIP integrity and inner APK ZIP structure checked after extraction. The extracted APK SHA-256 is `af598b5e8de894f86dd5f2128ad64f7fcf1655b0d028d8b4bff41f72f4cb9c48`. The original Arbor APK was built independently in that run.
- The temporary stacked CI PR-target line was removed in a workflow-only commit after tests. **No physical installation of this new version or independent authentication acceptance is claimed.**

No production service/DB/worker/LM/public branch was changed by this private UI draft.
