# One Arbor Canonical State Ownership Matrix — 2026-10-06

Companion to:
ONE_ARBOR_DUPLICATION_SIMPLIFICATION_AUDIT_20261006.md

Purpose: answer one question for every important state class:

Who owns the canonical truth, and who only projects or consumes it?

This is a source-only architecture decision aid. It does not migrate data,
change runtime behavior, or declare stale copies safe to delete.

| State / concept | Canonical owner | Durable / recovery owner | Legitimate consumers / projections | Explicitly NOT an owner | Reconciliation rule |
|---|---|---|---|---|---|
| Raw current user message | canonical chat message record / current request input | canonical conversation message persistence | prompt builder, cognitive access, reference resolution, continuity | reconstructed accessibility text, model paraphrase | raw wording always survives; interpretations remain derived |
| Cognitive-access working interpretation | cognitive-access decision for the current turn | none by default | contextual reference resolver, prompt context if later authorized | identity assurance, raw message store | derived interpretation may assist understanding but never replace source text |
| Contextual referent for a short turn | contextual-reference resolution result for the current turn | bounded receipt only if later needed | prompt/agency routing | cognitive-access layer, identity assurance | resolve only against bounded context; high-consequence ambiguity clarifies |
| Current conversation goal | One Arbor runtime / continuity state at conversation horizon | conversation runtime state | behavior projection, agency planning, UI | archive cursor, Annabelle editorial checkpoint | one current conversation goal per scoped conversation; execution objectives may reference it but do not rewrite it silently |
| Agency unresolved work | agency state / objective execution layer | agency checkpoint/session persistence | continuity projection, UI, completion verifier | conversational memory inference | execution work closes only with verified completion/blocker/cancel semantics |
| ARK objective/task/checkpoint state | ARK store/state machine | ARK objective/task/checkpoint/event persistence | Environment, Grove, read model, agency bridge | generic audit log, model narration | ARK status changes only through ARK contracts; projections cannot manufacture completion |
| Archive import position | resumable archive transport checkpoint | private archive checkpoint + exact destination verification | import coordinator | conversational continuity, ARK checkpoint | cursor proves source transport position only; never proves semantic reading/analysis |
| Historical archive row | historical conversation archive store | original imported source identity + row provenance | retrieval, archaeology, memory research | current chat model context | historical text is reference evidence; cannot authorize or supersede current corrections |
| Active corrections | canonical runtime correction resolution / precedence logic | durable correction persistence where explicitly authorized | behavior projection, continuity, self-model update logic | generic retrieved memories, task overlays | newest valid explicit correction outranks conflicting older behavior; persistence must reconstruct one active set |
| Stable self-model pattern | self-model evidence/preservation pipeline | self-model ledger + preservation decision | personality/behavior projection | one-off task prompt, mood, humor policy | preserve only evidence-backed/currently accepted patterns; held hypotheses cannot silently become identity |
| Core behavior invariant | One Arbor behavior contract / canonical invariant source | source-controlled behavior contract | text, voice, Annabelle projections | model weights alone, project overlay | overlays may specialize delivery but cannot replace invariants |
| Conversation calibration | conversation-calibration source | source-controlled calibration examples/rules | behavior projection | memory of a single conversation, humor generator | calibration informs mechanism/rhythm, never current facts or mandatory wording |
| Humor preference evidence | self-model + negative-space evidence | self-model ledgers/patterns | humor pragmatics, behavior projection, Voice | persona humorLevel alone | preference evidence defines what fits; pragmatics decides current appropriateness |
| Humor opportunity / placement | pragmatic humor policy for current turn | none by default | behavior/prompt projection | self-model ledger, user mood alone | context can suppress/limit humor; it cannot rewrite baseline personality |
| Voice acoustic identity | Voice identity/acoustic configuration | source-controlled Voice identity + explicit acoustic corrections | voice renderer/session | text personality, humor policy | acoustic changes do not mutate core behavioral identity |
| Annabelle editorial/canon state | Annabelle workspace/editorial subsystem | Annabelle manuscript/chapter/editorial/checkpoint tables | Annabelle prompt/narrative tools | shared Arbor identity/self-model | persist book-specific state there; shared Arbor identity/corrections are projected in |
| Executable capability | agency/control-backend executable capability registry/tool contracts | source-controlled capability implementation | planner, dispatcher, ARK bridge | Vault capability self-inventory | only executable registry/tool authorization grants callable ability |
| Capability self-inventory | Knowledge Vault capability registry | Firefly Vault | Vault UI, capability hypothesis metadata | executable tool dispatcher | descriptive metadata never grants execution authority |
| Capability hypothesis maturity | capability hypothesis layer / Vault metadata proposal | no hosted write until reviewed | planning, research roadmap, self-observation | ARK scheduler, runtime authority | hypothesis promotion requires evidence; NOT NOW is not queued work |
| Research source identity | research source/provenance contracts | research source/version/evidence store | Pattern Hop, Evidence Engine, review workbench | repeated reports, transcript copies | source family/content identity survives every hop |
| Claim ↔ Evidence ↔ Counterevidence | Evidence Engine graph | research evidence/findings persistence | Pattern Hop, Roundabout, FAFO, reports | audio-specific adapter, model summary | adapters feed graph edges; only Evidence Engine owns claim/evidence structure |
| Audio transcript evidence | audio provenance adapter bound to original audio | original-audio identity + transcript derivation receipt | Evidence Engine bridge | separate audio finding engine | transcripts of one recording stay one source family; transcript != independent corroboration |
| Pattern Hop traversal state | shared Pattern Hop bounded traversal contracts | Pattern Hop run/evidence/edge persistence where active | research domain lenses, Evidence Engine, ARK handoff | domain-specific second hop engines | domain adapters may propose candidates but do not reimplement traversal ownership |
| Authorization for a sensitive action | product auth/ownership + applicable Identity Assurance decision + explicit tool boundary | existing auth/session/grant sources; Identity Assurance remains source-only until live review | agency/tool/ARK/Grove action boundary | prompt text, behavioral style alone, Vault metadata | content can request authority; authenticated evidence and scoped policy grant it |
| Identity recognition evidence | Identity Assurance | none live yet beyond approved evidence sources | future authorization risk/step-up policy | cognitive-access interpretation | behavioral language may recognize only; never independently verify/elevate |
| Grove private grants | Grove private host authorization tables/contracts | Grove private grant persistence | Grove host routes | public Arbor app, Firefly Vault inventory | private owner/project grants never leak across product boundary |
| Public Arbor app authorization | public app auth/ownership contracts | public app auth/session stores | public app routes | Grove private grants | shared libraries do not imply shared permissions |
| Checkpoint receipt | owning domain (ARK/agency/archive/Annabelle/etc.) | that domain's checkpoint persistence | Environment/UI, operational receipt projection | generic audit event | checkpoint means recoverable state in that domain only |
| Completion evidence | owning execution domain + verifier | domain completion record/receipt | UI, operational receipt projection | assistant status text, elapsed time | complete only with persisted/verified evidence appropriate to the domain |
| Operational receipt projection | shared operational receipt envelope (#298) | none added yet | cross-subsystem audit/read views | second durable truth store | project canonical domain records into envelope; do not persist a parallel mutable truth |
| Diagnostic audit event | control/backend audit sink or existing logs | existing audit/trace store | diagnostics, observability | completion verifier | event occurrence is not proof of successful effect |
| Security restriction public message | Identity Assurance restricted-mode projection | protected security decision source when live | user-facing response | raw factor diagnostics | disclose outcome, not which factor failed or whether duress triggered it |

## Ownership collision rules

1. A projection cannot write back merely because it can render a value.
2. A derived interpretation cannot replace its source evidence.
3. A descriptive registry cannot grant execution authority.
4. A log event cannot prove completion.
5. A checkpoint in one horizon cannot stand in for another horizon.
6. A model output cannot promote itself into durable identity or authority.
7. A sibling product's authorization does not cross a product boundary.
8. New adapters should carry canonical IDs/refs rather than copy whole mutable objects.
9. Supersession should point backward to what it replaces; do not erase provenance.
10. If two layers both claim edit authority over the same field, stop integration and resolve ownership before merge.

## Highest-priority future ownership audits

These are not authorized migrations or refactors yet.

1. currentGoal
   - confirm conversation runtime is canonical
   - identify every persisted duplicate and whether it is projection or stale copy

2. unresolvedWork
   - distinguish conversation open loops from executable agency/ARK work
   - prevent one list from silently clearing the other

3. active corrections
   - verify durable readback reconstructs one canonical active correction set
   - ensure memory copies cannot outvote newer explicit correction state

4. last verified action/result
   - decide whether agency/ARK domain receipt or operational receipt projection
     is the canonical read path

5. behavior rules
   - classify each rule as invariant / self-model / correction /
     conversation-calibration / task-mode overlay
   - eliminate independently editable duplicates only after classification

## Integration acceptance question

Before any successor One Arbor head is declared canonical, every new stateful
module should be able to answer:

- What state do you own?
- What state do you only read?
- What durable source restores your state after restart?
- What can supersede it?
- What evidence proves a write succeeded?
- What are you explicitly forbidden to authorize?

If a module cannot answer those questions, it is not ready to become a new
canonical state owner.
