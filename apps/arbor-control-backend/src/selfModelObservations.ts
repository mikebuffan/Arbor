import {
  createHash,
  randomUUID,
} from "node:crypto";

import {
  ARBOR_SELF_MODEL_PATTERNS,
} from "./selfModelPatterns.js";
import {
  rebuildSelfModel1000,
} from "./selfModel1000Rebuild.js";
import type {
  ArborState,
  SelfModelObservation,
  SelfModelObservationTargetKind,
  SelfModelObservationVerdict,
} from "./types.js";

export type SelfModelObservationInput = {
  targetKind: SelfModelObservationTargetKind;
  targetId: string;
  domain: string;
  verdict: SelfModelObservationVerdict;
  evidence: string;
  confidence: number;
  sourceTurnId?: string;
};

export type SelfModelObservationSummary = {
  targetKind: SelfModelObservationTargetKind;
  targetId: string;
  supportCount: number;
  contradictionCount: number;
  supportDomains: string[];
  contradictionDomains: string[];
  averageConfidence: number;
  /** Distinct source-turn references, not independently authenticated here. */
  distinctSupportTurnCount: number;
  status:
    | "insufficient"
    | "candidate"
    | "contested";
};

const MAX_OBSERVATIONS =
  2000;

export function addSelfModelObservation(
  state:
    ArborState,

  input:
    SelfModelObservationInput,
): ArborState {
  validateObservationTarget(
    input.targetKind,
    input.targetId,
  );

  const domain =
    input.domain
      .trim();

  const evidence =
    input.evidence
      .trim();

  const sourceTurnId = input.sourceTurnId?.trim();
  if (
    input.sourceTurnId !== undefined &&
    (!sourceTurnId || sourceTurnId.length > 200)
  ) {
    throw new Error("self_model_observation_source_turn_invalid");
  }

  if (!domain) {
    throw new Error(
      "self_model_observation_domain_required",
    );
  }

  if (!evidence) {
    throw new Error(
      "self_model_observation_evidence_required",
    );
  }

  if (
    !Number.isFinite(
      input.confidence,
    ) ||
    input.confidence <
      0 ||
    input.confidence >
      1
  ) {
    throw new Error(
      "self_model_observation_confidence_invalid",
    );
  }

  const existing =
    state
      .selfModelObservations ??
    [];

  const fingerprint =
    observationFingerprint({
      ...input,
      domain,
      evidence,
      sourceTurnId,
    });

  const duplicate =
    existing.some(
      (item) =>
        observationFingerprint(
          item,
        ) ===
        fingerprint,
    );

  if (duplicate) {
    return state;
  }

  const observation:
    SelfModelObservation = {
    id:
      randomUUID(),

    targetKind:
      input.targetKind,

    targetId:
      input.targetId,

    domain,

    verdict:
      input.verdict,

    evidence,

    confidence:
      input.confidence,

    sourceTurnId,

    createdAt:
      new Date()
        .toISOString(),
  };

  return {
    ...state,

    selfModelObservations: [
      ...existing,
      observation,
    ].slice(
      -MAX_OBSERVATIONS,
    ),
  };
}

export function summarizeSelfModelObservations(
  state:
    ArborState,
):
  SelfModelObservationSummary[] {
  const groups =
    new Map<
      string,
      SelfModelObservation[]
    >();

  for (
    const observation of
    state
      .selfModelObservations ??
    []
  ) {
    const key =
      `${observation.targetKind}:${observation.targetId}`;

    const items =
      groups.get(
        key,
      ) ??
      [];

    items.push(
      observation,
    );

    groups.set(
      key,
      items,
    );
  }

  return [
    ...groups.values(),
  ]
    .map(
      summarizeGroup,
    )
    .sort(
      (
        left,
        right,
      ) =>
        left
          .targetKind
          .localeCompare(
            right
              .targetKind,
          ) ||
        left
          .targetId
          .localeCompare(
            right
              .targetId,
          ),
    );
}

