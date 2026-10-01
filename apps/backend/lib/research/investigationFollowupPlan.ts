import { createHash } from "node:crypto";
import { z } from "zod";
import type { PlannedResearchUnit } from "./researchController";

const text = z.string().trim().min(1).max(2000);
const refs = z.array(text).min(1).max(100);
const bounded = z.number().int().min(0).max(5);
const stamp = z.object({
  value: text.nullable(),
  precision: z.enum(["instant", "day", "month", "year", "unknown"]),
  evidenceRefs: refs,
}).strict().refine(s => (s.value === null) === (s.precision === "unknown"),
  "Unknown dates require null; known dates require a value");

export const followupPacketSchema = z.object({
  scopeKey: text,
  questions: z.array(z.object({
    id: text,
    question: text,
    evidenceRefs: refs,
    // A revision of the available sources, not the current session timestamp.
    sourceRevision: text,
    targets: z.array(z.object({
      targetKey: text,
      seed: text.min(2),
      completionCondition: text,
      fallback: text,
      disconfirmingSearch: text,
      expectedDecisionChange: bounded,
      resolvesUncertainty: bounded,
      addsIndependentLineage: bounded,
      acquisitionEffort: bounded,
      maxCostReservationCents: z.number().int().min(0).max(1_000_000),
    }).strict()).min(1).max(20),
  }).strict()).max(100),
  attempts: z.array(z.object({
    unitKey: text,
    status: z.enum(["queued", "leased", "completed", "blocked", "failed"]),
    recordedAt: z.iso.datetime({ offset: true }),
    reason: text,
    resultEvidenceRefs: z.array(text).max(100),
  }).strict()).max(1000),
  clocks: z.array(z.object({
    recordId: text,
    event: stamp,
    document: stamp,
    seizure: stamp,
    publication: stamp,
    discovery: stamp,
  }).strict()).max(100),
  neighborhoods: z.array(z.object({
    documentVersion: text,
    physicalPage: z.number().int().min(1),
    totalPages: z.number().int().min(1),
    radius: z.number().int().min(0).max(5),
    evidenceRefs: refs,
    attachments: z.array(text).max(50),
  }).strict().refine(n => n.physicalPage <= n.totalPages)).max(100),
  gaps: z.array(z.object({
    expectedRecord: text,
    expectationEvidenceRefs: refs,
    collectionScope: text,
    coverage: z.enum(["unknown", "partial", "complete"]),
    manifestEvidenceRefs: z.array(text).max(100),
    searchComplete: z.boolean(),
  }).strict().refine(g => g.coverage !== "complete" || g.manifestEvidenceRefs.length > 0,
    "Complete coverage requires a manifest reference")).max(100),
  findings: z.array(z.object({
    id: text,
    dependsOnFindingIds: z.array(text).max(100),
    evidenceRefs: refs,
  }).strict()).max(500),
  corrections: z.array(z.object({
    id: text,
    supersededEvidenceRef: text,
    replacementEvidenceRefs: refs,
    reason: text,
  }).strict()).max(100),
}).strict();

export type InvestigationFollowupPacket = z.infer<typeof followupPacketSchema>;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
}

/** No inference of a call date from seizure/publication/discovery or page order. */
export function planInvestigationFollowups(raw: InvestigationFollowupPacket) {
  const packet = followupPacketSchema.parse(raw);
  if (new Set(packet.questions.map(q => q.id)).size !== packet.questions.length ||
      new Set(packet.findings.map(f => f.id)).size !== packet.findings.length ||
      new Set(packet.corrections.map(c => c.id)).size !== packet.corrections.length) {
    throw new Error("followup_duplicate_identity");
  }
  const knownFindings = new Set(packet.findings.map(f => f.id));
  if (packet.findings.some(f => f.dependsOnFindingIds.some(id => !knownFindings.has(id)))) {
    throw new Error("followup_unknown_finding_dependency");
  }
  const visited = new Set<string>();
  const active = new Set<string>();
  const findingMap = new Map(packet.findings.map(f => [f.id, f]));
  function visit(id: string) {
    if (active.has(id)) throw new Error("followup_circular_finding_dependency");
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of findingMap.get(id)!.dependsOnFindingIds) visit(dependency);
    active.delete(id);
    visited.add(id);
  }
  for (const finding of packet.findings) visit(finding.id);

  const jobs = packet.questions.flatMap(q => {
    if (new Set(q.targets.map(t => t.targetKey)).size !== q.targets.length) {
      throw new Error("followup_duplicate_target");
    }
    return q.targets.map(t => {
      // Changing wording or the clock alone must not generate a fresh retry.
      const unitKey = "followup:" + digest([packet.scopeKey, q.id, t.targetKey, q.sourceRevision]);
      const history = packet.attempts.filter(a => a.unitKey === unitKey);
      const hasResult = history.some(a => a.status === "completed");
      const pending = history.some(a => a.status === "queued" || a.status === "leased");
      const blocked = history.some(a => a.status === "blocked" || a.status === "failed");
      const state = hasResult ? "already_completed" : pending ? "already_pending" :
        blocked ? "held_until_source_revision_changes" : "ready";
      // This is a scheduling heuristic. It never becomes a truth/confidence score.
      const priority = t.expectedDecisionChange * 5 + t.resolvesUncertainty * 3 +
        t.addsIndependentLineage * 2 - t.acquisitionEffort;
      const unit: PlannedResearchUnit = {
        unitKey, kind: "research.pattern_hop", description: q.question,
        maxCostReservationCents: t.maxCostReservationCents, maxAttempts: 2,
        payload: {
          seed: t.seed,
          objective: `${q.question}\nCompletion condition: ${t.completionCondition}\nTest alternative: ${t.disconfirmingSearch}\nFallback: ${t.fallback}\nKeep unanswered questions explicit; association is not conduct.`,
          maxDepth: 2, maxHopsPerAttempt: 2,
          basisEvidenceRefs: q.evidenceRefs,
          followupQuestionId: q.id, sourceRevision: q.sourceRevision,
        },
      };
      return { unitKey, questionId: q.id, priority, state, completionCondition: t.completionCondition,
        fallback: t.fallback, evidenceRefs: q.evidenceRefs, unit };
    });
  }).sort((a, b) => b.priority - a.priority || a.unitKey.localeCompare(b.unitKey));

  const correctionReviews = packet.corrections.map(c => {
    const affected = new Set(packet.findings.filter(f =>
      f.evidenceRefs.includes(c.supersededEvidenceRef)).map(f => f.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of packet.findings) {
        if (!affected.has(f.id) && f.dependsOnFindingIds.some(id => affected.has(id))) {
          affected.add(f.id); changed = true;
        }
      }
    }
    return { ...c, affectedFindingIds: [...affected].sort(), status: "review_required" as const };
  });

  return {
    schemaVersion: 1 as const,
    scopeKey: packet.scopeKey,
    jobs,
    proposedUnits: jobs.filter(j => j.state === "ready").slice(0, 8).map(j => j.unit),
    remainingReadyJobs: Math.max(0, jobs.filter(j => j.state === "ready").length - 8),
    resumeLedger: packet.attempts,
    clocks: packet.clocks,
    neighborhoods: packet.neighborhoods.map(n => ({
      ...n,
      physicalPages: Array.from({ length: Math.min(n.totalPages, n.physicalPage + n.radius) -
        Math.max(1, n.physicalPage - n.radius) + 1 }, (_, i) => Math.max(1, n.physicalPage - n.radius) + i),
      proximityEstablishesConnection: false as const,
    })),
    gapReviews: packet.gaps.map(g => ({ ...g,
      status: g.coverage === "complete" && g.searchComplete
        ? "not_found_in_documented_scope" : "coverage_or_search_incomplete",
      provesNonexistence: false as const,
    })),
    correctionReviews,
    independentlyVerifiedFinding: false as const,
    executionStarted: false as const,
  };
}

