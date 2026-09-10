import type { ArborBehaviorProof } from "../behavior/behaviorProjection";
import type { AgencyState } from "../agency/engine";
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

  createdAt: string;
  updatedAt: string;
};

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeCorrection(
  correction: ArborCorrection,
): ArborCorrection {
  return {
    ...correction,
    value: correction.value.trim(),
    confidence: clampConfidence(correction.confidence),
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

    if (!prior || normalized.observedAt >= prior.observedAt) {
      byId.set(normalized.id, normalized);
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.observedAt.localeCompare(b.observedAt),
  );
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
