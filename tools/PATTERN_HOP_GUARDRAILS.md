# Pattern Hop Guardrails (standalone)

This directory contains **additive, non-runtime research helpers** for evaluating candidate people/relationship pattern hops.

## Current boundary

These helpers are intentionally **not imported by the Arbor app, ARK runtime, workers, canaries, Supabase code, or deployment configuration**.

They are a proof layer only. Integration should happen later, after ownership and acceptance review.

## What is implemented

- Evidence ladder: co-mention → indirect relay → direct communication → acknowledged receipt → instruction/approval → documented action → independently observable consequence.
- Source-family deduplication so copies, forwards, and reports from one underlying source do not count as independent corroboration.
- Conservative identity-resolution gate with explicit conflicts and unresolved fields.
- Contradiction detection that preserves both claims and their provenance.
- Reverse-hop gap detection from consequence back toward decision/receipt.
- Claim-state validation that prevents unsupported promotion from planned, requested, scheduled, or approved to completed/verified.
- Combined non-mutating evaluation helper.

## Safety properties

- No network access.
- No database access.
- No private or victim-identifying fixtures.
- No writes outside caller-owned Python objects.
- No automatic truth resolution.
- No silent identity merging.
- No automatic elevation of evidence state.
- No runtime integration.

## Tests

Run from the repository root:

```bash
python -m unittest -v tools.tests.test_pattern_hop_guardrails
```

The fixtures are synthetic and intentionally use fake people, institutions, records, dates, travel events, and decisions.
