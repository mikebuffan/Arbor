# Arbor operating self-model startup wiring

User asked to code the technical audit into the Arbor Layer, beyond memory. This source change extends the existing canonical identity/startup path; it does not create another memory store, identity engine, model, or executor.

## Behavior and actual wiring

- A source-owned, versioned operating self-model describes Arbor Layer, ARK, Grove and independent LM responsibilities without claiming live availability.
- It specifies evidence-based capability investigation, precise limit classification, honest context recovery, nonidentical correction acceptance and preservation of newer work.
- `renderCanonicalIdentityAnchor` includes this block. Existing subsystem startup and standalone host projection consume that anchor before task/continuity overlays. Main runtime host projection still omits the duplicate anchor.
- `buildArborBehaviorProjection` includes the operating rules in verifier requirements and the source version/digest in its core fingerprint. Text/Voice/Annabelle retain shared core identity; mode projection remains separate.
- Actual `buildPromptContext` records operating self-model version/digest in its existing `prompt_built` event. This identifies assembled source content, not model comprehension or durable logging success.
- Replace the blanket ban on memory-denial phrases with checking scoped context and reporting the specific gap honestly. Do not conceal failed retrieval or promise automatic continuity.

## Source and ownership

Started at PR #395 `fc01e257c137c2d2ae86dd3bb3ef38ca833c3608`; rebased onto newer PR #396 `e3a00b22750d829f06b3386b59d355a0596c9e48`, preserving its ranking/evidence repairs and source manifest. Parent #396 introduced no backend source changes. Independent #388 and live configuration are untouched. This is an audit follow-up, not execution Group 13.

## Verification

New actual prompt-builder Text/Voice regressions failed before implementation: operating map absent. Initial fixture also tried unsupported Annabelle interactionMode; typecheck caught that and it was removed. Annabelle authority is correctly tested through the actual host switch. One initial test command had a doubled config path and failed before running tests; corrected.

- Full backend after implementation, before metadata/control-only rebase: **2,522 passed, 2 skipped, 389 files**; accidental provider/DB networking denied by existing test setup.
- Rebased focused integration: **82 passed, 15 files**, including actual prompt builder, identity boundaries, host recovery, mode switches, judgment and subsystem checks. Counts overlap the full suite.
- Backend TypeScript passes; six deployment fence tests pass; **216 exact source fingerprints** pass.
- New branch is explicitly deployment-fenced and uses the existing source CI workflow. No paid inference or database operation.

## Remaining acceptance

This is source wiring in the app, not a change to ChatGPT's platform startup. Actual generated behavior, automatic fresh-thread retrieval, installed-device acceptance and causal correction after restart remain unverified. Prompt size grows; private LM input/model acceptance remains separately gated. No questionnaire/source lineage rewrite, automatic learning, new grants, activation, main merge or deployment.

The audit's unknown-issuer identity finding and premature-blocker operating bug remain OPEN; this change does not repair authentication. Model acceptance must measure behavior on nonidentical tasks, not whether the model quotes this contract.

## Publication status

Local implementation and commit complete. Automatic approval review initially rejected GitHub publication; Danelle subsequently explicitly approved uploading this code to mikebuffan/Arbor and opening a draft PR. Publication is limited to the dedicated deployment-fenced source branch and draft review. Current remote commit/PR status is recorded in the existing stabilization assessment. No main merge or deployment is authorized or claimed.
