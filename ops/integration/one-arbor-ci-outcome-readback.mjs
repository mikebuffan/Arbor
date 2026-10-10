// ONE ARBOR D10/E09: immutable external software-test evidence readback.
// Read-only GitHub API. This is not a model experiment, decision executor,
// host-authentication substitute, automatic promotion, or new memory engine.
import { fileURLToPath } from "node:url";
import { githubReadOnlyJson } from "./one-arbor-github-run-discovery.mjs";

const REPO = "mikebuffan/Arbor";
const API = "https://api.github.com/repos/" + REPO;
const BRANCH = "test/d10-e09-reviewed-outcome-recommendation-20261010";
const WORKFLOW = "One Arbor verified boundary receipt and chat source acceptance";
export const REVIEWED_CI_PAIR = Object.freeze([
  Object.freeze({id:38062557479,sha:"1f8c058c79cf1019ee417dfd0b0fff95508409f2",kind:"red_focused_regression"}),
  Object.freeze({id:38062786120,sha:"ec1fcb9b01ea7cecf2930906ab5416737fb9a9cd",kind:"green_source_acceptance"}),
]);
const reject = reason => { throw Error("one_arbor_external_outcome:" + reason); };

export async function verifyReviewedCIOutcomePair(getJson) {
  if (typeof getJson !== "function") reject("missing_authenticated_reader");
  const outcomes = [];
  for (const pin of REVIEWED_CI_PAIR) {
    const endpoint = API + "/actions/runs/" + pin.id;
    const run = await getJson(endpoint);
    if (!run || run.id !== pin.id || run.repository?.full_name !== REPO ||
        run.head_sha !== pin.sha || run.head_branch !== BRANCH ||
        run.name !== WORKFLOW || run.event !== "push" ||
        run.status !== "completed" ||
        run.html_url !== "https://github.com/" + REPO + "/actions/runs/" + pin.id)
      reject("untrusted_or_mismatched_run");
    const data = await getJson(endpoint + "/jobs?per_page=100");
    if (!data || !Array.isArray(data.jobs)) reject("invalid_job_readback");
    const job = data.jobs.find(j => j?.name === "identity-security");
    if (!job || job.status !== "completed" || !Array.isArray(job.steps))
      reject("missing_source_job");
    const status = (name, conclusion) =>
      job.steps.some(s => s.name === name &&
        s.status === "completed" && s.conclusion === conclusion);
    if (!status("Verify 223 retained source fingerprints","success") ||
        !status("Verify review branch can never trigger Vercel build","success"))
      reject("missing_source_safety_gates");
    const focused = "Verify identity issuer negative and positive controls";
    if (pin.kind === "red_focused_regression") {
      if (run.conclusion !== "failure" || job.conclusion !== "failure" ||
          !status(focused,"failure")) reject("red_regression_not_verified");
    } else {
      if (run.conclusion !== "success" || job.conclusion !== "success" ||
          ![focused,"Type-check existing backend","Full backend regression",
            "Production backend build"].every(s => status(s,"success")))
        reject("green_acceptance_not_verified");
    }
    outcomes.push({runId:pin.id,sha:pin.sha,status:pin.kind,url:run.html_url});
  }
  return {kind:"external_ci_outcome_readback",source:"authenticated_github_actions_api",
    evidenceClass:"software_test_outcome_only",outcomes,
    realModelDecisionProved:false,realWorldChoiceConsequenceProved:false,
    grantsExecution:false,changesTaskStatus:false};
}

const script = fileURLToPath(import.meta.url);
if (process.argv[1] === script) {
  try {
    const result = await verifyReviewedCIOutcomePair(
      url => githubReadOnlyJson(url,process.env.GITHUB_TOKEN));
    process.stdout.write(JSON.stringify(result,null,2) + "\n");
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  }
}
