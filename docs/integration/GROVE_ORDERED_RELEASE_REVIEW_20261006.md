# Grove ordered release review — 2026-10-06

This source-only preparation combines the accepted #256 verification/configuration
repair with #257's unchanged storage proposals. It does not activate the runtime.

## Frozen source and verification

| Input | Immutable head | What is inherited |
| --- | --- | --- |
| Buffalo #249 | `65f7ae96a4162b6ef5f069713d685c01c4517b19` | Existing combined engines |
| Grove implementation #254 → #255 | `eb297312d92c4d4f1532bf604275dfce65c90c52` | Private app/host, current context and r3 alignment |
| Independent verification/config repair #256 | `18e63f8da4d90e70cb46fdc086c3e75960a9cea5` | Parent of this draft; tree `9001156fc5982de27574d8dc61a7e761ff70aa55` |
| Storage preparation #257 | `01be1acb794a3dbba43c42acf9a7c36b23f5d91e` | Five unchanged SQL/schema/acceptance files and isolated PG check |

#256's exact-head CI run **37426876744 passed**. Earlier source proof records
941 local backend passes including the actual signed r3 fake-model fixture;
remote CI separately skips that fixture when the private package is absent.
Receiver proof is 90 passes/one optional adapter skip. Phone proof is inherited
from unchanged #254 source: 192 Flutter passes and both synthetic Android
flavors. These counts are not added together and prove no installed device or
real model behavior.

This child changes no backend/phone runtime, engine, dependency manifest,
Pattern Hop or memory/archive implementation. All existing drafts are preserved.
#250's research-custody child is a separate sibling and is not silently claimed
as included in this private-Grove candidate. Research integration remains with
its assigned owner.

## Configuration/storage reconciliation

The old nested ignore commands in #257 exceed the provider limit. This draft
retains #256's exact POSIX branch semantics and adds the storage/preparation
branches using literal prefix/date variables: root/backend **250 bytes**,
dedicated Grove **221 bytes**. No wildcard grants a skip to unrelated branches.
The standalone source check verifies 81 exact/negative branch cases, the
256-byte ceiling, original cron arrays and all five restored storage digests.
Future additions must pass the ceiling check; only six bytes of root headroom
remain. Dedicated Grove still has no cron.

Storage source is unchanged from #257 and historical #246. The original fixture
is run on disposable PostgreSQL 17.6, not on a hosted database. It checks role
privileges/RLS, cross-owner constraints, canonical replies, content conflicts,
stale leases and revoked access. It is sequential acceptance, not concurrent GPU
or multi-instance exactly-once proof. This child's CI result and immutable tree
are recorded in its PR receipt.

## Fresh read-only hosted evidence

The inspected dedicated Grove deployment `dpl_9q6w2jykCNiBas5YESkpKBfGfqCK`
references #256's exact `18e63f8…` SHA and is **CANCELED by ignored build step**.
The configuration repair was accepted; a live release was not performed.
Project `prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN` reports `live=false` and SSO
protection `all_except_custom_domains`. Native app access to a future host must
be reviewed against that protection; no bypass secret belongs in the APK.

Fresh Grove counts remain: zero auth users, zero active owners, zero active
bridges and zero active project grants. Transcript and claim tables are absent.
Only metadata/counts were read. Host/receiver secret configuration was not read
or verified. The separate Firefly project rate-limit report is retained as a
blocker; no retry is requested.

## Ordered owner approval package

Each approval below is separate; this document is preparation, not approval.