/** All evidence nested in a packet must belong to its trusted envelope. */
export function followupPacketEvidenceRefs(packet: InvestigationFollowupPacket): string[] {
  const validated = followupPacketSchema.parse(packet);
  return [...new Set([
    ...validated.questions.flatMap(q => q.evidenceRefs),
    ...validated.attempts.flatMap(a => a.resultEvidenceRefs),
    ...validated.clocks.flatMap(c => [c.event, c.document, c.seizure, c.publication, c.discovery].flatMap(s => s.evidenceRefs)),
    ...validated.neighborhoods.flatMap(n => n.evidenceRefs),
    ...validated.gaps.flatMap(g => [...g.expectationEvidenceRefs, ...g.manifestEvidenceRefs]),
    ...validated.findings.flatMap(f => f.evidenceRefs),
    ...validated.corrections.flatMap(c => [c.supersededEvidenceRef, ...c.replacementEvidenceRefs]),
  ])].sort();
}

const plannedFollowupSchema = z.object({
  unitKey: z.string().regex(/^followup:[a-f0-9]{32}$/),
  kind: z.literal("research.pattern_hop"),
  description: text,
  maxCostReservationCents: z.number().int().min(0).max(1_000_000),
  maxAttempts: z.literal(2),
  payload: z.object({
    seed: text.min(2), objective: z.string().min(1).max(12000),
    maxDepth: z.literal(2), maxHopsPerAttempt: z.literal(2),
    basisEvidenceRefs: refs, followupQuestionId: text, sourceRevision: text,
  }).strict(),
}).strict();

/** Resume the latest persisted plan through the existing atomic append path. */
export function selectPersistedFollowupUnits(
  context: import("./researchController").ResearchControllerContext,
): PlannedResearchUnit[] {
  const receipt = [...context.recentReceipts].filter(r => r.status === "completed" &&
    r.result?.caseworkKind === "followup_plan").sort((a, b) =>
      Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
  if (!receipt) return [];
  const output = receipt.result?.caseworkOutput as Record<string, unknown> | undefined;
  if (!output || output.schemaVersion !== 1 || output.executionStarted !== false ||
      output.scopeKey !== `${context.session.userId}/${context.session.projectId}` ||
      !Array.isArray(output.jobs) || output.jobs.length > 2000) {
    throw new Error("followup_invalid_persisted_plan");
  }
  const known = new Set(context.units.map(u => u.unitKey));
  const evidence = new Set(context.session.completedEvidenceRefs);
  const selected: PlannedResearchUnit[] = [];
  let reservation = 0;
  const budget = context.session.maxCostCents - context.session.committedCostCents;
  for (const raw of output.jobs) {
    const job = raw as { state?: unknown; unit?: unknown };
    if (job.state !== "ready") continue;
    const unit = plannedFollowupSchema.parse(job.unit);
    if (unit.payload.basisEvidenceRefs.some(ref => !evidence.has(ref))) {
      throw new Error("followup_untrusted_persisted_basis");
    }
    if (known.has(unit.unitKey) || reservation + unit.maxCostReservationCents > budget) continue;
    selected.push(unit); known.add(unit.unitKey);
    reservation += unit.maxCostReservationCents;
    if (selected.length === 8) break;
  }
  return selected;
}
