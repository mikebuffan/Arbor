# One Arbor personality source acceptance — 2026-10-03

Parent repair object: `8a792fcd1c98686d2e1e3f341d7d2e94a0514943`, above #235's `1e027c4835e5e8b05f61af5fd7c4bb260ebfcc24`. Existing draft branches remain unchanged. This supplement follows `ARBOR_SOURCE_ACCEPTANCE_REPAIRS_20261003.md`.

## Finding and repair

Backend chat loaded a canonical identity/version header but not the substantive decision-style rules already held in the control backend's self-model. Fresh projectless prompts omitted even that identity header. Behavior verification did not receive the self-model rules, and the read-only ARK continuity response did not expose the baseline.

Chat now loads a generated projection of the existing 300-question preservation pass before subsystem/task context, including fresh projectless sessions. Eighteen preserved decision-style rules cover independent judgment, directness, correction responsiveness, causal continuity, agency, evidence, privacy, and resistance to generic drift. The source self-model engine, questionnaire, and preservation decisions are unchanged.

The earned-humor pattern remains **held** by that existing evaluator. Its rule is included separately as **user-requested style**, not falsely promoted as verified cross-domain behavior. The projection distinguishes that provenance. Fiction craft is excluded from the ordinary personality baseline and remains under the existing Annabelle overlay.

The shared behavior contract explicitly prevents reconstruction of personality from a tired, terse, serious, or distressed user turn. Sensitivity and pacing can change; independent judgment, warmth, initiative, and earned humor remain available. Humor is not forced where it would minimize the situation. Requested formal outputs remain possible. Project philosophy and task overlays cannot replace the baseline or erase active corrections.

The behavior fingerprint and response verifier requirements include the same personality rules across text, voice, and Annabelle. Acoustic calibration remains separate. The ARK continuity tool exposes `identityAnchor` even when runtime history is unavailable, with the output schema updated; missing history remains unavailable and no false goal/history is created.

## Single source and packaging

`scripts/export-personality-projection.mjs` exports only the prompt material from existing control-backend source. Run `node --import tsx scripts/export-personality-projection.mjs` at the repository root to refresh the generated JSON. A backend parity test checks the exported rules against the existing evaluator and preserves the held humor status. The generated projection avoids importing the control backend's compiled-ESM dependency graph into the production Next.js bundle; it creates no new engine, database, or personality ledger.

The 1,000-question dynamic projection and live self-model observation mechanisms are not newly transplanted by this bounded change. The retained canonical identity lineage/version is not a claim that all 1,300 answers are placed into every prompt.

## Validation

- **639 backend tests passed, zero failed**: prior 630 plus nine personality/continuity cases.
- TypeScript passed.
- Production Next.js build passed with placeholder credentials.
- Fresh-session cases cover tired, brief, and technical messages in both text and voice, with no recalled runtime or selected memories.
- Tests verify identity-before-subsystem order, shared personality fingerprints/guards across modes, transient-context isolation, source-projection parity, held-evidence provenance, and ARK baseline without fabricated history.
- The first full-suite attempt hit automatic approval rejection for an external OpenAI request. Unit-test setup now denies unexpected global fetch requests before imports and between tests; request-contract tests supply explicit local fetch stubs. The successful full-suite run used this local-only boundary.

These are source/prompt/verification-contract checks, not live generated-conversation or acoustic acceptance. They cannot guarantee humor, warmth, or accent from rendered output.

## At-home acceptance

Attach this immutable review object above the preceding repair for draft review and preview deployment when appropriate. Then verify the exact deployed commit and installed connector response, and run a fresh-session text → voice → Annabelle → text sequence. Include a tired/terse message, a technical task, a disagreement, a personality correction, and a return to ordinary conversation. Check actual delivery with Danelle; do not treat prompt presence or textual behavior as proof of voice acceptance.

No branch was created or advanced, no PR was changed, and no merge, deployment, protected live write, or execution activation was performed for this source acceptance pass.