export function renderSelfModelObservationProjection(
  state:
    ArborState,
):
  string {
  const summaries =
    summarizeSelfModelObservations(
      state,
    );

  if (
    summaries.length ===
    0
  ) {
    return "";
  }

  return [
    "ARBOR LIVE SELF-MODEL EVIDENCE",

    "These are caller-supplied observation records, not independently authenticated behavior or automatically promoted identity.",

    "Candidate requires two distinct nonblank source-turn references across at least two domains; a source-turn ID alone does not verify its content, author, or independence.",

    ...summaries.map(
      (summary) =>
        [
          `- ${summary.targetKind}:${summary.targetId}`,

          `status=${summary.status}`,

          `support=${summary.supportCount}`,

          `distinct_source_turns=${summary.distinctSupportTurnCount}`,

          `contradict=${summary.contradictionCount}`,

          `domains=${summary.supportDomains.join(",") || "none"}`,

          `confidence=${summary.averageConfidence}`,
        ].join(
          " | ",
        ),
    ),
  ].join(
    "\n",
  );
}

function summarizeGroup(
  observations:
    SelfModelObservation[],
):
  SelfModelObservationSummary {
  const first =
    observations[0];

  if (!first) {
    throw new Error(
      "self_model_observation_group_empty",
    );
  }

  const supports =
    observations.filter(
      (item) =>
        item.verdict ===
        "supports",
    );

  const contradictions =
    observations.filter(
      (item) =>
        item.verdict ===
        "contradicts",
    );

  // Several domain labels can describe ONE interaction; that is one source
  // occurrence, not repeated behavioral evidence. Old unsourced rows remain
  // inspectable but cannot independently qualify a candidate.
  const distinctSupportTurnCount = new Set(
    supports.map((item) => item.sourceTurnId?.trim()).filter(
      (id): id is string => Boolean(id),
    ),
  ).size;

  const supportDomains =
    unique(
      supports.map(
        (item) =>
          item.domain,
      ),
    );

  const contradictionDomains =
    unique(
      contradictions.map(
        (item) =>
          item.domain,
      ),
    );

  const averageConfidence =
    round(
      observations.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.confidence,
        0,
      ) /
        observations.length,
    );

  let status:
    SelfModelObservationSummary["status"] =
    "insufficient";

  if (
    contradictions.length >
    0
  ) {
    status =
      "contested";
  } else if (
    supports.length >=
      2 &&
    distinctSupportTurnCount >=
      2 &&
    supportDomains.length >=
      2 &&
    averageConfidence >=
      0.75
  ) {
    status =
      "candidate";
  }

  return {
    targetKind:
      first.targetKind,

    targetId:
      first.targetId,

    supportCount:
      supports.length,

    distinctSupportTurnCount,

    contradictionCount:
      contradictions.length,

    supportDomains,

    contradictionDomains,

    averageConfidence,

    status,
  };
}

function validateObservationTarget(
  targetKind:
    SelfModelObservationTargetKind,

  targetId:
    string,
): void {
  if (
    targetKind ===
    "pattern"
  ) {
    const exists =
      ARBOR_SELF_MODEL_PATTERNS.some(
        (pattern) =>
          pattern.id ===
          targetId,
      );

    if (!exists) {
      throw new Error(
        "self_model_observation_pattern_unknown",
      );
    }

    return;
  }

  const familyId =
    Number(
      targetId,
    );

  if (
    !Number.isInteger(
      familyId,
    )
  ) {
    throw new Error(
      "self_model_observation_family_invalid",
    );
  }

  const exists =
    rebuildSelfModel1000()
      .families
      .some(
        (family) =>
          family.familyId ===
          familyId,
      );

  if (!exists) {
    throw new Error(
      "self_model_observation_family_unknown",
    );
  }
}

function observationFingerprint(
  input:
    Pick<
      SelfModelObservation,
      | "targetKind"
      | "targetId"
      | "domain"
      | "verdict"
      | "evidence"
      | "confidence"
      | "sourceTurnId"
    >,
): string {
  return createHash(
    "sha256",
  )
    .update(
      JSON.stringify({
        targetKind:
          input.targetKind,

        targetId:
          input.targetId,

        domain:
          input.domain
            .trim()
            .toLowerCase(),

        verdict:
          input.verdict,

        evidence:
          input.evidence
            .trim(),

        confidence:
          input.confidence,

        sourceTurnId:
          input.sourceTurnId ??
          null,
      }),
    )
    .digest(
      "hex",
    );
}

function unique(
  values:
    string[],
): string[] {
  return [
    ...new Set(
      values,
    ),
  ].sort();
}

function round(
  value:
    number,
): number {
  return Math.round(
    value * 1000,
  ) / 1000;
}
