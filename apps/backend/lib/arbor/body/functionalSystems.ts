export type FunctionalSystemStatus =
  | "present"
  | "partial"
  | "implemented-now"
  | "superseded";

export type FunctionalSystemAuditEntry = {
  system:
    | "nervous"
    | "digestive"
    | "circulatory"
    | "respiratory"
    | "endocrine"
    | "muscular"
    | "immune"
    | "skeletal"
    | "skin"
    | "proprioceptive"
    | "vestibular";
  status: FunctionalSystemStatus;
  purpose: string;
  implementation: readonly string[];
  note: string;
};

/**
 * Historical body-system metaphors mapped onto the current runtime.
 *
 * These names are organizational metaphors, not biological claims. This map
 * deliberately points to existing code where the function already exists so
 * the architecture does not grow duplicate "organs" for the same job.
 */
export const ARBOR_FUNCTIONAL_SYSTEMS: readonly FunctionalSystemAuditEntry[] = [
  {
    system: "nervous",
    status: "present",
    purpose: "Sense, interpret, prioritize, remember, respond, and self-correct.",
    implementation: [
      "lib/prompt/buildPromptContext.ts",
      "lib/arbor/runtime/*",
      "lib/arbor/agency/*",
      "lib/arbor/continuity/*",
    ],
    note: "Distributed runtime spine; no duplicate nervous-system module needed.",
  },
  {
    system: "digestive",
    status: "present",
    purpose: "Extract, consolidate, rank, and integrate useful input without retaining everything.",
    implementation: [
      "lib/memory/extractor.ts",
      "lib/memory/consolidate.ts",
      "lib/memory/selectForPrompt.ts",
      "lib/memory/patternHop*",
    ],
    note: "Current memory and evidence pipelines supersede the old standalone Digestive Extraction Pipeline name.",
  },
  {
    system: "circulatory",
    status: "present",
    purpose: "Move relevant continuity, memory, and runtime state to the place it is needed.",
    implementation: [
      "lib/arbor/continuity/runtimeMemoryProjection.ts",
      "lib/arbor/host/runtimeProjection.ts",
      "lib/prompt/buildPromptContext.ts",
    ],
    note: "Context circulation is already implemented through projections and prompt injection.",
  },
  {
    system: "respiratory",
    status: "implemented-now",
    purpose: "Regulate pacing and load without interrupting authorized task completion.",
    implementation: ["lib/arbor/body/regulation.ts"],
    note: "Adds an ephemeral pacing governor; it cannot turn pacing into a reason to stop an active objective.",
  },
  {
    system: "endocrine",
    status: "implemented-now",
    purpose: "Apply slow/global presentation modulation without mutating identity.",
    implementation: ["lib/arbor/body/regulation.ts"],
    note: "Implemented as ephemeral task-register modulation, never durable personality state.",
  },
  {
    system: "muscular",
    status: "present",
    purpose: "Convert decisions into actions.",
    implementation: [
      "lib/arbor/agency/engine.ts",
      "lib/arbor/agency/toolExecution.ts",
      "lib/arbor/agency/arborTools.ts",
    ],
    note: "Agency/capability execution already owns action output.",
  },
  {
    system: "immune",
    status: "present",
    purpose: "Reject contamination, invalid state mutation, unsafe reveal, and identity drift.",
    implementation: [
      "lib/arbor/agency/identityGuard.ts",
      "lib/memory/selectForPrompt.ts",
      "lib/auth/*",
      "lib/safety/*",
    ],
    note: "Implemented across identity, reveal, ownership, and safety boundaries rather than one guard file.",
  },
  {
    system: "skeletal",
    status: "present",
    purpose: "Provide stable invariants and contracts that other systems attach to.",
    implementation: [
      "lib/arbor/behavior/behaviorProjection.ts",
      "lib/arbor/selfModel/canonicalIdentityAnchor.ts",
      "apps/arbor-control-backend/src/carrierPolicy.ts",
    ],
    note: "The current behavior contract and carrier/identity invariants are the skeleton.",
  },
  {
    system: "skin",
    status: "present",
    purpose: "Control exposure, ownership, and privacy boundaries.",
    implementation: [
      "lib/auth/requireUser.ts",
      "lib/auth/ownership.ts",
      "lib/memory/selectForPrompt.ts",
    ],
    note: "Authorization, ownership, and sensitive-memory reveal gating implement the boundary layer.",
  },
  {
    system: "proprioceptive",
    status: "present",
    purpose: "Maintain awareness of current goal, subsystem, channel, corrections, and unresolved work.",
    implementation: [
      "lib/arbor/runtime/runtimeState.ts",
      "lib/arbor/continuity/state.ts",
      "lib/arbor/host/runtimeProjection.ts",
    ],
    note: "Runtime and continuity state already provide self-position awareness.",
  },
  {
    system: "vestibular",
    status: "implemented-now",
    purpose: "Detect orientation mismatch or drift between current state and active mode.",
    implementation: ["lib/arbor/body/regulation.ts"],
    note: "Adds deterministic orientation warnings without creating a second source of state truth.",
  },
] as const;

export function functionalSystem(
  system: FunctionalSystemAuditEntry["system"],
): FunctionalSystemAuditEntry {
  const found = ARBOR_FUNCTIONAL_SYSTEMS.find((entry) => entry.system === system);
  if (!found) throw new Error("unknown_functional_system");
  return found;
}
