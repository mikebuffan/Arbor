// Read-only GitHub CI receipt discovery for the existing One Arbor unlock review.
// Branch/commit/task bindings are reviewed data, NOT completion or authority.
// No untrusted PR source is executed by this script.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findUnlockReviews, validateUnlockView } from "./one-arbor-unlock-review.mjs";

const OWNER = "mikebuffan";
const REPO = "Arbor";
const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const SHA = /^[a-f0-9]{40}$/;
const TASK = /^[A-G][0-9]{2}$/;
const BRANCH = /^(?:fix|review|test|integration)\/[a-z0-9][a-z0-9._\/-]{0,180}$/;
const STEP_SET = new Set([
  "Verify 223 retained source fingerprints",
  "Verify review branch can never trigger Vercel build",
  "Verify identity issuer negative and positive controls",
  "Type-check existing backend",
  "Full backend regression",
  "Production backend build",
]);
function fail(message) { throw Error("one_arbor_github_receipt:" + message); }
function plain(x) { return x !== null && typeof x === "object" && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype; }

export function validateRunBindings(view, document) {
  const ids = validateUnlockView(view);
  if (!plain(document) || document.schemaVersion !== 1 ||
      document.kind !== "trusted-source-repair-review-bindings" ||
      document.repository !== `${OWNER}/${REPO}` || !Array.isArray(document.bindings)) fail("invalid_bindings");
  const unique = new Set();
  for (const x of document.bindings) {
    if (!plain(x) || !BRANCH.test(x.branch) ||
        !SHA.test(x.headSha) || x.stage !== "source_verified" ||
        typeof x.workflow !== "string" || !x.workflow.trim() ||
        typeof x.job !== "string" || !x.job.trim() ||
        !Array.isArray(x.taskIds) || x.taskIds.length < 1 ||
        !Array.isArray(x.requiredSteps) || x.requiredSteps.length < 1 ||
        x.requiredSteps.some(s => !STEP_SET.has(s)) ||
        new Set(x.requiredSteps).size !== x.requiredSteps.length ||
        x.taskIds.some(id => !ids.has(id)) ||
        new Set(x.taskIds).size !== x.taskIds.length) fail("invalid_task_binding");
    if (!x.requiredSteps.includes("Full backend regression") ||
        !x.requiredSteps.includes("Type-check existing backend") ||
        !x.requiredSteps.includes("Production backend build")) fail("incomplete_source_acceptance_gate");
    const key = x.branch + ":" + x.headSha;
    if (unique.has(key)) fail("duplicate_source_binding");
    unique.add(key);
  }
  return document.bindings;
}

function verifiedRun(item, binding) {
  return plain(item) && Number.isSafeInteger(item.id) && item.id > 0 &&
    item.status === "completed" && item.conclusion === "success" &&
    item.event === "push" && item.head_branch === binding.branch &&
    item.head_sha === binding.headSha && item.name === binding.workflow &&
    item.repository?.full_name === `${OWNER}/${REPO}` &&
    item.html_url === `https://github.com/${OWNER}/${REPO}/actions/runs/${item.id}`;
}
function verifiedJob(response, binding) {
  if (!plain(response) || !Array.isArray(response.jobs)) return false;
  return response.jobs.some(job => job?.name === binding.job &&
    job.status === "completed" && job.conclusion === "success" &&
    Array.isArray(job.steps) &&
    binding.requiredSteps.every(step => job.steps.some(s =>
      s.name === step && s.status === "completed" && s.conclusion === "success")));
}

export async function discoverVerifiedUnlockReviews(view, document, getJson, options = {}) {
  const bindings = validateRunBindings(view, document);
  if (typeof getJson !== "function") fail("missing_github_reader");
  const events = [];
  const missing = [];
  for (const binding of bindings) {
    const query = `?branch=${encodeURIComponent(binding.branch)}&event=push&per_page=100`;
    const data = await getJson(BASE + "/actions/runs" + query);
    if (!plain(data) || !Array.isArray(data.workflow_runs)) fail("invalid_github_run_response");
    const matches = data.workflow_runs.filter(run => verifiedRun(run, binding))
      .sort((a,b)=>b.id-a.id);
    let confirmed = null;
    for (const run of matches) {
      const jobs = await getJson(BASE + `/actions/runs/${run.id}/jobs?per_page=100`);
      if (verifiedJob(jobs, binding)) { confirmed = run; break; }
    }
    if (!confirmed) {
      missing.push({branch:binding.branch,headSha:binding.headSha,reason:"no_verified_exact_head_run"});
      continue;
    }
    for (const taskId of binding.taskIds) {
      events.push({
        taskId, stage:"source_verified", outcome:"verified",
        receipt:confirmed.html_url,
      });
    }
  }
  const review = findUnlockReviews(view, events, options.processedEventKeys ?? []);
  return {
    kind:"github_verified_reassessment_only",
    source:"github_actions_api_read_only",
    checkedBindings:bindings.length,
    verifiedReceiptEvents:events.length,
    notYetVerified:missing,
    review,
  };
}

export async function githubReadOnlyJson(url, token) {
  if (typeof token !== "string" || !token.trim()) fail("missing_read_only_github_token");
  if (!url.startsWith(BASE + "/actions/runs")) fail("unexpected_github_endpoint");
  const response = await fetch(url, {
    headers:{
      Authorization:`Bearer ${token}`,
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
    },
    signal:AbortSignal.timeout(15000),
  });
  if (!response.ok) fail("github_status_" + response.status);
  return response.json();
}

const script = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === script) {
  try {
    const root = resolve(dirname(script), "../..");
    const view = JSON.parse(readFileSync(resolve(root,"docs/integration/ONE_ARBOR_97_UNLOCK_REVIEW_VIEW_20261009.json"),"utf8"));
    const bindings = JSON.parse(readFileSync(resolve(root,"docs/integration/ONE_ARBOR_GITHUB_SOURCE_RECEIPT_BINDINGS_20261009.json"),"utf8"));
    const result = await discoverVerifiedUnlockReviews(view,bindings,
      url => githubReadOnlyJson(url, process.env.GITHUB_TOKEN));
    process.stdout.write(JSON.stringify(result,null,2)+"\n");
  } catch(error) {
    // No token, response body or GitHub account data is logged.
    process.stderr.write(String(error)+"\n");
    process.exitCode = 1;
  }
}
