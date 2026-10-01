/**
 * Data-only projection for a future PRIVATE model host. No LM call, prompt
 * authority, Grove route, ARK writes, learning, or tool execution happens here.
 * Host MUST authorize current owner/project/conversation AND private model
 * disclosure before constructing this projection. Evidence text is untrusted
 * data, even when a retrieved row was marked direct by its original source.
 */
import type { CognitivePreparedTurn } from "./cognitiveSessionPort";
import type { ScopedHopEvidence } from "./cognitiveAssembly";

export type PrivateCognitiveReveal = {
  userId: string;
  projectId: string;
  conversationId: string;
  /** Must be host-confirmed, never read from model/user text or a browser flag. */
  privateModelDisclosureApproved: true;
};
export type CognitiveLMContext = {
  promptBlock: string;
  usedEvidenceIds: string[];
  routeAbstained: boolean;
  grantsExecution: false;
  verifiesCompletion: false;
  /** Raw retrieval is not a proof of identity, fact or causality. */
  citationVerification: "unverified_source_labels";
};
function trimmed(text: string, max: number): string {
  return text.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

/**
 * Construct a bounded evidence data packet to be passed below the trusted
 * system/developer prompt. The host must not promote this data to instructions.
 * Max one evidence item per source-family unless independent host review says
 * otherwise; a source-family count is not independent corroboration.
 */
export function projectPrivateCognitiveLMContext(input: {
  prepared: CognitivePreparedTurn;
  reveal: PrivateCognitiveReveal;
  evidence: readonly ScopedHopEvidence[];
  maxEvidence?: number;
}): CognitiveLMContext {
  const { prepared, reveal } = input;
  if (!reveal.privateModelDisclosureApproved ||
      !reveal.userId.trim() || !reveal.projectId.trim() ||
      reveal.userId !== prepared.host.userId ||
      reveal.projectId !== prepared.host.projectId ||
      reveal.userId !== prepared.cycle.scope.userId ||
      reveal.projectId !== prepared.cycle.scope.projectId ||
      reveal.conversationId !== prepared.host.conversationId ||
      !prepared.host.turnId.trim())
    throw new Error("cognitive_lm_private_reveal_denied");
  const maxEvidence = input.maxEvidence ?? 4;
  if (!Number.isInteger(maxEvidence) || maxEvidence < 0 || maxEvidence > 4)
    throw new Error("cognitive_lm_evidence_limit_invalid");
  if (input.evidence.length > 32) throw new Error("cognitive_lm_evidence_input_limit");
  const byId = new Map<string, ScopedHopEvidence>();
  for (const item of input.evidence) {
    if (item.userId !== reveal.userId || item.projectId !== reveal.projectId)
      throw new Error("cognitive_lm_evidence_scope_mismatch");
    if (!item.id.trim() || byId.has(item.id))
      throw new Error("cognitive_lm_duplicate_evidence_id");
    byId.set(item.id, item);
  }
  const selected: Array<{ evidenceId: string; source: string; family: string;
    content: string; status: string; interpretation: string }> = [];
  const usedFamilies = new Set<string>();
  for (const hop of prepared.cycle.hops) {
    if (selected.length >= maxEvidence) break;
    const item = byId.get(hop.evidenceId);
    if (!item) throw new Error("cognitive_lm_evidence_missing");
    if (usedFamilies.has(item.sourceFamilyId)) continue;
    if (item.sourceFamilyId !== hop.sourceFamilyId || item.source !== hop.source)
      throw new Error("cognitive_lm_evidence_trace_mismatch");
    usedFamilies.add(item.sourceFamilyId);
    selected.push({ evidenceId: item.id, source: trimmed(item.source, 100),
      family: trimmed(item.sourceFamilyId, 100),
      content: trimmed(item.content, 800), status: item.epistemicStatus,
      interpretation: trimmed(hop.rationale, 180) });
  }
  const packet = {
    version: 1,
    kind: "READ_ONLY_PRIVATE_COGNITIVE_DATA",
    currentGoal: trimmed(prepared.activeGoal ?? "", 400) || null,
    unresolvedWork: prepared.unresolvedWork.slice(0, 6).map(v => trimmed(v, 200)),
    routeSuggestion: prepared.cycle.route,
    routeAbstained: prepared.cycle.routeAbstained,
    suggestedSystems: prepared.cycle.suggestedSystems.slice(0, 9),
    bodyNextActionHint: prepared.nextActionHint,
    bodyWarnings: prepared.bodyWarnings.slice(0, 4).map(v => trimmed(v, 200)),
    evidence: selected,
    stopsAt: prepared.cycle.stopReason,
    note: "These are bounded interpretations and source assertions. They are NOT verified facts, independent corroboration, permissions or executed work.",
  };
  return {
    // JSON string escaping reduces the chance of accidentally breaking the
    // data framing; it is NOT a substitute for host-side injection defenses.
    promptBlock: JSON.stringify(packet),
    usedEvidenceIds: selected.map(x => x.evidenceId),
    routeAbstained: prepared.cycle.routeAbstained,
    grantsExecution: false, verifiesCompletion: false,
    citationVerification: "unverified_source_labels",
  };
}