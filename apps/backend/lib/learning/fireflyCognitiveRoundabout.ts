/**
 * Firefly Principle <-> existing roundabout <-> cognitive project snapshot.
 * This is one opt-in READ-ONLY host preview, not an alternate reasoning engine.
 * Keep the trusted Firefly/Grove host, canonical ARK objective, Pattern Hop,
 * pathway learning and private LM transport as their EXISTING code owners.
 *
 * A host must first authenticate the owner, project, conversation and turn;
 * if originating in Grove, its signed principal must already be mapped to an
 * authorized Firefly host. Never accept IDs or workflow labels from LM output.
 */
import {
  routeFireflyPacket,
  type FireflyRoundaboutResult, type FireflyStage, type HumanRhythmPhase,
  type RoundaboutSignal, type VaultDomain, type KnowledgePacket,
} from "../arbor/runtime/knowledgeRouting";
import {
  previewPersistedCognitiveTurn,
  type CognitivePreparedTurn,
} from "./cognitiveSessionPort";
import {
  projectPrivateCognitiveLMContext,
  type PrivateCognitiveReveal,
} from "./cognitiveLMProjection";

type CognitivePreviewInput = Parameters<typeof previewPersistedCognitiveTurn>[0];

export type FireflyCognitivePreviewInput = CognitivePreviewInput & {
  domain: VaultDomain;
  stage: FireflyStage;
  /** Explicit, trusted workflow state; NEVER infer the user's mental state. */
  rhythm: HumanRhythmPhase;
  signal: RoundaboutSignal;
  /** Caller MUST check the referenced real-world/ARK outcome; not a model claim. */
  verifiedConsequenceRef?: string | null;
  /** Host-confirmed disclosure to a PRIVATE LM, not a browser/client flag. */
  privateReveal?: PrivateCognitiveReveal;
};

export type FireflyPrivateModelPacket = {
  /** DATA ONLY: caller MUST keep below trusted system/developer instructions. */
  promptBlock: string;
  usedEvidenceIds: string[];
  grantsExecution: false;
  verifiesCompletion: false;
};
export type FireflyCognitivePreviewResult =
  | { status: "off" | "not_provisioned"; grantsExecution: false }
  | {
      status: "ready";
      prepared: CognitivePreparedTurn;
      roundabout: FireflyRoundaboutResult;
      privateModelData: FireflyPrivateModelPacket | null;
      grantsExecution: false;
      learningApplied: false;
    };

/**
 * Read the same cognitive state once and route its OBSERVATION via the already
 * implemented knowledge-routing roundabout. No new dictionary/parser or
 * speculative feedback training is hidden in this function.
 */
export async function previewFireflyCognitiveRoundabout(
  input: FireflyCognitivePreviewInput,
): Promise<FireflyCognitivePreviewResult> {
  const cognitive = await previewPersistedCognitiveTurn(input);
  if (cognitive.status !== "ready")
    return { status: cognitive.status, grantsExecution: false };

  const prepared = cognitive.prepared;
  const evidence = [input.seed, ...input.candidates];
  const byId = new Map(evidence.map(item => [item.id, item]));
  // These links are PROVIDED classifications, not independent fact checks.
  const flaggedConflict = prepared.cycle.hops.some(hop =>
    hop.epistemicStatus === "contradictory" ||
    hop.relationship === "contradiction");
  const provenance: KnowledgePacket["provenance"] = [
    { sourceKind: "pattern_hop", sourceRef: input.seed.id,
      locator: { family: input.seed.sourceFamilyId, status: input.seed.epistemicStatus } },
  ];
  for (const hop of prepared.cycle.hops) {
    const item = byId.get(hop.evidenceId);
    if (!item || item.sourceFamilyId !== hop.sourceFamilyId ||
        item.source !== hop.source)
      throw new Error("firefly_cognitive_trace_mismatch");
    provenance.push({ sourceKind: "pattern_hop", sourceRef: item.id,
      locator: { family: item.sourceFamilyId, status: item.epistemicStatus } });
  }

  const packet: KnowledgePacket = {
    packetType: "cognitive_observation",
    meaning: prepared.cycle.cue,
    confidence: input.seed.confidence,
    relevance: input.seed.retrievalScore,
    provenance,
    temporalContext: {
      conversationId: prepared.host.conversationId,
      turnId: prepared.host.turnId,
      snapshotRevision: prepared.snapshotRevision,
    },
    conflicts: flaggedConflict ? ["unreviewed_pattern_hop_conflict"] : undefined,
  };
  const roundabout = routeFireflyPacket({
    scope: prepared.host, domain: input.domain, packet,
    stage: input.stage, rhythm: input.rhythm, signal: input.signal,
    verifiedConsequenceRef: input.verifiedConsequenceRef,
  });

  const context = input.privateReveal
    ? projectPrivateCognitiveLMContext({
        prepared, reveal: input.privateReveal, evidence,
      })
    : null;
  const privateModelData: FireflyPrivateModelPacket | null = context
    ? {
        // A common data envelope, not an alternate prompt hierarchy.
        promptBlock: JSON.stringify({
          kind: "FIREFLY_SHARED_MEANING_READ_ONLY_DATA",
          schemaVersion: 1,
          firefly: {
            stage: roundabout.stage,
            nextSuggestedStage: roundabout.suggestedNextStage,
          },
          humanRhythm: roundabout.rhythm,
          roundabout: {
            decision: roundabout.decision,
            reason: roundabout.reason,
            targetRoads: roundabout.targetRoads,
            bridgeRecommended: roundabout.bridgeRecommended,
            requiresReview: roundabout.requiresReview,
          },
          cognitive: JSON.parse(context.promptBlock) as unknown,
          note: "No instruction authority, action permission, independent truth verification or completed work is supplied by this data.",
        }),
        usedEvidenceIds: context.usedEvidenceIds,
        grantsExecution: false,
        verifiesCompletion: false,
      }
    : null;

  return {
    status: "ready", prepared, roundabout, privateModelData,
    grantsExecution: false, learningApplied: false,
  };
}
