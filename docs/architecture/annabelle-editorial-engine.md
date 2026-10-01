# Annabelle editorial engine

## Purpose
Extend Arbor's existing Annabelle subsystem with durable, provenance-preserving editorial state for long-form manuscripts. This is not a second identity, memory system, or autonomous writer.

## Invariants
1. Original manuscript versions are immutable references; revisions are new versions.
2. Every literary finding retains manuscript/chapter/source provenance and confidence.
3. Reader reaction and editorial diagnosis remain separate.
4. A one-off pattern cannot become confirmed Annabelle voice.
5. Diagnostic reading does not authorize rewriting.
6. Gold / do-not-touch evidence is retrieved before comparable rewrites.
7. Contradictions are stored, not silently reconciled.
8. Accepted edits create downstream review obligations.
9. Diagnostic, continuous, editing, proof, and voice-integrity passes checkpoint independently.
10. Project scope is the cross-thread carrier; conversation scope is an overlay.
11. Existing ARK/Annabelle ownership and RLS boundaries remain authoritative.
12. ChatGPT MCP stays read-only until a separate write-capability security review.

## Data model
- annabelle_manuscripts: immutable source identity/version metadata.
- annabelle_chapters: stable chapter identity and source hash/locator.
- annabelle_editorial_records: typed evidence/state for reader reaction, voice, canon, characters, relationships, knowledge, timeline, motifs, Gold, problems, decisions, contradictions and impacts.
- annabelle_editorial_checkpoints: resumable per-pass position/state.
- annabelle_editorial_events: immutable audit trail.

The typed record model intentionally avoids an Ever-After-specific schema. Ever After is the first project using the engine, not a special case in Arbor core.

## Ever After acceptance sequence
1. Register finished manuscript as reference and the chosen canonical working version separately.
2. Register all 60 chapters with source hashes and locators.
3. Preserve alternate Chapter One as an alternate source version.
4. Seed only mechanical findings (duplicates/artifacts); do not seed literary verdicts.
5. Diagnostic pass: read a whole chapter, then persist reader reaction and editorial records, then checkpoint.
6. Close/reopen context and retrieve the exact checkpoint and chapter findings before continuing.
7. After 60 diagnostic chapters, run a continuous reader pass.
8. Reconcile provisional judgments.
9. Edit only after problem + provenance + relevant Gold retrieval.
10. Run downstream regression, proof and final Annabelle voice-integrity passes.

## Known preflight findings to verify
- Chapters 4/5: high-overlap version collision.
- Chapters 11/27: high-overlap version collision.
- Chapters 44/45: high-overlap version collision.
- Chapter 54: Master Assembly v2 marker.
These are investigation flags, not automatic deletions.

## Deployment boundary
This checkpoint adds schema/contracts/tests only. It does not apply the migration, enable production, expose MCP writes, ingest the manuscript into production, or merge itself.
