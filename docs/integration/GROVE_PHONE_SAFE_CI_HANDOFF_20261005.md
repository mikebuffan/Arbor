# Grove phone safe CI handoff — October 5, 2026

This source-only child of PR #243 (`98e69d74a54f8c0c604c43e86fd0430a46fd24b6`) prepares the missing Flutter acceptance run. It does not change production, existing draft heads, hosted settings, model flags, storage grants or private data. The existing broad Arbor CI does not trigger on these draft branch/base names; its test/build commands are reused in a bounded separate job.

## Materially safer environment after rejected local setup

Automatic approval review rejected the earlier local Flutter setup after unexpected cloud metadata access. That local SDK is not rerun. The proposed job uses a disposable GitHub-hosted Ubuntu runner, installs and verifies kernel-level metadata deny rules **before checkout and SDK bootstrap**, removes proxy environment routing, disables AWS metadata discovery and suppresses SDK analytics. Rule-install or rule-verification failure stops the job. Verification inspects rules and does not probe metadata endpoints.

The IPv4 link-local range and Alibaba metadata address are denied, as are IPv6 link-local and unique-local ranges (including AWS IPv6 metadata). These are explicit risk-removal preconditions, not an attempt to ignore the rejection. The job has only `contents: read`, does not request OIDC or repository secrets, does not persist checkout credentials and publishes no APK. No production provider authentication or actual private message is used.

## Exact source and execution scope

- Workflow: `.github/workflows/grove-phone-recovery-ci.yml`.
- Only pull requests targeting `arbor/grove-phone-recovery-20261005` from `arbor/grove-phone-tests-20261005` in `mikebuffan/Arbor` may run this job.
- Flutter tag `3.47.6`, checked against exact upstream commit `5fc346839b5d0eef006ed8404392afb4dfae428d` after checkout. No moving stable selector.
- Checkout action pinned to `11d5960a326750d5838078e36cf38b85af677262` (verified v4 ref).
- Locked dependency resolution; reject lockfile drift; full source analyzer; four focused recovery/client test files; complete existing Flutter regression suite; Grove Android debug compilation with fake key and `.invalid` API origin. New-conversation preview remains false.
- Both Vercel config scopes skip this new source branch, preserving earlier repair skips and the approved mobile branch policy. Executable isolation checks pass.

## Local verification and remaining proof

YAML parsing, shell syntax, read-only scope and guard ordering checks pass. A fake `sudo` command exercises both successful rule verification and immediate failure: failure exits before bootstrap, with no real firewall mutation or network probe. Two deployment-isolation tests pass. These are source checks, not remote firewall, Flutter or device proof.

The acceptance run must show successful metadata rule verification, pinned SDK/version, unchanged lockfile, analyzer, focused tests, full tests and synthetic APK compilation. Record run/job URLs, exact source SHA and test counts. If any stage fails, preserve logs, repair the demonstrated source gap and retry only appropriate failed checks. An APK built against `.invalid` hosts is compile evidence, not an owner-installable connected app.

The two earlier handoffs retain all owner/device/private-host/model/memory/checkpoint gates. Real owner-configured installation and inference remain separately authorized. A source CI pass cannot establish real process-kill persistence, scope revocation on deployed services, model behavior, relevant-memory/correction/objective wiring or ARK checkpoint writes.

Primary references consulted: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html ; https://cloud.google.com/compute/docs/metadata/querying-metadata . Addresses are blocked; none is queried.

## First remote setup result

Run `37406249303` rejected the initial workflow before any runner/job started because GitHub treats YAML environment keys case-insensitively; upper/lower proxy variants collided. The source repair clears both variants at runtime using `GITHUB_ENV` instead. YAML parsing alone did not catch this GitHub-specific validation rule. No Flutter checks ran in that rejected run.
