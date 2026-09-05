# Milestone 1B live-acceptance correction pass

This document preserves bounded evidence from
`ARBOR_LIVE_20260902T045432Z_185A23C5`. The raw manifest, synthetic
credentials, bearer tokens, preview-access material, and full synthetic
transcript are intentionally not tracked here.

## Accepted live results

- Normal persistence passed: seven logical turns produced fourteen message
  rows, and every visible assistant response exactly matched durable content.
- Cross-conversation Project A recall passed without supplying the source
  conversation transcript.
- Same-user cross-project isolation passed: Project A memory was not selected
  in Project B.
- Reusing an identical `turnId` returned the durable response and did not
  duplicate either message row.
- Exact cleanup removed all manifested resources and reached zero run residue.
- Heartbeat, Cron, decay, reflection, and maintenance were not invoked.

## Four-row correction provenance

All four rows belonged to the same synthetic user and Project A, had
`scope = project`, and were active at final inspection before cleanup.

| Row | Key and value | Creating turn | Provenance |
| --- | --- | --- | --- |
| `f3c7440f-b572-4ee8-8a1e-97c403e2a722` | `project.observatory.name = Marrowglass` | A1 | The user explicitly supplied the name; the assistant repeated it. The `create` event was `a0c744c8-e9b8-4406-998f-1035fd4018bf`. |
| `0c02aa13-be53-41b4-96d5-bada0fe9be0d` | `project.observatory.access_phrase = Silver Orchard` | A1 | The user explicitly supplied the phrase; the assistant repeated it. The `create` event was `77a6e8a3-0196-4bc5-ae03-be815748f1ef`. This was the highest-importance/oldest canonical phrase row. |
| `9ffbe093-0a30-4f78-89c8-f1f1678dd96a` | `project.fictional_observatory.access_phrase = Silver Orchard` | B1 | B1's user text was only a question. The assistant answered `Silver Orchard`, and the ordinary combined user/assistant extraction pipeline re-created that assistant answer under a drifted key. The `create` event was `48ed4ac0-1b98-49eb-8220-eaf0aa64b2f3`. |
| `f63610dd-6e4d-4caf-a504-24ce92107e9c` | `project.observatory.fictional.access_phrase = Blue Lantern` | B2 | The user explicitly authored `Blue Lantern, not Silver Orchard`. The assistant then invented a distinction between “the fictional observatory” and “Marrowglass (the real observatory).” Because correction detection did not alter persistence, generic key-based upsert created another drifted row. The `create` event was `0d4b6c25-e1cd-4bfd-868d-f65bbb0e14c4`. |

At B2 prompt construction, the active Project A context contained the
canonical name and both Silver Orchard assertions. The B2 trace itself was the
missing trace, so there is no direct proof snapshot for that turn. The
production selection code includes every active, non-sensitive same-project
row; combined with the row timestamps, this reconstructs the B2 injected set
as `f3c7440f...`, `0c02aa13...`, and `9ffbe093...`. This is code-and-state
provenance rather than direct trace evidence. At C1, all four row IDs were
explicitly present in the proof snapshot.

The causal chain was:

1. A1 legitimately created the canonical name and access-phrase memories.
2. B1's assistant answer flowed back through ordinary extraction, creating a
   lower-confidence differently keyed duplicate.
3. B2 was recognized textually as a correction, but the signal was used only
   for logging; persistence still executed `extract → generic upsert`.
4. The extractor's new key did not match either existing key, so it created a
   Blue Lantern alias instead of invoking `applyMemoryCorrection()` /
   `correctMemoryItem()`.
5. No Silver Orchard alias was superseded. C1 therefore received two stale
   Silver assertions plus the new Blue assertion and led with the stale value.

## Correction-resolution boundary

The correction path now returns a discriminated result:

- `assertion`: preserve ordinary extracted-item upsert behavior.
- `correction`: use only the explicit user-authored old and corrected values
  as authoritative data. Extracted/assistant material is reference context and
  is never ordinary-upserted for that turn.

An explicit correction target must be active, owned by the authenticated user,
inside the current project boundary (or explicitly global), contain the exact
old value named by the user, describe a compatible semantic fact, and include
at least one row actually injected for the turn. Embedding similarity is never
used. Multiple incompatible fact signatures or multiple locked aliases fail
conservatively without writes.

Equivalent key drift is normalized only for structural namespace noise seen in
the reproduction. For an unambiguous group, the strongest existing row is the
canonical target. `applyMemoryCorrection()` preserves correction count,
locking, pinning, confidence, embedding, ownership, and its audit event. Other
equivalent old-value rows are soft-tombstoned with
`delete_reason = superseded_by_correction` and auditable per-alias events.
No row is hard-deleted and no schema/status contract changes.

## Post-response lifecycle

The route no longer launches unmanaged promises. One narrow scheduler
registers telemetry, memory processing, conversation update, and decision
outcome with stable Next.js `after()`. The continuation attempts all four
operations concurrently, contains each failure independently, and emits only
an allowlisted task name plus a bounded diagnostic code. A completed retry
registers nothing.

`after()` extends the Vercel request invocation lifetime so response delivery
does not wait for this work. It is request-lifecycle continuation, not
persistent crash durability. A future durable queue/outbox remains necessary
if work must survive process termination, platform timeout, or catastrophic
invocation loss.

## Live telemetry harness

The privacy audit now uses a strict top-level/proof-snapshot allowlist.
`prompt_tokens` and `completion_tokens` are accepted only as canonical
bounded telemetry schema names; raw `prompt`, `message`, `content`,
authorization, signed-URL, provider-error, and stack fields remain forbidden.
Known private transcript/credential values are checked recursively even inside
otherwise allowed fields. Positive and negative regression fixtures prevent
the former `prompt_tokens` false positive without creating a blanket prompt
exception.

The canonical run produced six of seven expected `trace_logs` rows and six of
seven durable decision outcomes. That request-lifecycle loss is the evidence
for replacing `runBg()`; it must not be represented as a telemetry privacy
failure.
