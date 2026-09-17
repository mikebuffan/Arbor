import {
  allocateAttention,
  chooseExploration,
  consolidate,
  observePrediction,
  rankCounterfactuals,
  type AttentionState,
  type BridgeSignal,
  type CausalTrace,
  type ConsolidationCandidate,
  type CounterfactualOption,
  type CuriosityCandidate,
  type PredictionRecord,
} from "./cognitiveDynamics.js";

export interface CognitiveRuntimeState {
  signals: BridgeSignal[];
  attention: AttentionState;
  predictions: PredictionRecord[];
  counterfactuals: CounterfactualOption[];
  exploration: CuriosityCandidate | null;
  consolidation: ConsolidationCandidate[];
  causalTraces: CausalTrace[];
  updatedAt: string;
}

export function emptyCognitiveRuntimeState(now = Date.now()): CognitiveRuntimeState {
  return {
    signals: [],
    attention: { focusIds: [], unresolvedIds: [], reasons: {} },
    predictions: [],
    counterfactuals: [],
    exploration: null,
    consolidation: [],
    causalTraces: [],
    updatedAt: new Date(now).toISOString(),
  };
}

export function updateCognitiveRuntime(input: {
  prior?: CognitiveRuntimeState;
  signals?: BridgeSignal[];
  prediction?: { id: string; expectation: number; observed: number };
  counterfactuals?: CounterfactualOption[];
  curiosity?: CuriosityCandidate[];
  consolidation?: ConsolidationCandidate[];
  causalTrace?: CausalTrace;
  attentionCapacity?: number;
  now?: number;
}): CognitiveRuntimeState {
  const now = input.now ?? Date.now();
  const prior = input.prior ?? emptyCognitiveRuntimeState(now);
  const signals = [...prior.signals, ...(input.signals ?? [])]
    .filter((signal, index, all) => all.findLastIndex((x) => x.id === signal.id) === index)
    .filter((signal) => !signal.validUntil || now < Date.parse(signal.validUntil));

  const predictions = input.prediction
    ? upsert(prior.predictions, observePrediction(
        input.prediction.id,
        input.prediction.expectation,
        input.prediction.observed,
      ))
    : [...prior.predictions];

  const counterfactuals = input.counterfactuals
    ? rankCounterfactuals(input.counterfactuals)
    : [...prior.counterfactuals];

  return {
    signals,
    attention: allocateAttention(signals, input.attentionCapacity ?? 4, now),
    predictions,
    counterfactuals,
    exploration: input.curiosity
      ? chooseExploration(input.curiosity)
      : prior.exploration,
    consolidation: input.consolidation
      ? consolidate(input.consolidation)
      : [...prior.consolidation],
    causalTraces: input.causalTrace
      ? [...prior.causalTraces, input.causalTrace].slice(-100)
      : [...prior.causalTraces],
    updatedAt: new Date(now).toISOString(),
  };
}

export function renderCognitiveRuntime(state?: CognitiveRuntimeState): string {
  if (!state) return "";
  return [
    "COGNITIVE RUNTIME STATE.",
    state.attention.focusIds.length
      ? `ATTENTION: ${state.attention.focusIds.join(", ")}`
      : "",
    state.attention.unresolvedIds.length
      ? `UNRESOLVED CONFLICT: ${state.attention.unresolvedIds.join(", ")}`
      : "",
    state.predictions.some((x) => x.material)
      ? `MATERIAL PREDICTION ERRORS: ${state.predictions.filter((x) => x.material).map((x) => x.id).join(", ")}`
      : "",
    state.counterfactuals.length
      ? `AVAILABLE CHOICES: ${state.counterfactuals.map((x) => x.id).join(", ")}`
      : "",
    state.exploration
      ? `NEXT INFORMATION-GAIN TARGET: ${state.exploration.id}`
      : "",
  ].filter(Boolean).join("\n");
}

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return [...items.filter((x) => x.id !== item.id), item].slice(-100);
}
