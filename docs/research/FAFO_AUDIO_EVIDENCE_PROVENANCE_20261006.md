# FAFO audio evidence provenance — 2026-10-06

## Why this exists

ChatGPT added audio uploads on 2026-10-06. That creates a useful new review path for public controlled calls, voicemails, interviews, hearings, or other audio relevant to Operation FAFO.

This source-only contract keeps audio review inside the existing Evidence Engine instead of creating a second research engine.

## Evidence law

- Original audio bytes are the controlling source artifact.
- A transcript is derived evidence from that audio, not an independent source.
- Multiple transcript passes of the same recording never multiply corroboration.
- Transcript text must bind to the original audio source family and a content hash.
- Quote/excerpt use must retain the source audio reference and exact time window.
- Speaker labels are not identities.
- Candidate speaker attribution never silently resolves to a person.
- Resolved speaker identity requires explicit attribution evidence references.
- A transcript correction may supersede another transcript without deleting the earlier derivation.
- Transcription errors, language uncertainty, redaction and inaudibility remain explicit review issues.
- Association/contact remains distinct from conduct.

## Intended FAFO workflow

original public audio → hash/source-family receipt → transcription pass → segment/time binding → speaker-attribution gate → original-audio review → Claim ↔ Evidence ↔ Counterevidence graph → Pattern Hop.

The transcript may improve search/retrieval and expose candidate contradictions, but consequential findings still require inspection against the original audio.

## Scope

Added on an isolated child branch of the green pre-Vercel One Arbor candidate (#286).

No audio file is ingested by this change. No transcription provider is called. No hosted migration, worker, scheduler, deployment, publication, identity inference, or production state is changed.
