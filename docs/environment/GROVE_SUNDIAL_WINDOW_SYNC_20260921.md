# Grove sundial: window-only preview, live house time (isolated)

## What the user can do
- Open the standalone Grove house and tap **Window**, or scroll to the Living Window panel on Home.
- Tap **Preview another time** and move the sundial slider (minute resolution) or previous/next civil day.
- The room's central Living Window changes its atmospheric daylight/golden/twilight/night overlay and reads **WINDOW PREVIEW**.
- The Living Window panel and house room share one display-only time selection, so the overlay visibly follows slider/day controls. A separate window panel opened from the room sees the same preview.
- Tap **Return to Now** or **Return window to Now** to restore the real device-local House Clock. The selected city follows the shared House Clock across window panels.

## Truth boundaries
- This is a UI-only *preview* driven by device civil time and approximate astronomy. It does not alter the phone clock, House Clock, backend event timestamps, ARK, research sessions, or stored memory.
- With no city selected, phases are artistic time-of-day estimates. With an approximate city, solar/moon altitude and sunrise/sunset are approximate, not a precise observatory.
- The approved nighttime Grove image remains original artwork; daytime illumination is a window-only preview overlay, not a completed separate daytime image.
- The House Clock is an app presentation clock, **not evidence the model thinks, observes, or runs while the phone is closed**.
- No GPS requests, precise location tracking, or persistent location writes.

## Branch/release boundary
Stacked draft branch `feat/grove-sundial-window-sync-20260921` based on the independent Grove house branch from PR #122. Intended for review on that branch before any merge into main. Research PR #123, operator PR #124, and continuity PR #125 are untouched.
- Unit tests: preview selection and observer lifecycle.
- Integration widget tests: user sundial controls update room phase; day changes are civil dates; Return to Now; House Clock remains unchanged.
- CI is required, followed by signed-in **physical phone** visual acceptance. Debug APK passing CI does not establish that it has been installed or checked on Danelle's phone.