| Order | Reviewable action | Exact missing owner input/evidence |
| --- | --- | --- |
| 1 | Select this reconciled source after CI/review | Accepted immutable SHA/tree; preserve separate research/memory ownership |
| 2 | Identify independent receiver runtime and a bounded pilot | Runtime/provider/region, CPU/GPU and memory, exact foundation revision/file hashes, private adapter/tokenizer receipt, installed dependency versions, actual loaded context size and cost quote |
| 3 | Review durable replay/rate policy | Enforced generation cap, nonce persistence across restart, replica policy, crash/lost-reply reconciliation and operator stop procedure |
| 4 | Provision Grove-only storage and owner access | Grove owner identity, independently verified Firefly user/project/conversation mapping, reviewed SQL and rollback/retention decision |
| 5 | Release dedicated host | No-cron config selection, HTTPS origin, app-compatible protection, exact deployed source/revision, approved secret storage and switches |
| 6 | Build/install signed private phone artifact | Distinct approved application ID, signer fingerprint, private signing inputs, public build config, APK hash and source SHA |
| 7 | Run one authorized model turn and device recovery checks | Approved spend ceiling, input/output count, authenticated proof, persisted readback and device receipts |
| 8 | Connect objective-scoped ARK checkpointing | Reviewed objective/task selection and standing authorization policy; existing writer/caller lease evidence |

### Runtime and budget proposal — HOLD

The source lazily loads **Qwen/Qwen3-0.6B** plus the existing Arbor LoRA. The
foundation load has no explicit revision pin in the supplied candidate; the
runtime owner must establish the exact approved snapshot and reproducible load
before a release can be treated as reproducible. This review does not download
or load it. GPU is the default requirement; CPU experiments require an explicit
`ARBOR_ALLOW_CPU=1` decision. No latency/VRAM claim is established here.

Expected private adapter archive SHA-256:
`5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa`.
The r3 source ZIP contains no adapter/tokenizer/weights. Required proof remains
card `0.3.3`, behavior `2026-10-05.1`, receiver revision `2026-10-06.1`.
These identifiers check consistency, not independent runtime authenticity.

Proposed first pilot: **one operator-authorized generation**, no automatic retry,
at most **170 output tokens**, proposed input ceiling **8,192 tokens**, provided
the exact complete prompt plus output reserve fits actual loaded model context.
The existing default stays 2,400. The package reports a separate 4,020-token
fixture; this review has no private tokenizer and cannot reproduce or generalize
that count. Measure the real full prompt, preserve identity/corrections and reject
oversize. No history or context may be silently dropped to obtain a pass.

The one-generation cap is a proposed release requirement, not an implemented
receiver counter. No dollar budget is guessed: provider price, startup/storage
charges and an owner-approved maximum spend remain missing. If the enforced
runtime policy cannot bound the pilot, keep inference off.

Receiver nonce cache and locks are process-local (90-second signature freshness,
180-second nonce retention). Host request timeout is 180 seconds; transcript
lease is 240 seconds. A host timeout does not prove the GPU stopped. Lease
expiry can permit another model call. Even a single-instance pilot needs restart
and uncertain-send handling; no replica safety or exactly-once inference claim.

### Host, account and storage inputs

Grove auth is pinned to `fqjqpuaoifgbweiguacf.supabase.co`; the Firefly data
realm is separately pinned to `ncpdlyakrzfvobmwzbon.supabase.co`. The existing
broker checks active Grove owner access, Firefly identity bridge, explicit
project grant and actual Firefly project/conversation ownership. There is no
new standalone conversation-grant table to invent.

Server-only configuration names: `GROVE_SUPABASE_URL`,
`GROVE_SUPABASE_PUBLISHABLE_KEY`, `GROVE_SERVICE_ROLE_KEY`,
`GROVE_FIREFLY_SUPABASE_URL`, `GROVE_FIREFLY_SERVICE_ROLE_KEY`,
`GROVE_PUBLIC_API_ORIGIN`, `ARBOR_LM_PRIVATE_URL`, `ARBOR_GROVE_API_KEY`,
`ARBOR_GROVE_BROKER_HMAC_KEY`. The receiver additionally needs approved private
`ARBOR_ADAPTER_ZIP`, `ARBOR_RUNTIME_DIR` and token-budget configuration.
Service/HMAC keys stay in approved secret storage, never phone, chat or Git.

