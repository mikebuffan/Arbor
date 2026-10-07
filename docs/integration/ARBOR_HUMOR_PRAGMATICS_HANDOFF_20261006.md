# Arbor Humor / Pragmatics Language Layer — Integration Handoff

Date: 2026-10-06  
Branch: `feature/arbor-humor-pragmatics-20261006`  
Base: `integration/one-arbor-canonical-20261006`  
Status: isolated candidate; **not merged to main or canonical integration**

## Ownership

Humor is a shared ONE ARBOR behavior/pragmatics concern.

It is **not**:
- a second personality system,
- a joke generator,
- an Annabelle-owned narrative engine,
- a numeric `humorLevel` switch,
- durable identity state created from a single user reaction.

Authoritative ownership remains:
1. One Arbor shared behavior projection for behavioral policy.
2. Existing self-model/personality projection for durable identity priors.
3. Existing correction/supersession machinery for user calibration.
4. Existing Voice identity path for acoustic delivery.
5. Annabelle humor naturalism only for narrative-specific dialogue/prose analysis.

## Existing implementation inspected

The integration was built after inspecting:
- `apps/backend/lib/arbor/behavior/behaviorProjection.ts`
- `apps/backend/lib/arbor/selfModel/personalityProjection.ts`
- `apps/backend/lib/arbor/selfModel/conversationCalibration.ts`
- `apps/backend/lib/persona.ts`
- `apps/backend/lib/flow.ts`
- `apps/backend/lib/arbor/voice/identity.ts`
- `apps/arbor-control-backend/src/selfModelProjection.ts`
- `apps/arbor-control-backend/src/selfModelPatterns.ts`
- `apps/arbor-control-backend/src/selfModelLedger.deep.ts`
- `apps/arbor-control-backend/src/selfModelLedger.dislikes.ts`
- `apps/backend/lib/arbor/runtime/corrections.ts`
- `apps/backend/lib/arbor/runtime/correctionPromotion.ts`
- `apps/backend/lib/prompt/buildPromptContext.ts`
- Annabelle finish branch reference:
  `apps/backend/lib/arbor/annabelle/humorNaturalism.ts`
  and `engineCatalog.ts`.

The pre-existing self-model already carries the high-level `earned-humor` preference and negative-space evidence. This change does not duplicate that source of truth; it turns those broad preferences into bounded current-turn pragmatics inside the shared behavior path.

## Shared Humor / Pragmatics contract

New source:
`apps/backend/lib/arbor/behavior/humorPragmatics.ts`

The contract represents these dimensions independently:
- humor opportunity,
- humor suppression,
- maximum intensity,
- relationship permission,
- emotional temperature,
- callback confidence/relevance,
- absurdity relevance,
- teasing safety,
- profanity usefulness,
- technical clarity risk,
- allowed placement/type.

Supported placement/types:
- opening,
- embedded dry observation,
- trailing button,
- callback,
- teasing reply,
- deadpan correction,
- absurd escalation,
- self-directed humor,
- profanity-as-emphasis,
- none.

No assessment ever makes humor mandatory. `humorRequired` is deliberately false.

## Seriousness gate

The current-turn assessment conservatively suppresses or narrows humor around:
- acute danger,
- explicit vulnerability,
- grief/fear/humiliation cues,
- consequential legal/medical/financial facts,
- active user corrections that suppress humor.

Suppression removes the joke opportunity; it does not replace Arbor with a sterile safety/customer-service persona.

## Technical humor

Technical context stays eligible for dry, contextual humor.

When the turn asks for exact:
- error,
- failure,
- status,
- state,
- evidence,
- proof,
- blocker,
- command,
- next action,

technical clarity risk rises and opening humor is withheld. The contract explicitly says humor cannot obscure the substantive answer.

## Callback rules

A callback is only marked `earned` when both:
- remembered-context confidence is strong, and
- relevance/payoff in the current turn is strong.

Otherwise it remains `context-required` or `blocked`.

The prompt contract explicitly forbids callbacks merely to prove memory.

## Teasing / banter

Teasing is:
- `allowed` only with established relationship permission,
- `context-required` when permission is not established,
- `unsafe` in vulnerability/hard-suppression contexts.

The contract distinguishes affectionate teasing/playful challenge from ridicule, contempt, generic snark, or punching at vulnerability.

## Profanity rhythm

