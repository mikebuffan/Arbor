/**
 * Glow vs Noise — a bounded advisor over values explicitly supplied to a
 * trusted host. Reuses the control backend's existing counterfactual sorter.
 *
 * "Protect" is a supplied priority, not a hidden judgment about a person's
 * health, obligations or capacity. Evidence refs and asserted priority sources
 * are NOT verified inside this pure function; it grants no action authority.
 */
import { rankCounterfactuals } from "./cognitiveDynamics.js";

export type GlowScope = { userId: string; projectId: string };
export type GlowOption = GlowScope & {
  id: string;
  label: string;
  priority: "protect" | "optional" | "unspecified";
  prioritySource: "user-stated" | "reviewed-plan" | "unreviewed";
  expectedUtility: number;
  evidenceConfidence: number;
  reversible: boolean;
  blocked: boolean;
  evidenceRefs: string[];
};
export type GlowSignal = {
  id: string;
  label: string;
  priorityBasis: GlowOption["prioritySource"];
  evidenceRefs: string[];
  reversible: boolean;
  blocked: boolean;
};
export type GlowNoiseProjection = {
  scope: GlowScope;
  glow: GlowSignal[];
  noise: GlowSignal[];
  review: Array<GlowSignal & { reason:
    "unspecified_priority" | "unreviewed_priority" | "missing_evidence" |
    "blocked_or_irreversible" }>;
  /** Uses EXISTING rankCounterfactuals; only eligible, reversible glow options. */
  rankedReversibleGlowIds: string[];
  hasIrreversibleFork: boolean;
  valuesVerifiedHere: false;
  evidenceVerifiedHere: false;
  grantsExecution: false;
  determinesHumanCapacity: false;
  overridesHumanChoice: false;
};
const nonempty = (value: unknown, max = 200): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const bounded = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

export function projectGlowNoise(input: {
  scope: GlowScope; options: readonly GlowOption[];
}): GlowNoiseProjection {
  if (!input.scope || !nonempty(input.scope.userId) ||
      !nonempty(input.scope.projectId))
    throw Error("glow_noise_scope_required");
  if (!Array.isArray(input.options) || input.options.length > 24)
    throw Error("glow_noise_input_invalid");
  const seen = new Set<string>();
  const glow: GlowSignal[] = [];
  const noise: GlowSignal[] = [];
  const review: GlowNoiseProjection["review"] = [];
  const eligible: Array<{ id: string; expectedUtility: number;
    evidenceConfidence: number; reversible: boolean; blocked: boolean }> = [];

  for (const item of input.options) {
    if (!item || item.userId !== input.scope.userId ||
        item.projectId !== input.scope.projectId)
      throw Error("glow_noise_scope_mismatch");
    if (!nonempty(item.id) || !nonempty(item.label, 500) ||
        !["protect", "optional", "unspecified"].includes(item.priority) ||
        !["user-stated", "reviewed-plan", "unreviewed"].includes(item.prioritySource) ||
        !bounded(item.expectedUtility) || !bounded(item.evidenceConfidence) ||
        typeof item.reversible !== "boolean" || typeof item.blocked !== "boolean" ||
        !Array.isArray(item.evidenceRefs) || item.evidenceRefs.length > 10 ||
        Array.from(item.evidenceRefs).some((ref) => !nonempty(ref)))
      throw Error("glow_noise_option_invalid");
    if (seen.has(item.id)) throw Error("glow_noise_duplicate_option");
    seen.add(item.id);
    const publicSignal: GlowSignal = {
      id: item.id, label: item.label, priorityBasis: item.prioritySource,
      evidenceRefs: [...item.evidenceRefs],
      reversible: item.reversible, blocked: item.blocked,
    };
    if (item.priority === "unspecified") {
      review.push({ ...publicSignal, reason: "unspecified_priority" });
    } else if (item.prioritySource === "unreviewed") {
      review.push({ ...publicSignal, reason: "unreviewed_priority" });
    } else if (!item.evidenceRefs.length || item.evidenceConfidence === 0) {
      review.push({ ...publicSignal, reason: "missing_evidence" });
    } else {
      if (item.priority === "protect") glow.push(publicSignal);
      else noise.push(publicSignal);
      if (item.blocked || !item.reversible) {
        review.push({ ...publicSignal, reason: "blocked_or_irreversible" });
      } else if (item.priority === "protect") {
        eligible.push({
          id: item.id, expectedUtility: item.expectedUtility,
          evidenceConfidence: item.evidenceConfidence,
          reversible: item.reversible, blocked: item.blocked,
        });
      }
    }
  }
  return {
    scope: { ...input.scope }, glow, noise, review,
    rankedReversibleGlowIds: rankCounterfactuals(eligible).map(x => x.id),
    hasIrreversibleFork: input.options.some(x => !x.reversible),
    valuesVerifiedHere: false,
    evidenceVerifiedHere: false,
    grantsExecution: false,
    determinesHumanCapacity: false,
    overridesHumanChoice: false,
  };
}
