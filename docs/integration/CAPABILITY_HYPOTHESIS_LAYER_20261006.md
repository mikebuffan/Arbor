# Arbor Capability Hypothesis Layer — 2026-10-06

## Decision

Extend the EXISTING Knowledge Vault capability registry.

Do not create a parallel "future capability map."

Current live Firefly state already contains:

- public.arbor_capability_registry
- 9 existing capability records
- operational current_state values such as available / experimental / unavailable
- prerequisites, boundaries, verification, and last_verified_at

This layer keeps operational availability separate from epistemic maturity.

## Two independent questions

1. Can Arbor use this capability right now?
   -> current_state

2. How far has this capability/hypothesis actually been proven?
   -> lifecycle_state + evidence_level

These must not be collapsed.

## Proposed lifecycle

IDEA
HYPOTHESIS
DESIGN
EXPERIMENT
SOURCE-PROVEN
BENCH-PROVEN
LIVE-PROVEN
CORE ARBOR
REJECTED
SUPERSEDED

Promotion requires evidence. Naming code is not proof.

## Shared primitives

The current hypothesis pass repeatedly found:

OBSERVE
INTERPRET
PRESERVE PROVENANCE
COMPARE
MODEL UNCERTAINTY
UPDATE STATE
CHOOSE
ACT
VERIFY
CARRY CONSEQUENCE FORWARD

Future architecture work should look for reuse of these primitives before
creating another named engine.

## First hypothesis families captured in source

- metacognitive self-monitoring
- cognitive-access / Danelle-ese language interpretation
- behavioral-language identity evidence
- multimodal identity assurance
- coercion / duress resistance
- weaponization resistance
- model-independent Arbor identity
- long-horizon scientific reasoning
- disease-mechanism hypothesis discovery
- cross-domain pattern discovery
- research-question generation
- novel hypothesis generation
- causal-model construction
- scientific contradiction hunting
- adversarial self-review
- operational traceability

Every entry contains:
- problem
- lifecycle state
- evidence level
- dependencies
- overlaps
- shared primitives
- supporting evidence
- counterevidence
- unknowns
- next experiment
- falsifier
- risks
- NOT NOW flag

## Important boundaries

- Disease discovery remains IDEA / no evidence. No cure or discovery claim.
- Cognitive-access interpretation and identity recognition may share
  observations but MUST remain separate conclusions.
- Behavioral language can support recognition, never sole authentication.
- Historical independent-LM failures remain counterevidence; model-independent
  identity is not declared proven.
- This work does not apply a hosted database migration.
- This work does not turn hypotheses into a build queue.

## Database proposal

A reviewed source-only migration proposal extends
public.arbor_capability_registry with lifecycle/evidence/hypothesis fields.

It is NOT applied.

Before any future application, the existing 9 live capability records must be
reviewed individually so no legacy "available" capability is silently relabeled
as more proven than the evidence supports.