Profanity is modeled as:
- discouraged,
- neutral,
- useful.

It is useful only as contextual emphasis/rhythm, such as shared frustration plus an already-playful moment. It is explicitly suppressed by active correction and never treated as personality decoration. The prompt path also counts profanity in the last meaningful Arbor turn; two or more uses suppress profanity emphasis on the next turn so repetition loses force before it becomes filler.

## Legacy persona humorLevel

`PersonaConfig.humorLevel` remains for compatibility, but it is now documented and consumed only as a preference hint.

The old `flow.ts` rule that effectively said `humorLevel >= 2 => playful wording` was removed. Current context now decides whether the humor opportunity exists.

## Correction / supersession

Explicit humor feedback is routed through the existing behavioral correction path into the `humor-pragmatics` family.

Covered examples:
- “that joke was weird”
- “don’t make everything a joke”
- “that was actually funny”
- “more like that”
- “more/less humor”
- “stop doing the gothic thing”
- “don’t tease”
- “too much profanity/swearing”

A single reaction can affect active behavior without becoming permanent identity.

Durable persistence continues to use the existing correction-promotion path and requires explicit durable authorization. The new durable key is:
`behavior.correction.humor-pragmatics`.

No parallel humor memory store was created.

## Text / Voice alignment

Text and Voice call the same shared behavior/pragmatics decision.

Voice adds only an acoustic constraint:
- humor stays contextual rather than performed,
- no exaggerated pause/stress/comic voice to “sell” a punch line,
- ordinary conversational timing.

Acoustic corrections remain separate from behavioral humor corrections.

## Annabelle boundary

Annabelle's `humorNaturalism.ts` remains narrative-specific:
- perfect-banter-ladder risk,
- interruptions/silence,
- earned narrative callbacks.

It informed the shared layer's restraint principles but was not copied into, promoted above, or made owner of Arbor's conversational humor.

## Regression coverage

Focused fixtures cover:
- casual banter,
- technical debugging,
- frustration,
- success,
- mild embarrassment,
- user typo,
- repeated Vercel failures,
- long-running callbacks,
- disagreement,
- serious emotional conversation,
- acute blocker,
- ordinary no-joke question,
- a moment where straightness is the better button.

Every regression fixture explicitly records:
- whether humor has an opportunity,
- maximum intensity,
- emotional temperature,
- callback state,
- teasing safety,
- profanity usefulness,
- technical clarity risk,
- allowed/disallowed placement,
- the invariant that the substantive answer remains primary.

Additional tests cover every placement/type and prove a hard-serious context collapses the allowed set to `none`.

## Blind comparison fixtures

`humorPragmatics.fixtures.ts` contains paired `left` / `right` responses without generic/Arbor labels in evaluator-facing fixture data.

A separate answer key permits evaluation without revealing the intended choice during presentation.

The pairs test recognition from:
- judgment,
- timing,
- restraint,
- specificity,
- preservation of the answer,

rather than catchphrases.

## Negative proofs

The focused suite explicitly covers:
- high `humorLevel` does not make a neutral answer funny,
- no humor is required in any response,
- callbacks are not used without relevance,
- missing relationship permission does not invent teasing permission,
- profanity is not constant,
- active profanity correction suppresses profanity emphasis,
- recent Arbor profanity overuse suppresses profanity emphasis on the next turn,
- serious/acute/consequential contexts suppress humor,
- technical precision survives humor,
- disagreement remains disagreement rather than placating banter,
- active corrections change behavior without one reaction becoming durable identity,
- text and Voice preserve the same humor decision,
- Voice does not become a performer.

## What unit tests can and cannot prove

**Unit tests can prove routing, suppression gates, ownership, correction precedence, text/Voice decision parity, legacy-switch removal, fixture completeness, and structural protection of exact facts/state.**

**Unit tests cannot prove that a particular joke is funny, that its timing feels exactly like Arbor, that a callback feels earned to a human in a live relationship, that teasing lands affectionately, or that a line's rhythm is subjectively right. Those are language-and-relationship judgments. They require blind conversational evaluation and real interaction feedback. Tests can bound the failure modes; they cannot certify taste.**

That subjective boundary is intentional. The target is not “generate jokes.” The target is: know when humor belongs, what kind belongs, how much belongs, where it belongs, and when to leave the damn sentence alone.
