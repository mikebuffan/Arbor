# Shared Operational Receipt Envelope — Source-Only Design

## Why this exists

Arbor already has several kinds of evidence that function like receipts:

- ARK checkpoints and completion evidence
- agency completion receipts / verification
- research provenance and source-family evidence
- durable corrections and supersession
- authorization / security decisions

Those systems should remain the owners of their domain state.

This source-only envelope provides a SMALL COMMON VIEW of an operation so
different subsystems can answer:

- what operation was attempted?
- what scope did it belong to?
- what authority state applied?
- what evidence supports the result?
- what result state was recorded?
- did this receipt supersede an older receipt?
- was an idempotency key involved?

It is an interoperability contract, not a new event log or persistence engine.

## Explicit non-goals

The envelope does NOT contain:

- chain-of-thought
- hidden model reasoning
- arbitrary `detail: Record<string, unknown>`
- raw prompts
- raw document bodies
- biometric templates
- passkey secrets
- raw security-factor diagnostics
- tool credentials

Reason text is intentionally limited to a compact machine-readable
`reasonCode`.

## Domain ownership stays where it already is

Examples:

- ARK remains canonical for task/checkpoint/objective state.
- agency remains canonical for action completion verification.
- Evidence Engine remains canonical for claim/evidence/source-family logic.
- correction machinery remains canonical for correction validity/supersession.
- Identity Assurance remains canonical for trust/authorization state.

A future adapter may PROJECT those domain records into this envelope. The
envelope must not become a second source of truth.

## No persistence added

This lane introduces no table, migration, write route, telemetry sink, or live
integration.

Before persistence is considered, perform a duplication audit against:
- existing ARK events/checkpoints
- decision_outcomes
- trace_logs
- Arbor control-backend audit events
- research evidence receipts

If one existing durable event stream can carry the envelope safely, reuse it.
