# ONE ARBOR isolated Preview fence repair — local verification

Parent: PR #387, c4497e624034f967790f2581a94943c47f598733. No application code, dependencies, live credentials or database changed.

The checked-in Vercel ignore command skipped the review branch regardless of project/environment. The existing test project's dashboard build guard and Production branch tracking were repaired earlier, but repository fencing still prevented the intended isolated Preview.

The sole exception requires all three exact values: VERCEL_ENV=preview; VERCEL_PROJECT_ID=prj_bliWIoBwJ053cXPIBB9uJzpW4PK6; VERCEL_GIT_COMMIT_REF=review/one-arbor-independence-budget-preflight-20261009. This is an eligibility change, not authentication, runtime readiness, database permission or model-spend authority.

Verification: six Node tests pass. They check the exact positive case; production/development/missing environment; public/private/sandbox/missing project; every pre-existing protected branch both without metadata and in production, and all other protected branches in the isolated Preview; unchanged main/production/unlisted-ref behavior outside the isolated project; and skip main/unknown/missing refs inside the isolated project. The source fingerprint gate is updated only for this repair's files. Existing application fingerprints remain unchanged.

Publication can trigger a Preview build and is permitted only after fresh verification of the named isolated project, empty project/shared variables, absent attached storage, Preview classification and login protection. A hosted application flow still requires safely isolated authentication and storage, a verified effective deployment identity, and zero paid calls. Empty project configuration cannot prove /api/chat works. Existing real-data Preview databases are not disposable fixtures.

Current limitations: local code/test verification only; no GitHub CI claim for this patch, no hosted acceptance, no main merge or production deployment. Reversal is a revert of this bounded change; existing project-setting safeguards remain separate.

## Group 01 follow-up, before publication

Vercel documentation confirms repository ignoreCommand overrides the dashboard Ignored Build Step. The first local exception still inherited the original allowance for unlisted refs, including main, inside the isolated project. A new regression reproduced this failure (Preview main exited 1 instead of 0). The isolated project now fails closed for every ref/environment except the exact reviewed Preview. Other projects retain original main/production behavior. No failed version was published.

Fresh browser checks confirm apps/backend root, current review branch classified Preview, parent review branch tracked as Production, empty project and shared variable inventories, System Environment Variables enabled, absent attached storage, Vercel Require Log In/Standard Protection enabled and no automation bypass secret. The current source branch and its parent remain production-fenced.

Read-only effective aliases: firefly-coral.vercel.app points to production main d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef, deployment dpl_27yAaSNKTQYfmZnKrV8Er4nbfPnE. firefly-ark-sandbox.vercel.app points to #322 f4021985b475651284c97aecbc3bdf03123478cc, deployment dpl_3y43Yeao47iKzp8svqgKPSMSpmvC. Neither contains #387. No alias was changed.

Local build attempt stopped at Google Fonts network fetch in this workspace, before route collection. No font code was changed and no identical local retry attempted. Six focused Group 01 source suites passed 41 tests with denied fetch and a noncredential placeholder. This is not hosted authentication/concurrency acceptance.

References: https://vercel.com/docs/project-configuration/vercel-json#ignorecommand ; https://vercel.com/docs/environment-variables/system-environment-variables ; https://vercel.com/docs/cron-jobs/quickstart . Vercel crons execute on production only; the intended Preview must not activate heartbeat scheduling.
