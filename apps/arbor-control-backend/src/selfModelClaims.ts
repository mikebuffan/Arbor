import { createHash, randomUUID } from "node:crypto";
import { summarizeSelfModelObservations } from "./selfModelObservations.js";
import type { ArborState, SelfModelClaim, SelfModelClaimStatus } from "./types.js";

const MAX_CLAIMS = 500;

export function reconcileSelfModelClaims(state: ArborState): ArborState {
  const summaries = summarizeSelfModelObservations(state);
  const existing = state.selfModelClaims ?? [];
  const now = new Date().toISOString();
  const next = [...existing];
  for (const summary of summaries) {
    const key = `${summary.targetKind}:${summary.targetId}`;
    const previous = [...next].reverse().find((claim) => claim.key === key && claim.status !== "superseded");
    const status: SelfModelClaimStatus = summary.status === "candidate" ? "candidate" : summary.status === "contested" ? "contested" : "insufficient";
    const confidence = claimConfidence(summary.supportCount, summary.contradictionCount, summary.averageConfidence, summary.supportDomains.length);
    const evidenceDigest = digest(JSON.stringify(summary));
    if (previous?.evidenceDigest === evidenceDigest && previous.status === status) continue;
    if (previous) { previous.status = "superseded"; previous.supersededAt = now; }
    next.push({ id: randomUUID(), key, targetKind: summary.targetKind, targetId: summary.targetId, status, confidence, supportCount: summary.supportCount, contradictionCount: summary.contradictionCount, supportDomains: summary.supportDomains, contradictionDomains: summary.contradictionDomains, evidenceDigest, inferredFrom: "behavioral_observations", createdAt: now, supersedesClaimId: previous?.id });
  }
  return { ...state, selfModelClaims: next.slice(-MAX_CLAIMS) };
}

export function renderSelfModelClaimProjection(state: ArborState): string {
  const active = (state.selfModelClaims ?? []).filter((claim) => claim.status !== "superseded");
  if (!active.length) return "";
  return ["ARBOR FALSIFIABLE SELF-MODEL CLAIMS", "Claims are inferences from recorded behavior, not facts merely because they were stated by Arbor or Danelle.", "Candidate claims remain revisable; contradictory evidence contests them; superseded claims remain in history.", ...active.map((claim) => `- ${claim.key} | status=${claim.status} | confidence=${claim.confidence} | support=${claim.supportCount} | contradict=${claim.contradictionCount} | domains=${claim.supportDomains.join(",") || "none"}`)].join("\n");
}

function claimConfidence(support:number, contradiction:number, average:number, domains:number):number { const evidenceWeight=Math.min(1,support/4); const domainWeight=Math.min(1,domains/3); const contradictionPenalty=Math.min(0.75,contradiction*0.25); return round(Math.max(0,Math.min(1,average*0.5+evidenceWeight*0.3+domainWeight*0.2-contradictionPenalty))); }
function digest(value:string):string { return createHash("sha256").update(value).digest("hex"); }
function round(value:number):number { return Math.round(value*1000)/1000; }
