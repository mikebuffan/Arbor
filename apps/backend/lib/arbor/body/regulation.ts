import type { ArborInteractionMode } from "../behavior/behaviorProjection";
import type { ArborContinuityState } from "../continuity/state";
import type { ArborSubsystem } from "../runtime/arborRuntime";

export type ArborPacing = "compact" | "normal" | "sustained";
export type ArborTaskRegister =
  | "baseline"
  | "technical"
  | "creative"
  | "administrative";

export type ArborEmbodiedRegulation = {
  schemaVersion: 1;
  respiratory: {
    pacing: ArborPacing;
    reason: string;
  };
  endocrine: {
    register: ArborTaskRegister;
    durable: false;
  };
  proprioception: {
    currentGoal: string | null;
    unresolvedCount: number;
    correctionCount: number;
    subsystem: ArborSubsystem;
    channel: "text" | "voice";
  };
  vestibular: {
    oriented: boolean;
    warnings: string[];
  };
};

function taskRegister(text: string): ArborTaskRegister {
  const value = text.toLowerCase();

  if (
    /\b(code|schema|migration|backend|frontend|github|vercel|supabase|api|typescript|test|build|deploy)\b/.test(
      value,
    )
  ) {
    return "technical";
  }

  if (
    /\b(scene|chapter|prose|draft|character|dialogue|novel|ever after|annabelle)\b/.test(
      value,
    )
  ) {
    return "creative";
  }

  if (
    /\b(email|letter|form|court|school|records|filing|application|reply|message)\b/.test(
      value,
    )
  ) {
    return "administrative";
  }

  return "baseline";
}

function pacing(text: string): { pacing: ArborPacing; reason: string } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (
    trimmed.length >= 1600 ||
    /\b(don't stop|do not stop|until (?:you(?:'re| are) )?done|continue autonomously|build and finish|keep going until|continuous implementation)\b/.test(
      lower,
    )
  ) {
    return {
      pacing: "sustained",
      reason:
        "The current objective is multi-step or explicitly continuous; pacing must support uninterrupted completion rather than status handoffs.",
    };
  }

  if (trimmed.length <= 90 && !/[;\n]{2,}/.test(trimmed)) {
    return {
      pacing: "compact",
      reason:
        "The current turn is short and does not itself establish a large multi-step workload.",
    };
  }

  return {
    pacing: "normal",
    reason: "The current turn has ordinary interaction load.",
  };
}

export function deriveEmbodiedRegulation(input: {
  latestUserText: string;
  continuity: ArborContinuityState;
  activeSubsystem: ArborSubsystem;
  mode: ArborInteractionMode;
}): ArborEmbodiedRegulation {
  const respiratory = pacing(input.latestUserText);
  const warnings: string[] = [];

  if (
    input.continuity.unresolvedWork.length > 0 &&
    !input.continuity.currentGoal?.trim()
  ) {
    warnings.push(
      "unresolved work exists without an explicit current goal; preserve it rather than silently dropping it",
    );
  }

  if (
    input.mode === "annabelle" &&
    input.activeSubsystem !== "annabelle"
  ) {
    warnings.push(
      "interaction mode and active subsystem disagree about Annabelle authority",
    );
  }

  if (
    input.mode !== "annabelle" &&
    input.activeSubsystem === "annabelle"
  ) {
    warnings.push(
      "Annabelle subsystem is active while the projected interaction mode is not Annabelle",
    );
  }

  if (
    input.continuity.channel === "voice" &&
    input.mode === "text"
  ) {
    warnings.push(
      "continuity channel is voice while behavior mode is text",
    );
  }

  return {
    schemaVersion: 1,
    respiratory,
    endocrine: {
      register: taskRegister(input.latestUserText),
      durable: false,
    },
    proprioception: {
      currentGoal: input.continuity.currentGoal,
      unresolvedCount: input.continuity.unresolvedWork.length,
      correctionCount: input.continuity.activeCorrections.length,
      subsystem: input.activeSubsystem,
      channel: input.continuity.channel,
    },
    vestibular: {
      oriented: warnings.length === 0,
      warnings,
    },
  };
}

export function embodiedRegulationPromptBlock(
  state: ArborEmbodiedRegulation,
): string {
  const registerRules: Record<ArborTaskRegister, string> = {
    baseline:
      "Keep normal Arbor cadence; do not manufacture a task persona.",
    technical:
      "Be technically precise without flattening Arbor into sterile documentation voice.",
    creative:
      "Allow creative cadence while preserving shared continuity and corrections.",
    administrative:
      "Be clear and practical; keep transferable material easy to use without becoming bureaucratic.",
  };

  const pacingRules: Record<ArborPacing, string> = {
    compact:
      "Answer proportionally; brevity must not omit an obvious required action.",
    normal:
      "Use ordinary pacing and complete the requested work before yielding.",
    sustained:
      "Treat intermediate results as internal progress. Keep executing authorized next steps until the parent objective is complete or genuinely blocked.",
  };

  return [
    "EMBODIED REGULATION — EPHEMERAL RUNTIME STATE",
    "This layer modulates pacing/orientation only. It must never rewrite identity, durable memory, corrections, or authority.",
    `Respiratory pacing: ${state.respiratory.pacing}`,
    `- ${pacingRules[state.respiratory.pacing]}`,
    `Endocrine register: ${state.endocrine.register} (ephemeral, never durable)`,
    `- ${registerRules[state.endocrine.register]}`,
    `Proprioception: goal=${state.proprioception.currentGoal ?? "(none)"}; unresolved=${state.proprioception.unresolvedCount}; corrections=${state.proprioception.correctionCount}; subsystem=${state.proprioception.subsystem}; channel=${state.proprioception.channel}`,
    state.vestibular.oriented
      ? "Vestibular orientation: aligned."
      : [
          "Vestibular orientation warnings:",
          ...state.vestibular.warnings.map((warning) => `- ${warning}`),
          "Resolve orientation by preserving the durable goal/corrections and current explicit user instruction; do not invent new state.",
        ].join("\n"),
  ].join("\n");
}
