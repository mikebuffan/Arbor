# Cross-thread correction recall

Base: self-model host projection PR #219, commit
`210b4c1a58490215fac106bee75dbc47ef023581`.

An existing meaningful conversation previously returned its own runtime state
without reading other conversations. A correction made in another conversation
could therefore disappear when returning to the older thread. Separately, a
fresh empty conversation could obscure the meaningful context behind it.

Runtime hydration now reads at most 50 recent snapshots for the authenticated
owner and project. It preserves an existing meaningful thread's goal, turns,
channel, subsystem, pending self-update, and timestamps while merging correction
families from that scoped window. Empty threads can recover the newest meaningful
snapshot in the window. Both the row envelope and its inner state must match
the requested owner/project/conversation identity; mismatches fail closed.

Snapshot merging differs from new feedback: copies of the same persisted
correction do not add occurrences. The largest stored count is retained as a
lower bound because snapshots do not carry per-observation IDs. New feedback
still uses the existing occurrence-counting path. Correction timestamps are
compared chronologically, including ISO offsets.

Related fixes:

- A newer host correction with the same family ID replaces the older calibration;
  stale or repeated copies are ignored and the host timestamp cannot move backward.
- An explicitly null goal at session startup clears the saved goal. Omitting the
  field still resumes it.
- Tentative behavioral self-updates remain in prompt guard requirements across
  task changes, consistent with runtime persistence. They remain tentative.
- The memory isolation test now mocks embedding failure at the provider actually
  used by retrieval, keeping the fallback test independent of network access.

Limitations: this is bounded recall, not exhaustive lifetime correction recovery
or a transactional cross-thread event ledger. Old corrections outside the window
must already be carried in a recent snapshot to be recovered. Concurrent runtime
upserts still use the existing persistence contract. This does not apply schema
migrations, connect Grove accounts, deploy a host, enable ARK, or change ChatGPT's
own runtime. Branch deployments are explicitly disabled in both Vercel configs.

Acceptance covers restored newer corrections, repeated hydration without count
inflation, empty-thread fallback, persisted scope mismatch, goal clearing, host
correction supersession, acoustic separation, and cross-task tentative updates.
