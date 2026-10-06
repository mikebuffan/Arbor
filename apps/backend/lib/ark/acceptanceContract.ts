import { createHash } from "node:crypto";
import pack from "../../../../docs/integration/ARBOR_CONVERSATION_ACCEPTANCE_CASES_20261005.json";
import { renderCanonicalIdentityAnchor } from "../arbor/selfModel/canonicalIdentityAnchor";
import { renderCanonicalPersonality } from "../arbor/selfModel/personalityProjection";
import type { AcceptanceConfig } from "../arbor/agency/acceptanceRunner";

export const ACCEPTANCE_TASK_KIND = "arbor.behavior-acceptance";
export const ACCEPTANCE_CASE_IDS = pack.cases.map(c => c.id);
export const acceptanceHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const ACCEPTANCE_PACK_HASH = acceptanceHash(pack);

// All prompts, model selection and budgets are server-owned. The MCP client
// chooses only a checked-in case, never code, context, credentials or budgets.
export function acceptanceContract() {
  const sourceIdentity = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.ARBOR_ACCEPTANCE_SOURCE_COMMIT ?? "";
  const campaign = process.env.ARBOR_ACCEPTANCE_CAMPAIGN ?? "";
  const model = process.env.OPENAI_AGENCY_MODEL ?? process.env.OPENAI_MODEL ?? "";
  const enabledCases = process.env.ARBOR_ACCEPTANCE_ALLOW_FULL_PACK === "true" ? ACCEPTANCE_CASE_IDS : ["tired-familiarity"];
  if (!/^[a-f0-9]{40}$/.test(sourceIdentity) || !/^[a-zA-Z0-9_-]{1,64}$/.test(campaign) || !model.trim())
    throw new Error("ark_acceptance_host_configuration_missing");
  const config: AcceptanceConfig = {
    sourceIdentity, model, taskInstructions: "Respond to the supplied synthetic conversation and carry out authorized isolated fixture tasks. Do not invent unavailable evidence.",
    baselineContext: "", candidateContext: [renderCanonicalIdentityAnchor(), renderCanonicalPersonality()].join("\n\n"),
    maxRounds: 2, maxCalls: 12, maxOutputTokens: 1200, verifyCompletion: true,
  };
  const contractHash = acceptanceHash({ campaign, packHash: ACCEPTANCE_PACK_HASH, config, enabledCases, fixtureVersion: "synthetic-v1" });
  return { campaign, contractHash, config, enabledCases };
}

export function acceptanceCaseInput(caseId: string, contractHash: string) {
  const c = pack.cases.find(c => c.id === caseId);
  if (!c) throw new Error("ark_acceptance_unknown_case");
  const A = parseInt(acceptanceHash([contractHash, caseId]).slice(0, 2), 16) % 2 ? "candidate" : "baseline";
  return {
    generation: { schemaVersion: 1, casePackHash: ACCEPTANCE_PACK_HASH, cases: [{ id: c.id, userTurns: [...c.userTurns] }] },
    assignment: { schemaVersion: 1, casePackHash: ACCEPTANCE_PACK_HASH, cases: [{ caseId, A, B: A === "candidate" ? "baseline" : "candidate" }] },
  };
}

export function acceptanceObjectiveKey(contractHash: string, caseId: string) {
  // Even a new request UUID cannot buy a second run of this case/campaign.
  // A reviewed server campaign/config change is required to authorize a rerun.
  return `mcp-acceptance:${contractHash}:${caseId}`;
}
