import { routeRoundabout, type RoundaboutRoute } from "./roundabout.js";
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
  roundabout: RoundaboutRoute;
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
    roundabout: routeRoundabout([], 4, now),
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
  const signalMap = new Map<string, BridgeSignal>();
  for (const signal of [...prior.signals, ...(input.signals ?? [])]) {
    signalMap.set(signal.id, signal);
  }

  const signals = [...signalMap.values()]
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
    roundabout: routeRoundabout(signals, input.attentionCapacity ?? 4, now),
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
    state.roundabout.reprocessIds.length
      ? `ROUNDABOUT REPROCESS: ${state.roundabout.reprocessIds.join(", ")}`
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


export function mergeCognitiveRuntimeState(
  project: CognitiveRuntimeState | undefined,
  conversation: CognitiveRuntimeState | undefined,
  now = Date.now(),
): CognitiveRuntimeState {
  if (!project && !conversation) return emptyCognitiveRuntimeState(now);
  if (!project) return structuredClone(conversation!);
  if (!conversation) return structuredClone(project);

  const signalMap = new Map<string, BridgeSignal>();
  for (const signal of [...project.signals, ...conversation.signals]) {
    signalMap.set(signal.id, signal);
  }
  const signals = [...signalMap.values()]
    .filter((signal) => !signal.validUntil || now < Date.parse(signal.validUntil));

  const predictionMap = new Map<string, PredictionRecord>();
  for (const prediction of [...project.predictions, ...conversation.predictions]) {
    predictionMap.set(prediction.id, prediction);
  }

  const counterfactuals = rankCounterfactuals([
    ...project.counterfactuals,
    ...conversation.counterfactuals,
  ].filter((item, index, all) =>
    all.findIndex((other) => other.id === item.id) === index
  ));

  const consolidationMap = new Map<string, ConsolidationCandidate>();
  for (const item of [...project.consolidation, ...conversation.consolidation]) {
    consolidationMap.set(item.id, item);
  }

  const traceKey = (trace: CausalTrace) =>
    `${trace.eventId}\u0000${trace.choiceId ?? ""}\u0000${trace.provenance.join("|")}`;
  const traceMap = new Map<string, CausalTrace>();
  for (const trace of [...project.causalTraces, ...conversation.causalTraces]) {
    traceMap.set(traceKey(trace), trace);
  }

  return {
    signals,
    attention: allocateAttention(signals, 4, now),
    predictions: [...predictionMap.values()].slice(-100),
    counterfactuals,
    exploration: conversation.exploration ?? project.exploration,
    consolidation: [...consolidationMap.values()].slice(-100),
    causalTraces: [...traceMap.values()].slice(-100),
    roundabout: routeRoundabout(signals, 4, now),
    updatedAt: new Date(now).toISOString(),
  };
}
