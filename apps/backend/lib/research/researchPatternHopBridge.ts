import { explainNextHop, type NextHopExplanation } from "./investigationGraph";
import { validateReviewPacket, reviewPacketStats, type ReviewPacket } from "./reviewWorkbench";

export type ResearchPatternHopCandidate={
  candidateId:string;
  objective:string;
  seed:{
    anomalyRef:string;
    triggerEvidenceRefs:readonly string[];
    requestedQuery:string;
  };
  maxDepth:number;
  maxHopsPerAttempt:number;
  persistenceTarget:"arbor_pattern_hop_runs";
  executionRequested:false;
  status:"prepared_not_submitted";
};

const req=(v:unknown,k:string,max=4000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_pattern_bridge_"+k);
  return v.trim();
};

export function preparePatternHopCandidate(input:{
  candidateId:string;
  anomalyRef:string;
  objective:string;
  requestedQuery:string;
  triggerEvidenceRefs:readonly string[];
  maxDepth:number;
  maxHopsPerAttempt:number;
}):ResearchPatternHopCandidate{
  const candidateId=req(input.candidateId,"candidate_id",300);
  const anomalyRef=req(input.anomalyRef,"anomaly_ref",800);
  const objective=req(input.objective,"objective",4000);
  const requestedQuery=req(input.requestedQuery,"requested_query",4000);
  const triggerEvidenceRefs=[...new Set(input.triggerEvidenceRefs.map(x=>req(x,"evidence_ref",1000)))].sort();
  if(!triggerEvidenceRefs.length)throw new Error("pattern_bridge_evidence_required");
  if(!Number.isSafeInteger(input.maxDepth)||input.maxDepth<1||input.maxDepth>5)
    throw new Error("invalid_pattern_bridge_max_depth");
  if(!Number.isSafeInteger(input.maxHopsPerAttempt)||input.maxHopsPerAttempt<1||input.maxHopsPerAttempt>10)
    throw new Error("invalid_pattern_bridge_max_hops");
  return {
    candidateId,objective,
    seed:{anomalyRef,triggerEvidenceRefs,requestedQuery},
    maxDepth:input.maxDepth,maxHopsPerAttempt:input.maxHopsPerAttempt,
    persistenceTarget:"arbor_pattern_hop_runs",
    executionRequested:false,
    status:"prepared_not_submitted",
  };
}

/** Bind an existing review packet to the existing prepared hop. This adapter
 * cannot turn a document lead into a historical-memory search or execution. */
export function preparePatternHopFromReviewPacket(input: {
  packet: ReviewPacket;
  directive: NextHopExplanation;
  candidateId: string;
  objective: string;
  maxDepth: number;
  maxHopsPerAttempt: number;
}) {
  const packet = validateReviewPacket(input.packet);
  const directive = explainNextHop(input.directive);
  const knownRefs = new Set([
    ...packet.source.sourceRefs,
    ...packet.contradictions.flatMap(item => item.evidenceRefs),
    ...packet.identityCandidates.flatMap(item => item.basisMentionIds),
  ]);
  if (directive.triggerEvidenceRefs.some(ref => !knownRefs.has(ref)))
    throw new Error("pattern_bridge_trigger_outside_review_packet");
  const candidate = preparePatternHopCandidate({
    candidateId: input.candidateId,
    anomalyRef: directive.directiveId,
    objective: input.objective,
    requestedQuery: directive.targetQuery,
    triggerEvidenceRefs: directive.triggerEvidenceRefs,
    maxDepth: input.maxDepth,
    maxHopsPerAttempt: input.maxHopsPerAttempt,
  });
  const stats = reviewPacketStats(packet);
  return {
    ...candidate,
    provenance: { packetId: packet.packetId, ...packet.source },
    reason: directive.reason,
    stoppingCondition: directive.stoppingCondition,
    reviewRequirements: {
      unresolvedIdentities: stats.unresolvedIdentities,
      contradictions: stats.contradictions,
      privacyFlags: stats.privacyFlags,
      originalPageReviewRequired: true as const,
    },
    executionRoute: "document_research_adapter_required" as const,
    canSubmitToHistoricalMemoryTool: false as const,
    independentCorroborationVerified: false as const,
  };
}
