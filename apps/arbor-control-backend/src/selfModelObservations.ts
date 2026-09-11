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

    sourceTurnId:
      input.sourceTurnId,

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

    "These are longitudinal observations, not automatically promoted identity.",

    "Candidate means repeated supporting behavior exists across at least two domains with no contradictory observation.",

    ...summaries.map(
      (summary) =>
        [
          `- ${summary.targetKind}:${summary.targetId}`,

          `status=${summary.status}`,

          `support=${summary.supportCount}`,

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
