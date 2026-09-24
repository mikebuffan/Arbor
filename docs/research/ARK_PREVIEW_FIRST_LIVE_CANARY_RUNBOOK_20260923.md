# ARK Preview: first genuine one-shot canary — operator runbook

**Purpose:** consume ONLY the existing synthetic `canary.read` smoke task in **ARK Preview**, using the real `SupabaseArkStore` and `runArkWorkerCycle`; independently read back task result and objective completion. **Not** a research PDF run, not a scheduler, not production.

**Source:** draft research PR #212, branch `feature/research-offline-pdf-batch-pilot-20260923`. Before running, verify the computer's `git rev-parse HEAD` matches the newest PR head and its exact-head CI run has succeeded; this document deliberately does not pin an outdated SHA. Reference green integration run on prior head `300511a2ef3b8cd74b9feb88a98498fcc45b4f6d`: https://github.com/mikebuffan/Arbor/actions/runs/35940392322. Newer commits must be retested before use.

## Preconditions

- Danelle approves consuming **one** queued synthetic ARK Preview smoke test (not permission to ingest, deploy, change Firefly/Grove, or spend money).
- Trusted operator computer; Node 22, Corepack/pnpm; repo checked out at exact reviewed PR source. Use a separate clone/worktree instead of switching a dirty current branch.
- Supabase **ARK Preview** project's service-role key available from its dashboard, **entered locally only**. Never commit a key, paste it into ChatGPT, or use the Firefly primary project service role.
- Live read-only confirmation via ARK Preview SQL editor that the **ENTIRE ARK Preview database contains exactly one ARK task** (this queued `canary.read` task), `attempt_count=0`, and its objective is queued. Existing `ark_claim_next_task` sweeps expired leases across the entire database even when a specific objective is selected; the canary command now refuses to run if any other task exists. Preview should be isolated from any other work until the live test completes. Privately capture exact owner/project/objective/task UUIDs. Do not put UUIDs in public PR comments.

## Run on Windows PowerShell

From the repo root at the reviewed branch, **first run** `git status --short`, `git branch --show-current`, and `git rev-parse HEAD`. If Mike's working tree contains unfinished work or the branch is different, do not switch/reset/overwrite it: use a separate clean worktree or clone at the reviewed PR head. The local machine must have the current one-shot script; don't execute an older local checkout merely because GitHub CI is green.

```powershell
node --version  # Node 22 recommended
corepack enable
corepack pnpm install --frozen-lockfile
$env:SUPABASE_URL='https://tzbpjbhroxiqftqwatnb.supabase.co'
$env:ARK_PREVIEW_EXPECTED_REF='tzbpjbhroxiqftqwatnb'
$env:ARK_PREVIEW_CANARY_APPROVED='true'
$env:ARK_PREVIEW_OWNER_ID='<exact verified preview owner UUID>'
$env:ARK_PREVIEW_PROJECT_ID='<exact verified smoke project UUID>'
$env:ARK_PREVIEW_OBJECTIVE_ID='<exact verified smoke objective UUID>'
$env:ARK_PREVIEW_TASK_ID='<exact verified canary task UUID>'
$secret=Read-Host 'ARK Preview SERVICE ROLE key (hidden)' -AsSecureString
$env:SUPABASE_SERVICE_ROLE_KEY=[System.Net.NetworkCredential]::new('',$secret).Password
corepack pnpm --filter firefly-backend exec tsx scripts/ark/run-approved-preview-canary.ts
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY,Env:ARK_PREVIEW_CANARY_APPROVED -ErrorAction SilentlyContinue
```

**Never paste the key into any terminal command, screenshot, chat, repository, or console transcript.** The script prints only counts/status/receiptVerified and redacts unexpected errors.

## Expected receipt and independent verification

`{"claimed":1,"completed":1,"verifiedObjectives":1,"taskStatus":"completed","objectiveStatus":"completed","receiptVerified":true}`

Then independently read ARK Preview tables (not from the same CLI output) and confirm exactly one task completed/attempted, null lease owner, actual stored canary result, objective completed with evidence and relevant events. A missing, queued, failed, blocked, or ambiguous state is **not** proof ARK is live.

Do NOT rerun a failed/partial attempt blindly: if task is running, leased or retried, inspect exact DB state and determine whether it can be safely resumed. This script intentionally rejects a task that was already attempted.

**After this proof:** plan a separate approved deployment of a durable worker/scheduler and the already developed research task resolver/evidence-store integration; this one-shot command alone does not execute after the chat ends.
