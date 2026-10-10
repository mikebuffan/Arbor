import type { ArborBehaviorProof } from "../behavior/behaviorProjection";
import type { AgencyState } from "../agency/engine";
import type { PendingSelfUpdate } from "../agency/updateLifecycle";
import type { ArborSubsystem } from "./arborRuntime";

export type ArborChannel = "text" | "voice";

export type ArborCorrectionKind =
  | "behavior"
  | "acoustic"
  | "authority"
  | "preference";

export type ArborCorrection = {
  id: string;
  kind: ArborCorrectionKind;
  value: string;
  source: ArborChannel | "annabelle";
  observedAt: string;
  confidence: number;
  protected: boolean;
  occurrences?: number;
  /** Stable trusted-host user-message observation IDs, not correction family IDs. */
  observationIds?: string[];
  /** Historic count not attributable to stored individual observation IDs. */
  legacyOccurrences?: number;
};

export type ArborRuntimeState = {
  schemaVersion: 1;

  userId: string;
  projectId: string;
  conversationId: string;

  channel: ArborChannel;
  activeSubsystem: ArborSubsystem;

  currentGoal: string | null;

  lastMeaningfulUserTurn: string | null;
  lastMeaningfulArborTurn: string | null;

  agency: AgencyState | null;

  corrections: ArborCorrection[];

  behaviorProof: ArborBehaviorProof | null;

  pendingSelfUpdate: PendingSelfUpdate | null;

  createdAt: string;
  updatedAt: string;
};

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

const MAX_OBSERVATION_IDS = 128;
const OBSERVATION_ID = /^[A-Za-z0-9._:-]{4,200}$/;

/** Validate persisted provenance without manufacturing identities for legacy data. */
export function normalizeCorrection(
  correction: ArborCorrection,
): ArborCorrection {
  const result: ArborCorrection = {
    ...correction,
    value: correction.value.trim(),
    confidence: clampConfidence(correction.confidence),
    occurrences: Math.max(1, Number(correction.occurrences ?? 1)),
  };
  if (correction.observationIds === undefined) {
    if (correction.legacyOccurrences !== undefined)
      throw new Error("arbor_correction_invalid_observation_ids");
    return result;
  }
  const ids = correction.observationIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > MAX_OBSERVATION_IDS ||
      ids.some(id => typeof id !== "string" || !OBSERVATION_ID.test(id)) ||
      new Set(ids).size !== ids.length ||
      !Number.isSafeInteger(result.occurrences) || result.occurrences! < ids.length)
    throw new Error("arbor_correction_invalid_observation_ids");
  const baseline = correction.legacyOccurrences ??
    (result.occurrences! - ids.length);
  if (!Number.isSafeInteger(baseline) || baseline < 0 ||
      baseline + ids.length !== result.occurrences)
    throw new Error("arbor_correction_invalid_observation_ids");
  result.observationIds = [...ids].sort();
  result.legacyOccurrences = baseline;
  return result;
}

function combinedCorrection(
  prior: ArborCorrection,
  next: ArborCorrection,
  fromSnapshot: boolean,
): ArborCorrection {
  const priorCount = prior.occurrences ?? 1;
  const incomingCount = next.occurrences ?? 1;
  const latest = Date.parse(next.observedAt) >= Date.parse(prior.observedAt)
    ? next : prior;
  const priorIds = prior.observationIds ?? [];
  const incomingIds = next.observationIds ?? [];

  if (!priorIds.length && !incomingIds.length) {
    // Legacy snapshots can contain copies of the same events. Preserve the
    // original conservative legacy behavior until host event IDs are known.
    const sameObservation = Date.parse(next.observedAt) === Date.parse(prior.observedAt) &&
      next.kind === prior.kind && next.value === prior.value && next.source === prior.source;
    return { ...latest, occurrences: fromSnapshot || sameObservation ||
      incomingCount > 1 ? Math.max(priorCount, incomingCount) : priorCount + 1 };
  }

  const known = [...new Set([...priorIds, ...incomingIds])].sort();
  if (known.length > MAX_OBSERVATION_IDS)
    throw new Error("arbor_correction_observation_limit");

  const priorBase = prior.observationIds?.length ? prior.legacyOccurrences ?? 0 : 0;
  const incomingBase = next.observationIds?.length ? next.legacyOccurrences ?? 0 : 0;
  let baseline = Math.max(priorBase, incomingBase);

  if (!fromSnapshot && !priorIds.length && incomingIds.length === 1 &&
      incomingCount === 1 && incomingBase === 0) {
    // A new host-attributed single user turn adds one observation after an
    // old count that never had per-event provenance.
    baseline = Math.max(baseline, priorCount);
  } else {
    // Copied unkeyed snapshots may already contain the known IDs: never
    // blindly add their entire count to the IDs.
    if (!priorIds.length) baseline = Math.max(baseline, priorCount - known.length);
    if (!incomingIds.length) baseline = Math.max(baseline, incomingCount - known.length);
  }

  // A keyed aggregate can only grow by previously unseen event IDs. An
  // unkeyed input without new evidence cannot increase it by a retry.
  const occurrences = Math.max(priorCount, incomingCount, baseline + known.length);
  baseline = occurrences - known.length;
  return {
    ...latest,
    observationIds: known,
    legacyOccurrences: baseline,
    occurrences,
  };
}

export function mergeCorrections(
  existing: ArborCorrection[],
  incoming: ArborCorrection[],
): ArborCorrection[] {
  const byId = new Map<string, ArborCorrection>();
  for (const correction of [...existing, ...incoming]) {
    const normalized = normalizeCorrection(correction);
    if (!normalized.value) continue;
    const prior = byId.get(normalized.id);
    byId.set(normalized.id, prior
      ? combinedCorrection(prior, normalized, false)
      : normalized);
  }
  return [...byId.values()].sort((a, b) =>
    Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

/** Cross-conversation snapshots are copies, not independent new feedback.
 * Known host IDs can be unioned; unverifiable historical counts remain only
 * a conservative baseline and must never auto-authorize promotion.
 */
export function mergeCorrectionSnapshots(
  snapshots: readonly ArborCorrection[][],
): ArborCorrection[] {
  const byId = new Map<string, ArborCorrection>();
  for (const snapshot of snapshots) {
    for (const correction of snapshot) {
      const normalized = normalizeCorrection(correction);
      if (!normalized.value) continue;
      const prior = byId.get(normalized.id);
      byId.set(normalized.id, prior
        ? combinedCorrection(prior, normalized, true)
        : normalized);
    }
  }
  return [...byId.values()].sort((a, b) =>
    Date.parse(a.observedAt) - Date.parse(b.observedAt) ||
    a.id.localeCompare(b.id));
}

export function switchRuntimeChannel(
  state: ArborRuntimeState,
  channel: ArborChannel,
  updatedAt: string,
): ArborRuntimeState {
  return {
    ...state,
    channel,
    updatedAt,
  };
}

export function switchRuntimeSubsystem(
  state: ArborRuntimeState,
  activeSubsystem: ArborSubsystem,
  updatedAt: string,
): ArborRuntimeState {
  return {
    ...state,
    activeSubsystem,
    updatedAt,
  };
}
