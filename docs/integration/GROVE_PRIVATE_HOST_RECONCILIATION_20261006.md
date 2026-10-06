# Grove private host reconciliation onto Buffalo — 2026-10-06

Base: frozen green Buffalo candidate `65f7ae96a4162b6ef5f069713d685c01c4517b19` from PR #249.

This bounded child restores only the existing private Grove host/read path and its source fixtures from the previously tested Grove lineage. It does **not** merge the historical Grove branch wholesale, activate a private model, apply hosted migrations, provision a Grove owner, enable ARK execution, or move production.

## Reconciled source
- Private Grove ARK project/status reads.
- Private conversation discovery/history/chat routes.
- Existing Grove authorization broker, transcript store, fenced claim model, signed LM transport and conversation loop.
- Existing owner/bridge/project-grant migrations plus proposed transcript/claim SQL and disposable acceptance SQL as source only.
- ARK → Layer read context restored against current One Arbor behavior projection.
- Current Buffalo behavior contract `2026-10-05.1` remains authoritative. Standalone-context rendering is opt-in, leaving normal Buffalo prompt/fingerprint behavior unchanged.
- Grove transport checks the current source contract constant instead of spoofing the historical `2026-09-21.1` value.

## Deliberately not imported
Dedicated-Grove Vercel config tests from the old branch are not applicable to the combined Buffalo sandbox because they require zero Firefly crons. Shared chat/runtime files already have newer Buffalo owners and were not replaced.

## Live boundaries observed before this source child
- Frozen Buffalo exact-SHA sandbox is live and read-only ARK acceptance is working.
- The separate Grove Supabase realm exists but currently has zero auth users, owner grants, Firefly bridge grants and ARK project grants.
- No Grove private Vercel host project is currently visible in the connected Vercel team.
- Real independent-LM inference remains OFF. The preserved private receiver still needs explicit compatibility/token-budget review before any model flag may be enabled.

CI on this child establishes source compatibility only. Hosted migrations, owner provisioning, private host release, real-model inference and physical-device acceptance remain protected later gates.
