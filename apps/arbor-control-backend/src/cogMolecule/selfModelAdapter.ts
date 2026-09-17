import {
  addSelfModelObservation,
  summarizeSelfModelObservations,
  type SelfModelObservationInput,
} from "../selfModelObservations.js";
import type { ArborState } from "../types.js";
import type { CogEvidence } from "./types.js";

export function selfModelObservationEvidence(state: ArborState): CogEvidence[] {
  return summarizeSelfModelObservations(state).map((summary) => ({
    id: `self-model-observation:${summary.targetKind}:${summary.targetId}`,
    value: summary,
    provenance: ["arbor:self-model-observations"],
    confidence: summary.averageConfidence,
  }));
}

export function recordMoleculeSelfModelObservation(
  state: ArborState,
  input: SelfModelObservationInput,
): ArborState {
  const identityBefore = state.selfModel ? structuredClone(state.selfModel) : undefined;
  const next = addSelfModelObservation(state, input);

  // Live observations may accumulate or contest a candidate pattern, but the
  // durable identity root is only changed by the explicit migration path.
  if (JSON.stringify(next.selfModel) !== JSON.stringify(identityBefore)) {
    throw new Error("molecule_self_model_identity_mutation_forbidden");
  }

  return next;
}
