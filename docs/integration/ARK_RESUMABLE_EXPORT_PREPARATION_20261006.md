# Resumable export transport preparation

Source preparation only. No live import, remote-source access grant, ARK task, worker activation, deployment or memory extraction was performed. This extends the existing normalized ChatGPT parser and preflight; it does not replace Pattern Hop, Grove or an existing engine.

## Prepared path

`scripts/import_chatgpt/resumableArchive.ts` binds source filenames, byte counts, exact SHA-256 hashes, parser version, destination owner/project, batch limits, normalized messages and each batch hash to one manifest fingerprint. The private generated manifest contains batch coverage and hashes, not conversation bodies. It must not be committed publicly. Source path relocation is allowed with identical filenames/bytes; duplicate basenames are rejected as ambiguous.

The builder validates whole source JSON with the existing preflight before parsing. It retains normalized source/thread/message IDs, positions, role, full normalized content and timestamps. Identical source turns are deduplicated; changed turns, conflicting source positions and message IDs reused across threads reject preparation. Ordering uses time ascending, missing time last, then source thread and original position. Limits constrain count and serialized bytes; a single message beyond the byte cap remains whole and is explicitly flagged, not clipped. A future transport must handle or reject those flagged batches honestly.

The write-free CLI creates a new private local manifest exclusively (`wx`); it loads no environment files or credentials and invokes no models. Run from apps/backend:

```text
node --import tsx scripts/import_chatgpt/archive-plan-cli.mts <new-manifest.json> <user-uuid> <project-uuid> <export.json> [...]
```

The transport coordinator reconstructs the plan from current original bytes before accepting a checkpoint. It re-verifies all previously completed batches against the destination, copies only the next bounded batches, verifies exact destination contents, then saves the checkpoint. A destination success followed by checkpoint failure retries the same exact batch. The injected transport must atomically reject conflicts and preserve exact repeats; this is a required adapter contract, not an implemented or verified live SQL adapter. The legacy overwriting archive upsert is deliberately not used.

Checkpoint persistence writes a private temporary file, fsyncs it, renames it atomically and fsyncs the directory. Missing checkpoint means a new run; corrupt or unreadable state fails. Checkpoint offsets are bound to the full plan and are never proof of reading or analysis.

## Verification

- 729 backend tests passed in 131 files; TypeScript passed. This script-only addition did not require repeating the prior successful application production build.
- Tests cover exact duplicate/conflict handling, cross-thread ID collisions, original positions, long text, changed source bytes/manifest/target, post-copy checkpoint failure, failed writes/readback, forged coverage, destination conflict preservation and atomic checkpoint persistence.
- A private full-source rehearsal rebuilt both authorized exports, prepared 59,909 normalized messages in 662 batches, interrupted after the first 100-message destination batch before checkpoint save, then resumed to completion. Destination count and insert count remained 59,909, with 100 exact replayed messages. A completed restart verified all rows again, yielding 119,918 full-field hash comparisons over the two runs. No oversized single messages occurred; maximum batch JSON was 262,105 bytes.
- The rehearsal destination was an in-memory hash map. It proves normalization, plan coverage and coordinator behavior, not database transaction isolation, live SQL correctness, remote file delivery or ARK execution.

## Scope and remaining integration

Coverage is exactly the existing parser's normalized active-branch user/assistant messages in the two authorized export files. It excludes system/tool messages, empty parts, inactive branches and media bytes; structured descriptors can be serialized. It is not every possible conversation ever exported and not an unchanged byte-for-byte copy of whitespace-trimmed message parts. Original export files remain intact.

The next live prerequisite is the existing guarded archive transport adapted to `VerifiedArchiveTransport`, including actual owner/project authorization, both deployed uniqueness contracts, atomic conflict rejection and exact readback. Then make the verified source files available to that transport, run a bounded destination rehearsal against the intended preview project, and only afterward expand import coverage. Preserve the existing six trial rows and reject conflicts. Reader deployment, scoped submission and worker activation remain separate steps; transport completion must never be presented as developmental reading completion.
