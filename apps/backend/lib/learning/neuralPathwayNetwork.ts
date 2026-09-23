/**
 * Recovered Associative Pathway Layer: isolated, deterministic application-level
 * wiring. It is NOT an LLM's weights, an ARK write adapter or an action executor.
 * Integration must be through a trusted host with owner/project checks.
 */
export type BodySystemName =
  | "perception" | "vestibular" | "nervous" | "memory" | "correction"
  | "executive" | "language" | "muscular" | "safety";
export type PathwayType = "association" | "correction" | "compensation" | "safety";
export type PathwayAction = "suggest_context" | "suggest_review";
export type PathwayStatus = "active" | "suppressed" | "retired";
export type NeuralSignal = {
  id: string;
  userId: string;
  projectId: string;
  cues: string[];
};
export type NeuralPathway = {
  id: string;
  userId: string;
  projectId: string;
  cues: string[];
  associatedSystems: BodySystemName[];
  type: PathwayType;
  action: PathwayAction;
  status: PathwayStatus;
  /** Routing priority only. NEVER confidence that an underlying claim is true. */
  strength: number;
  evidenceRefs: string[];
  lastReinforcedAt: string;
  /** Protected corrections and safety paths do not decay automatically. */
  protected: boolean;
};
export type PathwayOutcome = "verified_helpful" | "verified_unhelpful" | "observed_use";
export type NeuralPathwayInput = {
  signal: NeuralSignal;
  pathways: readonly NeuralPathway[];
};
export type NeuralPathwayResult = {
  matches: NeuralPathway[];
  suggestedSystems: BodySystemName[];
  /** Never interpreted as an execution or read authorization. */
  grantsExecution: false;
};
export type PathwayFeedback = {
  pathwayId: string;
  userId: string;
  projectId: string;
  outcome: PathwayOutcome;
  evidenceRef: string;
  at: string;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const normalizedCue = (cue: string) => cue.trim().toLowerCase().replace(/\s+/g, " ");
const distinct = <T>(values: readonly T[]): T[] => [...new Set(values)];
function requireScope(userId: string, projectId: string): void {
  if (!userId.trim() || !projectId.trim()) throw new Error("pathway_scope_required");
}
function requireEvidence(evidenceRef: string): void {
  if (!evidenceRef.trim()) throw new Error("pathway_verified_evidence_required");
}
function requireTime(value: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error("pathway_valid_time_required");
}
function validCandidate(candidate: NeuralPathway): NeuralPathway {
  requireScope(candidate.userId, candidate.projectId);
  requireTime(candidate.lastReinforcedAt);
  if (!candidate.id.trim() || !candidate.cues.some(cue => normalizedCue(cue)))
    throw new Error("pathway_identifier_and_cue_required");
  if (!candidate.associatedSystems.length) throw new Error("pathway_target_required");
  if (!Number.isFinite(candidate.strength)) throw new Error("pathway_strength_invalid");
  // Associations are hints, not authorizations. Restrict outputs to known systems.
  const systems: BodySystemName[] = ["perception", "vestibular", "nervous", "memory", "correction", "executive", "language", "muscular", "safety"];
  if (candidate.associatedSystems.some(system => !systems.includes(system)))
    throw new Error("pathway_target_unknown");
  return {
    ...candidate,
    strength: clamp(candidate.strength),
    cues: distinct(candidate.cues.map(normalizedCue).filter(Boolean)),
    associatedSystems: distinct(candidate.associatedSystems),
    evidenceRefs: distinct(candidate.evidenceRefs.filter(Boolean)),
  };
}
/** Exact-cue association for this experimental scaffold; not an LLM semantic classifier. */
export function matchNeuralPathways({ signal, pathways }: NeuralPathwayInput): NeuralPathway[] {
  requireScope(signal.userId, signal.projectId);
  const cues = new Set(signal.cues.map(normalizedCue).filter(Boolean));
  return pathways
    .filter(path => path.userId === signal.userId && path.projectId === signal.projectId && path.status === "active"
      && path.cues.some(cue => cues.has(normalizedCue(cue))))
    .map(validCandidate)
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
}
/** Pure projection: suggests systems, NEVER invokes tools, reads ARK or executes tasks. */
export function activateAssociatedSystems(input: NeuralPathwayInput): NeuralPathwayResult {
  const matches = matchNeuralPathways(input);
  return {
    matches,
    suggestedSystems: distinct(matches.flatMap(path => path.associatedSystems)),
    grantsExecution: false,
  };
}
/** Only host-validated outcomes with source receipts may change routing priority. */
export function updatePathwayWeights(pathways: readonly NeuralPathway[], feedback: PathwayFeedback): NeuralPathway[] {
  requireScope(feedback.userId, feedback.projectId);
  requireEvidence(feedback.evidenceRef);
  requireTime(feedback.at);
  let found = false;
  const updated = pathways.map(path => {
    if (path.id !== feedback.pathwayId) return { ...path };
    if (path.userId !== feedback.userId || path.projectId !== feedback.projectId)
      throw new Error("pathway_scope_mismatch");
    found = true;
    if (path.status !== "active" || path.evidenceRefs.includes(feedback.evidenceRef)) return { ...path };
    const delta = feedback.outcome === "verified_helpful" ? 0.1
      : feedback.outcome === "verified_unhelpful" ? -0.16 : 0;
    // Observed use is not verified correctness. Negative feedback does not erase evidence.
    return validCandidate({
      ...path,
      strength: clamp(path.strength + delta),
      evidenceRefs: distinct([...path.evidenceRefs, feedback.evidenceRef]),
      lastReinforcedAt: delta > 0 ? feedback.at : path.lastReinforcedAt,
    });
  });
  if (!found) throw new Error("pathway_not_found");
  return updated;
}
/** A trusted caller proposes a pathway; verified evidence is mandatory for new wiring. */
export function createOrStrengthenPathway(
  pathways: readonly NeuralPathway[], candidate: NeuralPathway, evidenceRef: string,
): NeuralPathway[] {
  requireEvidence(evidenceRef);
  const ready = validCandidate(candidate);
  const existing = pathways.find(path => path.id === ready.id);
  if (!existing) return [...pathways, { ...ready, evidenceRefs: distinct([...ready.evidenceRefs, evidenceRef]) }];
  if (existing.userId !== ready.userId || existing.projectId !== ready.projectId)
    throw new Error("pathway_scope_mismatch");
  if (existing.status !== "active" || existing.evidenceRefs.includes(evidenceRef)) return [...pathways]; // review must explicitly clear HOLD; retries cannot double count
  if (existing.type !== ready.type || existing.action !== ready.action ||
      existing.cues.map(normalizedCue).join("|") !== ready.cues.join("|") ||
      [...existing.associatedSystems].sort().join("|") !== [...ready.associatedSystems].sort().join("|"))
    throw new Error("pathway_conflicting_definition");
  return pathways.map(path => path.id === ready.id
    ? validCandidate({ ...path, strength: clamp(path.strength + 0.1),
      evidenceRefs: distinct([...path.evidenceRefs, evidenceRef]), lastReinforcedAt: ready.lastReinforcedAt })
    : { ...path });
}
export function weakenBadPathway(pathways: readonly NeuralPathway[], feedback: Omit<PathwayFeedback, "outcome">): NeuralPathway[] {
  return updatePathwayWeights(pathways, { ...feedback, outcome: "verified_unhelpful" });
}
/** Half-life affects routing priority only, never source evidence or durable corrections. */
export function decayUnusedPathways(pathways: readonly NeuralPathway[], at: string, halfLifeDays = 60): NeuralPathway[] {
  requireTime(at);
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) throw new Error("pathway_half_life_invalid");
  return pathways.map(path => {
    if (path.status !== "active" || path.protected || path.type === "correction" || path.type === "safety")
      return { ...path };
    requireTime(path.lastReinforcedAt);
    const elapsed = Math.max(0, Date.parse(at) - Date.parse(path.lastReinforcedAt));
    return { ...path, strength: clamp(path.strength * Math.pow(0.5, elapsed / (halfLifeDays * 86400000))) };
  });
}
/** Host-supplied safety HOLD; suppression cannot be reversed by positive feedback. */
export function suppressUnsafePathways(
  pathways: readonly NeuralPathway[], input: { userId: string; projectId: string; pathwayIds: string[]; evidenceRef: string },
): NeuralPathway[] {
  requireScope(input.userId, input.projectId);
  requireEvidence(input.evidenceRef);
  const ids = new Set(input.pathwayIds);
  return pathways.map(path => {
    if (!ids.has(path.id)) return { ...path };
    if (path.userId !== input.userId || path.projectId !== input.projectId)
      throw new Error("pathway_scope_mismatch");
    return { ...path, status: "suppressed", evidenceRefs: distinct([...path.evidenceRefs, input.evidenceRef]) };
  });
}
export function buildNeuralPathwayDebugTrace(result: NeuralPathwayResult) {
  return {
    pathwayIds: result.matches.map(path => path.id),
    scores: result.matches.map(path => ({ id: path.id, strength: path.strength, status: path.status })),
    suggestedSystems: [...result.suggestedSystems],
    grantsExecution: false as const,
    note: "Routing suggestions only; no truth, permission, live execution or model-learning claim.",
  };
}