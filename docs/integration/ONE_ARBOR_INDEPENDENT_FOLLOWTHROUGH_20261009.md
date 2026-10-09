# One Arbor — no-repeat-prompt synthetic follow-through acceptance

## Scope and parent
Independent initiative / E01 and C04 source-only test child of green draft PR #377 at `9bc589400dcc474e5b0856eabd74cbd8013c64f0`. No ARK execution, deployment, model inference, personal data or privilege change.

## Existing runner, new falsifiable cases
Add a dedicated **synthetic-only**, fake-provider test through the existing `runOpenAIAgencyAgent` and `AgencyToolRegistry`. It begins with one user instruction and a mixed task ledger: two safe unfinished items, one already completed item, and one blocked/requires-authority item. A deterministic fake chooser inspects actual tool readbacks and selects the next eligible item; the real agency tool loop must execute the two safe writes and final read without another user message. It must not re-run already completed tasks or touch the blocked item.

Also test that a model-selected high-consequence tool is stopped at the existing human authorization boundary **without executing it**, and that an exhausted round budget yields a truthful checkpoint rather than a made-up completion.

## What this proves — and does not
Proof sought: runtime supports chained scoped reversible tools, correct readback-dependent follow-on actions, no repeated manual `go` at the tool-loop level, human boundary, and truthful checkpoint in these synthetic cases.

**Not proved:** actual model chooses the next task, genuinely prioritizes competing projects, makes independent suggestions, or continues after a chat turn closes. The offline chooser is preprogrammed; real blinded model evaluations and authorized host state are still pending. Do not claim E01/C04 behavioral completion from green CI.

## Required checks
Existing independent source-only workflow (focused test plus full backend/control/TypeScript/backend build), source-fingerprint checks, and exact-branch Vercel build-ignore are required on the new head before marking this bounded source test green.
