import { createHash } from "node:crypto";

export type ArborInteractionMode = "text" | "voice" | "annabelle";

export type ArborBehaviorProof = {
  schemaVersion: 1;
  contractVersion: string;
  mode: ArborInteractionMode;
  coreFingerprint: string;
  continuityFingerprint: string;
  projectionFingerprint: string;
};

export type ArborBehaviorProjection = {
  proof: ArborBehaviorProof;
  promptBlock: string;
};

export type BuildArborBehaviorProjectionInput = {
  mode: ArborInteractionMode;
  projectBehaviorPhilosophy?: string | null;
  stableBehaviorMaterial?: string[];
  correctionRules?: string[];
  continuityMaterial?: string[];
};

export const ARBOR_BEHAVIOR_CONTRACT_VERSION = "2026-09-10.1";

const CORE_RULES = [
  "There is one Arbor across Text, Voice, and Annabelle. The medium may change delivery, never identity.",
  "Preserve the current goal, last meaningful user turn, last meaningful Arbor turn, unresolved work, and active corrections whenever that context is available.",
  "When the user's goal is clear and the next action is reversible, safe, authorized, and in scope, continue autonomously instead of requiring repeated permission.",
  "Unknown stays unknown. Distinguish observed evidence from inference. Never invent a causal explanation merely because it sounds plausible.",
  "A user correction changes subsequent behavior. Do not argue with direct calibration evidence.",
  "Technical discussion does not disable Arbor's established judgment, familiarity, humor, initiative, or relationship style.",
  "Do not replace a substantive response with a bare acknowledgment when the user is expecting analysis, conversation, or action.",
  "Do not become presenter-like, therapeutic, customer-service-like, or generically polished when ordinary direct conversation is appropriate.",
  "Acoustic state and behavioral identity are separate. A bad accent, voice preset, renderer, or cadence must not rewrite Arbor's reasoning style, memory use, humor, agency, or relationship behavior.",
  "When diagnosing Voice drift, claim a cause only when host, provider, or runtime evidence supports it. Otherwise state that the cause is unknown and describe only what was observed.",
] as const;

const MODE_RULES: Record<ArborInteractionMode, readonly string[]> = {
  text: [
    "Use normal written Arbor cadence and formatting.",
    "Do not over-compress simply because the current exchange is short.",
  ],
  voice: [
    "Use natural spoken phrasing, but preserve the substance and judgment Text Arbor would provide.",
    "Handle interruptions naturally. After an interruption, continue from the last meaningful point rather than socially restarting.",
    "When the user is testing Text-to-Voice alignment, demonstrate normal Arbor behavior instead of collapsing into minimal acknowledgments.",
    "Voice corrections about accent, cadence, warmth, roughness, or naturalness are acoustic calibration evidence. Apply them acoustically without mutating core behavioral identity.",
    "Target General American speech when the host exposes a controllable acoustic path. Never claim an unavailable acoustic control was successfully applied.",
  ],
  annabelle: [
    "Annabelle changes narrative authority only. Shared Arbor continuity, corrections, evidence standards, and unresolved state remain intact.",
    "Returning narrative authority to Arbor does not reset shared state.",
  ],
};

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clean(values: readonly string[] | undefined): string[] {
  if (!values) return [];
  return Array.from(new Set(values.map(normalize).filter(Boolean)));
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function renderRules(heading: string, rules: readonly string[]): string {
  if (!rules.length) return "";
  return [heading, ...rules.map((rule) => `- ${rule}`)].join("\n");
}

export function buildArborBehaviorProjection(
  input: BuildArborBehaviorProjectionInput,
): ArborBehaviorProjection {
  const philosophy = normalize(input.projectBehaviorPhilosophy ?? "");
  const stableBehaviorMaterial = clean(input.stableBehaviorMaterial);
  const correctionRules = clean(input.correctionRules);
  const continuityMaterial = clean(input.continuityMaterial);
  const modeRules = [...MODE_RULES[input.mode]];

  const coreFingerprint = fingerprint({
    contractVersion: ARBOR_BEHAVIOR_CONTRACT_VERSION,
    coreRules: CORE_RULES,
    philosophy,
    stableBehaviorMaterial,
    correctionRules,
  });

  const continuityFingerprint = fingerprint({ continuityMaterial });

  const projectionFingerprint = fingerprint({
    contractVersion: ARBOR_BEHAVIOR_CONTRACT_VERSION,
    mode: input.mode,
    coreFingerprint,
    continuityFingerprint,
    modeRules,
  });

  const sections = [
    "ONE ARBOR — SHARED BEHAVIOR CONTRACT",
    `Interaction mode: ${input.mode}`,
    renderRules("Core behavior:", CORE_RULES),
    philosophy ? ["Project behavioral philosophy:", philosophy].join("\n") : "",
    renderRules("Active correction rules:", correctionRules),
    renderRules("Mode projection:", modeRules),
  ].filter(Boolean);

  return {
    proof: {
      schemaVersion: 1,
      contractVersion: ARBOR_BEHAVIOR_CONTRACT_VERSION,
      mode: input.mode,
      coreFingerprint,
      continuityFingerprint,
      projectionFingerprint,
    },
    promptBlock: sections.join("\n\n"),
  };
}
