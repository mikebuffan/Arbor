# Evidence Engine torture matrix — 2026-10-06

This is a source-level torture plan. It does not assert facts about any person and does not activate research workers.

| Case | Required behavior |
|---|---|
| same PDF mirrored at 5 URLs | one origin/independence family, never five corroborators |
| article quotes primary record | derivation links article to record; URL difference is not independence |
| two truly separate records | may form two independence groups; still not proof of claim |
| same-name people | identity remains ambiguous until explicit evidence-backed decision |
| nickname / initials / typo | fuzzy score suggests candidates only; never silently merges |
| identity correction | immutable supersession chain preserves old decision and current head |
| association edge | graph records association/proximity only; never upgrades to conduct |
| support + counterevidence | both remain attached to claim; neither disappears in summary |
| conflicting dates | conflict record preserves both evidence sets and uncertainty |
| approximate date vs exact date | approximate window must not be treated as exact timestamp |
| source date vs event date | keep separate; event-after-report anomaly is review candidate |
| failed lead | evidence-bound alternate route within depth/branch ceiling |
| no alternate route | stop explicitly; do not hallucinate a new branch |
| duplicate lead | deterministic dedupe; retry cannot multiply queue |
| worker crash after checkpoint | resume same run/source state; no duplicated hop |
| STOP during hop | no later checkpoint/result may advance after STOP observed |
| stale lease | takeover only after expiry; one current lease owner |
| contradiction | feeds investigation queue/roundabout candidate; not auto-verdict |
| repeated reporting | persistence may rise; independence count does not |
| missing search result | never encoded as fact absence |
| OCR/extraction mismatch | original-page review required before finding promotion |
| private-person data | hold/redaction/privacy gate before sharing |
| corpus blind spot | coverage map says incomplete/unmeasured, never "nothing there" |
| replay recipe | snapshot/query/filter/resolver/code versions reproduce recipe hash |
| changed source bytes | new source version/snapshot; old finding provenance remains immutable |

## Completion semantics
lead found != investigated != corroborated != contradicted != unresolved != closed.
observation != finding. association != conduct. repeated reporting != independent corroboration.
