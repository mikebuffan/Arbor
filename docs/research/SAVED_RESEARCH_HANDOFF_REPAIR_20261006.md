# Saved manual research → ARK custody repair

Base: combined candidate PR #247, remote `3f35463b5f17e2716243fcf5980b4d15b1879e6d`. Existing research branch through #245 is identical in the research subtree. Checked current open research/handoff PRs and fetched the repository before starting this isolated child. Grove/LM/phone, existing research executors, Pattern Hop, shared branches and live state remain untouched. Do not wholesale merge the inherited stack into main.

## Diagnosed seams

Library is external to Arbor. A GitHub code push cannot repair a Library upload or create an ARK research checkpoint. The earlier twenty-file Run 102 attempt had explicit `transfer_failed` results for every item and no reported commit. The repair used the current supported ordered saving helper and staged exact existing files inside the active conversation workspace. All twenty items succeeded with retained queue/backlog identity and guards (47→48 and 26→27). All five Run 102 artifacts and both updated queue/backlog files were independently recovered byte-for-byte, including the source archive. Underlying cause of the earlier transport failure is not conclusively established: helper refresh and workspace staging changed together. This proves this batch's save/recovery, not a universal provider outage fix. No missing evidence was reconstructed.

Actual source route before repair:

- `SupabaseInvestigationStore.recordEvidencePacket` / `recordReplayRecipe` persist separate proposed research tables. No production callers bridge manual Library files into these methods or an ARK checkpoint.
- `/api/research/document-hops` runs bounded searches over already stored owned pages; it does not read Library or import manual research. Its v6/v7 execution gates remain closed.
- `arbor_pattern_hop_research` and the older Preview research executor search historical project memory. They are not the Epstein document engine.
- Default ARK worker registers agency tools. `research.session.tick` is not registered in this candidate. Older Preview canaries on #215 are separate and must not be rerun.
- Existing generic ARK status projects checkpoint metadata, omitting `state`. It therefore cannot return saved provenance by itself.
- Connected ARK tools observed in this session are read-only; the only visible project is the smoke-test project, not a confirmed Epstein research project. No live Run 102 checkpoint exists in the observed state.

## Bounded repair

`/api/research/saved-handoff` POST calls `recordSavedResearchHandoff` → existing `SupabaseArkStore.enqueueObjective` → exact-objective `runArkWorkerCycle` with a record-only executor → existing lease/sequence-fenced `ark_checkpoint_task` → scoped checkpoint reload → a second finite custody-only settlement. The task and objective complete the **preservation goal**, not the research question. They leave no pending search/ingestion task.

POST defaults off under `ARBOR_ENABLE_SAVED_RESEARCH_HANDOFF`. Fresh authenticated owner, owned project and fresh server-owned `app_metadata.arbor_saved_research_handoff.project_ids` grant are required before privileged access. It accepts a strict bounded JSON envelope, never binary source intake, owner override, arbitrary capability, execution flag or scheduling request. Malformed and oversized envelopes reject. Provider/SQL errors are redacted.

GET requires authentication and an owned project and uses the user client/RLS, without a privileged client or write flag. It reads an exact objective/task checkpoint, validates original task scope and content hash against saved state, and returns the next question. The existing generic read surface is preserved.

Content-derived scoped idempotency keys reuse an existing objective/task for identical envelopes. Repeated completed submissions only reload. Crash after checkpoint but before settlement resumes the same checkpoint once the original lease expires; an active competing lease returns unconfirmed rather than creating another task. Persisted next action must equal the envelope's question. Hash, source URL, identifier, physical-page count and inspected-page description, family overlap, contradictions and uncertainty survive. Source reports/manifests/archives retain detailed original URLs and hashes as referenced Library artifacts. Uncertainty cannot be empty.

Library receipt claims remain explicitly `reported_library_receipt_requires_independent_recovery`. Arbor has no Library credential or independent downloader in this route. It must never convert client-provided IDs/hashes into a verified-save claim. This session's independent recovery receipt is separate from the source API's trust contract. All observations remain `manual_observations_not_misconduct_findings`; association, account activity and blank instruments are not misconduct evidence.

## Verification

- 289 selected research/ARK tests passed with external fetch forbidden. Includes seven host authorization/readback/error tests and three envelope/durable acceptance tests.
- Durable acceptance uses the delivered ARK schema plus existing targeted-objective claim migration in disposable PGlite 0.5.8; actual Run 102 envelope supplied from a local, independently recovered checkpoint, never committed to source control.
- Preserved all 18 source-manifest rows and seven artifact references. Closed/reopened database, recovered exact next H151 question, repeated identical submission without another checkpoint or claim, denied foreign ownership and foreign RLS reads, and rejected tampered next action. Simulated failed settlement, refused retry during its active lease, then recovered the same checkpoint after lease expiry and database reopen. Separate later worker invocation claimed zero completed tasks. Custody completion remains `researchCompletionVerified:false`.
- Run the durable case explicitly with `ARBOR_PGLITE_MODULE` pointing to separately installed pinned PGlite 0.5.8; `ARBOR_HANDOFF_FIXTURE` optionally supplies the operator's envelope. Without the module, the database case is skipped, never counted as passed.
- Backend TypeScript and optimized app build passed using CI placeholder credentials. Actual local built-host unauthenticated GET and POST returned 401/no-store. Authenticated host cases use mocks; source persistence acceptance uses the actual delivered SQL. Live authenticated HTTP/PostgREST acceptance remains unverified.

No live schema, grants, flags, ingestion, worker, scheduler, model inference or publication changed. Both Vercel config scopes skip automatic deployment of this isolated branch.

## Remaining human/live work

Maintainer reconciles this bounded source child into the reviewed candidate. Administrator chooses the actual owned research project, checks existing ARK schema/RLS and targeted claim RPC, enables only the manual handoff flag and its explicit project grant, then deploys the reviewed source. No research v6/v7 execution gate needs to open for custody preservation. Do not grant general execution or start ingestion.

In that separately scoped live acceptance, submit the saved Run 102 envelope, read its confirmed checkpoint through GET after a fresh process/session, retry unchanged content and verify one checkpoint/no additional claim. Record installed source/runtime version, owner/project, objective/task, handoff digest and recovered H151 question. Until then, source and disposable persistence are verified; deployment and live ARK acceptance remain blocked. A future MCP submission/read tool and Library-to-owned-document corpus connection remain separate work; this repair neither installs them nor duplicates the research engine.
