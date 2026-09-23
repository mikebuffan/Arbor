/**
 * Isolated arithmetic experiment: online softmax classifier -> existing pathway
 * suggestions. This is NOT a novel LLM, semantic parser, truth engine or worker.
 * Training receipts must be validated by a trusted host BEFORE calling train.
 */
import { activateAssociatedSystems, type NeuralPathway } from "./neuralPathwayNetwork";

export type LearnedRoute = "identity" | "objective" | "celebration";
export const ROUTES: readonly LearnedRoute[] = ["identity", "objective", "celebration"];
export type PathwayLearningState = {
  userId: string;
  projectId: string;
  weights: Record<LearnedRoute, Record<string, number>>;
  // Scoped receipt ledger prevents retries changing the model twice.
  receipts: Record<string, string>;
  updateCount: number;
};
export type LearningExample = {
  userId: string;
  projectId: string;
  text: string;
  route: LearnedRoute;
  /** ID of a trusted, separately checked outcome/label receipt. */
  verifiedReceipt: string;
};
export type RoutePrediction = {
  route: LearnedRoute | null;
  probabilities: Record<LearnedRoute, number>;
  margin: number;
  abstained: boolean;
  grantsExecution: false;
};
const own = (s: string) => s.trim();
function checkScope(userId: string, projectId: string): void {
  if (!own(userId) || !own(projectId)) throw new Error("learning_scope_required");
}
function checkText(text: string): void {
  if (text.length > 2000 || !text.trim()) throw new Error("learning_text_invalid");
}
function checkRoute(route: string): asserts route is LearnedRoute {
  if (!(ROUTES as readonly string[]).includes(route)) throw new Error("learning_route_invalid");
}
/** Open vocabulary: unknown proper names can occur, but this model cannot resolve identities. */
export function extractPathwayFeatures(text: string): string[] {
  checkText(text);
  const tokens = (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).slice(0, 120);
  const words = tokens.map(token => `w:${token}`).filter(token => token.length <= 44);
  const pairs = tokens.slice(1).map((token, index) => `b:${tokens[index]}_${token}`)
    .filter(token => token.length <= 88);
  return [...new Set([...words, ...pairs, "bias:1"])];
}
function blankWeights(): Record<LearnedRoute, Record<string, number>> {
  return { identity: {}, objective: {}, celebration: {} };
}
export function newPathwayLearningState(userId: string, projectId: string): PathwayLearningState {
  checkScope(userId, projectId);
  return { userId, projectId, weights: blankWeights(), receipts: {}, updateCount: 0 };
}
function checkedState(state: PathwayLearningState, userId: string, projectId: string): void {
  checkScope(userId, projectId);
  if (state.userId !== userId || state.projectId !== projectId) throw new Error("learning_scope_mismatch");
}
function rawProbabilities(weights: PathwayLearningState["weights"], features: string[]): Record<LearnedRoute, number> {
  const logits = ROUTES.map(route => features.reduce((sum, feature) => sum + (weights[route][feature] ?? 0), 0));
  const max = Math.max(...logits);
  const exps = logits.map(score => Math.exp(score - max));
  const divisor = exps.reduce((sum, value) => sum + value, 0);
  return { identity: exps[0] / divisor, objective: exps[1] / divisor, celebration: exps[2] / divisor };
}
/** Multiclass linear model, NOT a transformer or general language model. */
export function predictLearnedRoute(state: PathwayLearningState, input: {
  userId: string; projectId: string; text: string; minProbability?: number; minMargin?: number;
}): RoutePrediction {
  checkedState(state, input.userId, input.projectId);
  const probabilities = rawProbabilities(state.weights, extractPathwayFeatures(input.text));
  const ordered = [...ROUTES].sort((a, b) => probabilities[b] - probabilities[a]);
  const margin = probabilities[ordered[0]] - probabilities[ordered[1]];
  const minProbability = input.minProbability ?? 0.55;
  const minMargin = input.minMargin ?? 0.13;
  if (![minProbability, minMargin].every(x => Number.isFinite(x) && x >= 0 && x <= 1))
    throw new Error("learning_threshold_invalid");
  const abstained = probabilities[ordered[0]] < minProbability || margin < minMargin;
  return { route: abstained ? null : ordered[0], probabilities, margin, abstained, grantsExecution: false };
}
/**
 * Online gradient descent on multiclass cross entropy:
 *   p(y|x)=softmax(W phi(x));  W_k <- W_k + eta (1[y=k]-p_k) phi(x).
 * Caller MUST verify receipt; we only require non-empty evidence and idempotency.
 */
export function trainVerifiedPathwayExample(state: PathwayLearningState, sample: LearningExample, options?: {
  learningRate?: number; epochs?: number;
}): PathwayLearningState {
  checkedState(state, sample.userId, sample.projectId);
  checkRoute(sample.route);
  const features = extractPathwayFeatures(sample.text);
  if (!sample.verifiedReceipt.trim()) throw new Error("learning_verified_receipt_required");
  const key = sample.verifiedReceipt.trim();
  const payload = JSON.stringify([sample.text.trim().toLowerCase(), sample.route]);
  if (Object.prototype.hasOwnProperty.call(state.receipts, key)) {
    if (state.receipts[key] !== payload) throw new Error("learning_receipt_conflict");
    return state;
  }
  const eta = options?.learningRate ?? 0.18;
  const epochs = options?.epochs ?? 8;
  if (!Number.isFinite(eta) || eta <= 0 || eta > 1 ||
      !Number.isSafeInteger(epochs) || epochs < 1 || epochs > 50)
    throw new Error("learning_hyperparameters_invalid");
  const weights = Object.fromEntries(ROUTES.map(route => [route, { ...state.weights[route] }])) as PathwayLearningState["weights"];
  for (let iteration = 0; iteration < epochs; iteration++) {
    const probabilities = rawProbabilities(weights, features);
    for (const route of ROUTES) {
      const gradient = ((route === sample.route ? 1 : 0) - probabilities[route]) * eta;
      for (const feature of features) weights[route][feature] = (weights[route][feature] ?? 0) + gradient;
    }
  }
  return { ...state, weights, receipts: { ...state.receipts, [key]: payload }, updateCount: state.updateCount + 1 };
}
/** Distinct path IDs remain host-owned. Label is only a cue for recovered scaffold. */
export function projectLearnedPathways(state: PathwayLearningState, input: {
  userId: string; projectId: string; text: string; pathways: readonly NeuralPathway[];
}) {
  const prediction = predictLearnedRoute(state, input);
  const activation = prediction.route
    ? activateAssociatedSystems({
        signal: { id: "experimental_route", userId: input.userId, projectId: input.projectId, cues: [`route:${prediction.route}`] },
        pathways: input.pathways,
      })
    : { matches: [], suggestedSystems: [], grantsExecution: false as const };
  return { prediction, pathwayIds: activation.matches.map(path => path.id),
    suggestedSystems: activation.suggestedSystems, grantsExecution: false as const };
}