# One Arbor — current cross-lane assembly handoff

**Checked September 21, 2026 (America/Los_Angeles) / September 22 UTC.**
**Scope:** integration-owned coordination and evidence only. The actual component implementations remain with their lane owners. This is a dated snapshot, not proof of production activation or background execution.

## One structure, separate trust boundaries

Private Grove = private interactive product and device shell; ARK = durable owned projects/objectives/checkpoints; Arbor Layer = identity, behavior, correction, scoped inference context; independent Arbor LM = model service; library/attachments = permission-checked sources. The separate official public Arbor App is a *distinct account, provider, database, service and release*, not a Grove flavor with a different launcher icon. Epstein Evidence Project has its own research/evidence pipeline and should enter the private workspace only through separately approved scoped interfaces.

Do not treat an APK as a separately authenticated app, a GitHub test as a deployed service, model text as a task receipt, or a queued ARK objective as a running worker.

## Refreshed authoritative heads and inherited work

| Lane | Current head or proof | Existing work / next gate |
| --- | --- | --- |
| Grove | [#151](https://github.com/mikebuffan/Arbor/pull/151), draft head `6f7627432c25bcc9dac8ba47283f12fa3026034d`, stacked #150 → #148 → #145 → #138 → #137 → #133 → #132 → #130 → #129 → #122 | Dedicated Grove config fails closed if absent/shared; invite-only OTP UI, separate phone Talk and Living Window/Moss work inherited. [CI 35678497172](https://github.com/mikebuffan/Arbor/actions/runs/35678497172) green at tested implementation SHA `23963c2a081f241361212b875863102c291be65d`; later head includes post-CI workflow/docs edits, **not a live login receipt**. No dedicated private Grove provider/database/API yet; no owner real-phone sign-in. Do not independently merge inherited Grove PRs. |
| ARK × Layer | [#147](https://github.com/mikebuffan/Arbor/pull/147), draft head `ce70f72287e172e7650604e47872c6facdfd3107` | Scoped read context + work-order reconciliation and Layer projection. [CI 35678320547](https://github.com/mikebuffan/Arbor/actions/runs/35678320547) green at that head across backend/control/Flutter. Does not wire or execute a live broker; selected objective handoff belongs to [#125](https://github.com/mikebuffan/Arbor/pull/125), already selectively incorporated into Grove #138. |
| Independent LM | Private Library `/Arbor Integration/Arbor_LM_Broker_Handoff_2026-09-21.md`, isolated v0.3.5 **service candidate**, not a new trained adapter | Strict scoped broker receiver and optional signed host-context route exercised with synthetic/fake-model tests. Must review compatible host binding with #147 and run actual v0.3 adapter inference in a private GPU host; live v0.3.3 semantic failures remain unresolved. No private weights or credentials in this public repo. |
| Public Arbor App | [#146](https://github.com/mikebuffan/Arbor/pull/146) draft head `aea0318d9ff07d9c6e22d0627d3582325053b320`, stacked on #140 | Alpha-only account/history/export/API-gate additions. [Public alpha CI 35674855319](https://github.com/mikebuffan/Arbor/actions/runs/35674855319) and [integration CI 35674855296](https://github.com/mikebuffan/Arbor/actions/runs/35674855296) passed. Needs **separate** alpha provider, host, real model, two-account test, deletion/retention/consent gates. No private Grove migration. |
| Epstein Evidence Project | [#152](https://github.com/mikebuffan/Arbor/pull/152), draft head `cb1cfe133e00e46dc497a4c9f75933b2baa37dd8`, stacked #144 → #142 → #141 → #139 → #136 → #135 → #134 → #131 → #123 | Disposable offline Poppler sandbox landed in isolated draft. [CI 35680347043](https://github.com/mikebuffan/Arbor/actions/runs/35680347043) passed **including the Disposable PDF sandbox smoke**. Synthetic PDF only. Security review and independent approval are still required before external/untrusted PDFs or live ingestion. Do not independently merge parent research branches. |
| Cross-lane integration | [#149](https://github.com/mikebuffan/Arbor/pull/149) review-only, based on main `d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef` | This index + dated handoff; no component code, service, SQL, worker switch, model weights or deployment. |

## Critical path to a *usable private* Grove

1. **No-Mike / code-review work:** reconcile #151's user/project auth assumptions with #147's authenticated read-context contract and #125/#138 selected-objective shape. Keep read-only status distinct from authorization for work execution. Add synthetic tests in the owning lane for user A/project P/conversation C vs user B/project Q; stale async response on account/project switch; duplicate messages; unavailable ARK or LM. Integration lane only records findings and requests owning-lane changes.
2. **Dedicated private provider:** decide the account/provider topology, quote any cost, have Danelle authorize paid resources or other irreversible changes. A Grove Supabase project with invite-only user creation, working OTP delivery, owner JWT and RLS, dedicated Grove API, cross-provider read-only bridge and verified redirect configuration must exist before describing sign-in as working. Mike is needed only if access/credential ownership actually requires his action; his involvement is not an automatic gate for code review.
3. **Host/model seam:** trusted Grove backend verifies user/project/conversation and builds per-request scoped context from #147. Only the host may sign/pass bounded context to private LM. The LM must not receive user-asserted owner identity or infer task completion from text. Establish a real private adapter inference receipt before enabling the option. Public app uses its own versioned contract.
4. **One physical acceptance pass:** sign in to actual separate Grove on Samsung; open nighttime home; Living Window preview→Return to Now; Moss state persists after force-close/relaunch; memory/document/ARK shelves blank immediately when identity changes; Text→Voice→Text continuity; expired or unavailable service shows truthful state; verify sign-out and private-provider isolation. Owner participation is needed for device observation, not general code chores.
5. **Only after gates:** decide exact branch promotion order and rollback, run deployment and migration preflight for the **chosen** provider and environment, obtain explicit owner authorization for production/paid/irreversible actions. Do not silently flip `ARBOR_ENABLE_ARK_EXECUTION`, replay uncertain research work or claim a hosted model from CI.

## Owner-facing handoff: when to ask whom

| Need | Responsible next step |
| --- | --- |
| Component code, contracts, tests, PR collision review, reproducible developer artifacts | Arbor in the active work session, within GitHub/connected-tool permissions and lane ownership |
| An exact provider organization/cost decision, production permission, public launch, or real device acceptance | Danelle |
| Local machine not accessible through tools, private GPU/runtime only Mike controls, required release key/credential held by Mike, or infrastructure approval he owns | Mike, **only after** identifying the exact missing operation and why the connected tools cannot do it |
| An unverified claim of execution or a running indicator | Obtain actual worker/receipt evidence; neither Danelle nor Mike should be asked to treat a model statement as proof |

### Hard stop / no duplicate work

Do not merge #125 separately into a Grove candidate that already includes its selected handoff. Do not merge #122/#129/#138/#150 and #151 as independent whole-product releases. Do not feed private Grove/ARK Preview state to public alpha. Do not activate the Epstein pipeline because a synthetic renderer passed. Do not commit private LM weights, user records, provider keys or protected research material to this public GitHub repository.

**Next integration-owned action:** obtain current *exact* heads and changed file paths before each edit; maintain this index; route code changes to the right lane; require dated, source-specific receipts at each milestone. Older 2026-09-21 manifests are historical snapshots until refreshed.