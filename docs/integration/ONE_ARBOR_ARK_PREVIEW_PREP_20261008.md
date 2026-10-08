# ONE ARBOR — isolated Preview branch preparation, 2026-10-08

Owner-approved scope: prepare a dedicated ARK Preview branch ONLY, based on reviewed PR #369 at `aaaaa672cfadf0992859389778d6e2d6119ede1b`. No deployment, secret changes, permission grants, user-data operations, worker/canary execution, main merge, or production change is approved by this preparation.

- Source parent: PR #369 `aaaaa672cfadf0992859389778d6e2d6119ede1b` (2,175 backend passed/2 skipped; 154 control; 37 Grove widgets; original 103 source blob pins). Frozen until rechecked.
- Branch: `prep/one-arbor-ark-preview-20261008`; this very branch is listed in `ops/grove/source-only-ignore.mjs` BEFORE Git ref creation, to cancel Vercel builds. The same pin is adjusted in the existing composition manifest. Not a deployable release yet.
- Target after SEPARATE authorization: Vercel `firefly-ark-sandbox` project `prj_OHM6b4QpfGZGNWpx4hSPkgHCuyzp`, preview-only. Production `firefly` must never build or receive private preview host credentials.
- Existing sandbox alias serves historical #322 READY source, not this branch. Do not move it.
- **Environment gate:** Old Preview's `ARBOR_ARK_CANARY_OBJECTIVE_ID`, `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` have old-branch scoping; the required `ARBOR_ENABLE_ARK_PREVIEW_ACCEPTANCE` enable flag is not listed. Do not copy existing secret values or make branch env changes. An isolated nonproduction DB/project and least-privilege credentials must be independently confirmed before enabling any execution route.
- **Authority gate:** Fresh App `canControlObjectives=false`. Existing STOP objective remains queued with zero attempts. Do not attempt STOP or use the bounded preview route without independent approval.
- **Rollback gate:** use an independently verified previous READY Preview deployment only if scoped to the correct app/env; backup/rollback safety and effective alias parity remain unproven.

Next actions: freeze/review this exact branch SHA and source/ignored-build receipts; separately obtain authorization for sandbox preview deployment preparation requiring scoped env/DB verification. Only after that, authorize one deployment and verify exact SHA/URL/issuer/tool parity; STOP and subsequent release tests have their own authority gate.

Master: ONE ARBOR 97-task ledger, Group 1 R0–R9. This is a scoped receipt, not a new master or proof of live acceptance.
