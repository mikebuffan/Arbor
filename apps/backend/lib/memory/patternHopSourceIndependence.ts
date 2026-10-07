import type { PatternHopEvidence } from "@/lib/memory/patternHop";

/**
 * A read-only duplicate-warning projection, NOT an identity resolver and
 * NOT an independent-corroboration certificate. It never alters evidence.
 *
 * The same document can appear inside several production envelopes, and
 * source-backed claims may repeat verbatim in syndicated/forwarded copies.
 * These warnings exist solely to require human/source review before counting
 * purportedly independent corroboration.
 */
export type PatternHopSourceOverlapReason =
  | "same_record_id"
  | "same_source_artifact"
  | "same_original_message"
  | "identical_text_possible_derivative";

export type PatternHopSourceOverlap = {
  evidenceIds: readonly [string, string];
  reason: PatternHopSourceOverlapReason;
  independenceStatus: "not_verified";
};

export type PatternHopSourceIndependenceAudit = {
  reviewedEvidenceCount: number;
  warnings: PatternHopSourceOverlap[];
  independentCorroborationVerified: false;
  noWarningDoesNotProveIndependence: true;
};

function nonempty(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text ? text : null;
}

function normalizedContent(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function overlapReason(
  a: PatternHopEvidence,
  b: PatternHopEvidence,
): PatternHopSourceOverlapReason | null {
  if (a.id === b.id) return "same_record_id";

  const artifactA = nonempty(a.sourceArtifactId);
  const artifactB = nonempty(b.sourceArtifactId);
  if (artifactA && artifactB && artifactA === artifactB)
    return "same_source_artifact";

  const threadA = nonempty(a.sourceThreadId);
  const threadB = nonempty(b.sourceThreadId);
  const messageA = nonempty(a.sourceMessageId);
  const messageB = nonempty(b.sourceMessageId);
  if (
    a.source === b.source &&
    threadA && threadB && threadA === threadB &&
    messageA && messageB && messageA === messageB
  ) return "same_original_message";

  // Exact long text is a review flag, not an assumed shared origin:
  // independently sourced documents can contain identical quotations.
  const contentA = normalizedContent(a.content);
  if (contentA.length >= 60 && contentA === normalizedContent(b.content))
    return "identical_text_possible_derivative";

  return null;
}

/**
 * Bounded synthetic/source-level helper. No DB, model, network, worker or
 * unauthorized data transfer. Explicitly does not infer that unmatched
 * records are independent, nor does it merge people or findings.
 */
export function auditPatternHopSourceIndependence(
  evidence: readonly PatternHopEvidence[],
): PatternHopSourceIndependenceAudit {
  if (evidence.length > 100)
    throw new Error("pattern_hop_source_independence_limit_exceeded");

  const warnings: PatternHopSourceOverlap[] = [];
  for (let i = 0; i < evidence.length; i += 1) {
    for (let j = i + 1; j < evidence.length; j += 1) {
      const reason = overlapReason(evidence[i], evidence[j]);
      if (!reason) continue;
      warnings.push({
        evidenceIds: [evidence[i].id, evidence[j].id],
        reason,
        independenceStatus: "not_verified",
      });
    }
  }

  return {
    reviewedEvidenceCount: evidence.length,
    warnings,
    independentCorroborationVerified: false,
    noWarningDoesNotProveIndependence: true,
  };
}