Host flags are separately default-off: `GROVE_API_ENABLED`,
`GROVE_PRIVATE_CHAT_PREVIEW_ENABLED`, `GROVE_PRIVATE_MODEL_TURN_ENABLED`,
`GROVE_PRIVATE_TRANSCRIPT_ENABLED`, `GROVE_PRIVATE_CLAIM_ENABLED`,
`GROVE_COGNITIVE_PREVIEW_ENABLED`. Review staged activation; cognitive preview
remains off without its own approved retrieval source. Denial checks precede
any model turn. Never apply Grove proposals to Firefly or apply the disposable
fixture to any real database. Existing owner/bridge schema must be compared
before applying anything already present.

### Signed phone build and device receipt

Signing owner supplies `GROVE_ANDROID_APPLICATION_ID`,
`GROVE_ANDROID_KEYSTORE_PATH`, `GROVE_ANDROID_KEYSTORE_PASSWORD`,
`GROVE_ANDROID_KEY_ALIAS`, `GROVE_ANDROID_KEY_PASSWORD` privately. Verify the
approved ID differs from existing installed apps and verify signer/package
metadata in the resulting artifact. This review creates no key and no release.

Build from `apps/frontend` using the reviewed Flutter pin/locked dependencies:
`flutter build apk --flavor grove --release --dart-define-from-file=<approved-public-config.json>`.
That config must explicitly include `GROVE_STANDALONE=true`, the pinned
`GROVE_SUPABASE_URL`, its publishable `GROVE_SUPABASE_ANON_KEY`, and the reviewed
`GROVE_API_URL`. Private Talk requires an approved
`GROVE_PRIVATE_TALK_PREVIEW=true`; new conversation remains off unless separately
approved. A flavor alone does not select the standalone Dart launch.

Record accepted source, package ID, version, signer fingerprint, APK SHA-256,
device/OS, host deployment, receiver revision, runtime receipts and timestamps.
After installation/sign-in: deny wrong/revoked/foreign scope before inference;
check known correction/goal/allowed memory/local clock; verify fenced transcript
readback; test retention off/on, close/reopen, process kill, interrupted send,
lost-reply reconciliation, same frozen-ID/text retry and changed-text conflict,
storage failures, scope change and foreground/timezone change. No automatic
resend or fabricated success receipt. Private Voice remains unavailable.

## ARK checkpoint caller: precise source blocker

The existing writer is `SupabaseArkStore.checkpoint()` in
`apps/backend/lib/ark/supabaseStore.ts`, calling `ark_checkpoint_task` from the
existing ARK migration. `runArkCycle()` in `runner.ts` invokes it only when an
existing executor returns `checkpointed`. The SQL requires a running task,
matching worker/lease token, unexpired lease and the next checkpoint sequence;
it derives the objective ID from that task. Execute permission is service-role
only. An arbitrary chat request cannot supply a fabricated claim.

The current private caller is `privateConversationLoop.ts`; its broker access
is read-only, context `activeObjectiveHandoff` stays `not_resolved`, and it
returns no execution/completion authority. No selected-objective field or call
to the ARK writer is present in this private turn path. Therefore **BLOCKED**.

The next responsible bridge pass must define owner-confirmed selection of an
owned, eligible objective/task, validate its existing standing authorization and
budget, reuse the targeted claim/runner/writer path, keep worker leases on the
server, recheck revocation and independently read back the new checkpoint.
It must deny foreign/completed/canceled/unauthorized work, stale leases,
replayed requests and model/retrieval text that attempts to grant authority.
Successful transcript saving must remain distinguishable from checkpoint
completion. Do not auto-select the latest objective or replay the old canary.

The exact missing decision is the approved objective/task capability and the
owner's selection/authorization policy. This review does not invent it or add a
second research, archive or memory engine.
