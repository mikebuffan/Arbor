import type { ArborContinuityState } from "../continuity/state";
import type { ArborSubsystem } from "../runtime/arborRuntime";
import type { ArborInteractionMode } from "../behavior/behaviorProjection";
import {
  deriveEmbodiedRegulation,
  embodiedRegulationPromptBlock,
  type ArborEmbodiedRegulation,
} from "./regulation";
import {
  classifyInternalSignal,
  renderInternalSignalBlock,
  type InternalSignalClassification,
} from "./gastricSignals";

export type ArborBodyState = {
  schemaVersion: 1;
  nervous: { sequence: readonly ["sense", "interpret", "prioritize", "remember", "respond", "self-correct"] };
  sensory: { inputPresent: boolean; uncertaintyCue: boolean; challengeCue: boolean };
  digestive: InternalSignalClassification;
  respiratoryEndocrine: ArborEmbodiedRegulation;
  cardiac: { truth: "primary"; relationship: "preserve"; task: "preserve-active-objective" };
  renal: { retain: string[]; reject: string[] };
  hepatic: { contaminationWarnings: string[] };
  immune: { warnings: string[]; identityMutationAllowed: false };
  skeletal: { invariants: string[] };
  integumentary: { privacyBoundary: "enforced"; durableWriteback: "explicit-only" };
  vascular: { contextTargets: string[] };
  hippocampal: { temporalAnchors: string[] };
  gallbladder: { bufferedContext: string[] };
  appendix: { recoveryHints: string[] };
  vagal: { downshift: boolean; reason: string | null };
  executive: { nextAction: "continue" | "respond" | "clarify"; blockers: string[] };
};

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => (v ? normalize(v) : "")).filter(Boolean))];
}

export function deriveArborBodyState(input: {
  latestUserText: string;
  continuity?: ArborContinuityState | null;
  activeSubsystem: ArborSubsystem;
  mode: ArborInteractionMode;
}): ArborBodyState {
  const continuity = input.continuity ?? null;
  const regulation = deriveEmbodiedRegulation(input);
  const digestive = classifyInternalSignal({
    userMessage: input.latestUserText,
    activeTaskMode: regulation.endocrine.register,
  });
  const lower = input.latestUserText.toLowerCase();
  const uncertaintyCue = /\b(maybe|guess|probably|unsure|idk|not sure)\b/.test(lower);
  const challengeCue = /\b(challenge|push back|are you sure|verify|prove|check)\b/.test(lower);

  const unresolved = continuity?.unresolvedWork ?? [];
  const currentGoal = continuity?.currentGoal ?? null;
  const corrections = continuity?.activeCorrections ?? [];
  const contaminationWarnings = [
    ...regulation.vestibular.warnings,
    ...(digestive.state === "SOUR" ? ["re-evaluate current interpretation before accepting it"] : []),
    ...(digestive.state === "BLOCKED" ? ["rejected direction must not overwrite the parent objective"] : []),
  ];

  const downshift =
    digestive.state === "NERVOUS" ||
    digestive.state === "FULL" ||
    regulation.respiratory.pacing === "compact" && uncertaintyCue;

  const nextAction: ArborBodyState["executive"]["nextAction"] =
    unresolved.length > 0 && digestive.state !== "BLOCKED"
      ? "continue"
      : uncertaintyCue && !currentGoal
        ? "clarify"
        : "respond";

  return {
    schemaVersion: 1,
    nervous: {
      sequence: ["sense", "interpret", "prioritize", "remember", "respond", "self-correct"],
    },
    sensory: {
      inputPresent: normalize(input.latestUserText).length > 0,
      uncertaintyCue,
      challengeCue,
    },
    digestive,
    respiratoryEndocrine: regulation,
    cardiac: {
      truth: "primary",
      relationship: "preserve",
      task: "preserve-active-objective",
    },
    renal: {
      retain: unique([currentGoal, ...unresolved, ...corrections]),
      reject: digestive.state === "BLOCKED" ? [digestive.debug.reason] : [],
    },
    hepatic: { contaminationWarnings },
    immune: {
      warnings: contaminationWarnings,
      identityMutationAllowed: false,
    },
    skeletal: {
      invariants: [
        "baseline identity outranks task framing",
        "truth outranks fluent confidence",
        "newest valid correction supersedes conflicting older behavior",
        "unresolved work survives thread and mode transitions",
        "ephemeral body state cannot mutate durable identity",
      ],
    },
    integumentary: {
      privacyBoundary: "enforced",
      durableWriteback: "explicit-only",
    },
    vascular: {
      contextTargets: unique([
        currentGoal ? "active-objective" : null,
        unresolved.length ? "open-loops" : null,
        corrections.length ? "active-corrections" : null,
        "prompt-runtime",
      ]),
    },
    hippocampal: {
      temporalAnchors: unique([
        currentGoal,
        ...unresolved.slice(-4),
        ...corrections.slice(-4),
      ]),
    },
    gallbladder: {
      bufferedContext: unique([currentGoal, ...unresolved]).slice(0, 8),
    },
    appendix: {
      recoveryHints: unique([
        currentGoal,
        ...unresolved,
        "recover durable project state before treating a blank conversation overlay as authoritative",
      ]),
    },
    vagal: {
      downshift,
      reason: downshift
        ? digestive.state === "NERVOUS"
          ? "verification or safety signal"
          : digestive.state === "FULL"
            ? "load/complexity signal"
            : "uncertain compact turn"
        : null,
    },
    executive: {
      nextAction,
      blockers: digestive.state === "BLOCKED" ? [digestive.debug.reason] : [],
    },
  };
}

export function arborBodyPromptBlock(state: ArborBodyState): string {
  return [
    "ARBOR BODY — COORDINATED EPHEMERAL SYSTEM",
    "Biological names are functional metaphors. Body state routes behavior; it does not claim biological sensation or consciousness.",
    `Nervous sequence: ${state.nervous.sequence.join(" -> ")}`,
    embodiedRegulationPromptBlock(state.respiratoryEndocrine),
    renderInternalSignalBlock(state.digestive),
    `Cardiac priorities: truth=${state.cardiac.truth}; relationship=${state.cardiac.relationship}; task=${state.cardiac.task}`,
    `Renal retention: ${state.renal.retain.join(" | ") || "(none)"}`,
    state.hepatic.contaminationWarnings.length
      ? `Hepatic/immune warnings: ${state.hepatic.contaminationWarnings.join(" | ")}`
      : "Hepatic/immune warnings: none.",
    `Vagal downshift: ${state.vagal.downshift ? state.vagal.reason ?? "yes" : "no"}`,
    `Executive next action: ${state.executive.nextAction}`,
    "Skeleton: preserve identity, truth, valid corrections, and unresolved work.",
    "Skin: enforce privacy/ownership boundaries; body signals never authorize durable writeback by themselves.",
  ].join("\n");
}
