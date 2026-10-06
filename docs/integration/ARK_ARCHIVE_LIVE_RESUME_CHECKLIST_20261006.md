# Archive live-resume checklist — 2026-10-06

This is preparation only. It performs no hosted write.

Known source plan: 59,909 normalized turns in 662 bounded batches. Preview evidence currently proves the original six trial rows plus exact batch 0, for 106 archive rows. Therefore the intended resume point is batch 1 only after exact destination re-verification.

Before any resumed transport:
- recompute source hashes/fingerprint from the original export inputs;
- require exact owner/project target;
- load checkpoint and require matching fingerprint;
- exact-readback batch 0 from destination; never trust the local offset alone;
- if any source/target/manifest differs, stop rather than adapting silently.

For each remaining batch 1-661:
1. check STOP/abort;
2. construct payload from manifest start/count;
3. exact conflict-aware apply;
4. check STOP/abort;
5. exact destination readback;
6. check STOP/abort;
7. atomically persist next-batch checkpoint;
8. record batch receipt separately from read/analysis state.

On retry after apply/readback/checkpoint failure, retry the same batch. Destination identity is source + source_thread_id + source_message_id; identical replay is idempotent, differing content is a conflict.

Transport completion may claim only transported coverage. It must not claim chronological consumption, developmental analysis or reconciliation.

After all 662 batches exact-verify, independently require 59,909 unique normalized source identities at the intended destination before marking transport complete.
