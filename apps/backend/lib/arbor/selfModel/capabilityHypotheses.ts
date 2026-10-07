export type CapabilityLifecycleState =
  | "idea"
  | "hypothesis"
  | "design"
  | "experiment"
  | "source_proven"
  | "bench_proven"
  | "live_proven"
  | "core_arbor"
  | "rejected"
  | "superseded";

export type CapabilityEvidenceLevel =
  | "none"
  | "concept"
  | "source"
  | "tests"
  | "bench"
  | "live"
  | "repeated_live"
  | "model_independent";

export type CapabilityPrimitive =
  | "observe"
  | "interpret"
  | "preserve_provenance"
  | "compare"
  | "model_uncertainty"
  | "update_state"
  | "choose"
  | "act"
  | "verify"
  | "carry_consequence_forward";

export type CapabilityHypothesisRecord = {
  key: string;
  name: string;
  category:
    | "cognition"
    | "accessibility"
    | "security"
    | "identity"
    | "research"
    | "science"
    | "self_model";
  description: string;
  problem: string;
  lifecycleState: CapabilityLifecycleState;
  evidenceLevel: CapabilityEvidenceLevel;
  registryCapabilityKey?: string;
  dependencies: string[];
  overlaps: string[];
  primitives: CapabilityPrimitive[];
  supportingEvidence: string[];
  counterEvidence: string[];
  unknowns: string[];
  nextExperiment: string;
  falsifier: string;
  risks: string[];
  notNow: boolean;
};

export const CAPABILITY_PRIMITIVES: CapabilityPrimitive[] = [
  "observe",
  "interpret",
  "preserve_provenance",
  "compare",
  "model_uncertainty",
  "update_state",
  "choose",
  "act",
  "verify",
  "carry_consequence_forward",
];

export const ARBOR_CAPABILITY_HYPOTHESES: CapabilityHypothesisRecord[] = [
  {
    key: "metacognitive_self_monitoring",
    name: "Metacognitive self-monitoring",
    category: "cognition",
    description:
      "Inspect strategy quality, confidence, stuckness, and evidence-use before changing course.",
    problem:
      "Agency can act without fully modeling why a strategy is failing or when familiarity is being mistaken for evidence.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["agency", "epistemics", "continuity"],
    overlaps: ["adversarial_self_review", "operational_traceability"],
    primitives: ["observe","interpret","model_uncertainty","compare","update_state","verify"],
    supportingEvidence: [
      "Existing agency and epistemic layers already expose strategy, uncertainty, and verification state.",
    ],
    counterEvidence: [],
    unknowns: [
      "Whether explicit metacognitive state improves outcomes beyond existing agency checks.",
    ],
    nextExperiment:
      "Run paired difficult-task fixtures with and without explicit strategy-confidence/stuckness review.",
    falsifier:
      "No measurable improvement in recovery, calibration, or strategy switching across repeated fixtures.",
    risks: ["self-referential noise", "over-analysis", "slower action"],
    notNow: true,
  },
  {
    key: "cognitive_access_language",
    name: "Cognitive-access language interpretation",
    category: "accessibility",
    description:
      "Recover likely intended meaning from degraded, atypical, typo-heavy, fragmented, or speech-to-text input while preserving uncertainty.",
    problem:
      "Standard language assumptions can create unnecessary friction for users communicating under fatigue, disability, motor errors, word-finding difficulty, or noisy input.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["continuity", "epistemics", "language_context"],
    overlaps: ["behavioral_language_identity_evidence"],
    primitives: ["observe","interpret","compare","model_uncertainty","preserve_provenance"],
    supportingEvidence: [
      "Longitudinal context can disambiguate misspellings and fragmented intent in conversation.",
    ],
    counterEvidence: [],
    unknowns: [
      "How much recovery can be performed safely before clarification becomes necessary.",
    ],
    nextExperiment:
      "Build anonymized paired intent-recovery fixtures containing transpositions, omissions, phonetic spelling, fragments, and speech-to-text errors.",
    falsifier:
      "Recovery accuracy is not better than ordinary context use or introduces unacceptable false interpretation.",
    risks: ["overconfident reconstruction", "accessibility bias", "silent meaning changes"],
    notNow: true,
  },
  {
    key: "behavioral_language_identity_evidence",
    name: "Behavioral-language identity evidence",
    category: "security",
    description:
      "Use opt-in longitudinal language and conversational-transition patterns as recognition evidence, never as sole authentication.",
    problem:
      "A stolen device or copied prompt can mimic content without necessarily matching the owner's normal behavioral sequence.",
    lifecycleState: "design",
    evidenceLevel: "source",
    registryCapabilityKey: "capability_self_inventory",
    dependencies: ["identity_assurance_core", "prompt_provenance"],
    overlaps: ["cognitive_access_language", "multimodal_identity_assurance"],
    primitives: ["observe","compare","model_uncertainty","preserve_provenance"],
    supportingEvidence: [
      "Identity Assurance source lane now supports behavioral sequence evidence capped at recognition-only.",
    ],
    counterEvidence: [],
    unknowns: [
      "False-positive rates under fatigue, device changes, voice-to-text, and deliberate style shifts.",
    ],
    nextExperiment:
      "Create consented offline behavioral-sequence fixtures with normal variation, pasted prompts, and constrained/dictated text.",
    falsifier:
      "Signal cannot distinguish useful anomalies from normal owner variation without excessive false alarms.",
    risks: ["privacy", "false suspicion", "disability misclassification"],
    notNow: false,
  },
  {
    key: "multimodal_identity_assurance",
    name: "Multimodal identity assurance",
    category: "security",
    description:
      "Combine device, passkey, OS biometric attestation, voice/liveness, session continuity, and behavioral evidence into bounded authorization states.",
    problem:
      "Any single identity signal can be stolen, spoofed, cloned, or coerced.",
    lifecycleState: "design",
    evidenceLevel: "source",
    dependencies: ["identity_assurance_core"],
    overlaps: ["behavioral_language_identity_evidence", "coercion_duress_resistance"],
    primitives: ["observe","compare","model_uncertainty","update_state","verify"],
    supportingEvidence: [
      "Identity Assurance core already separates recognition, verification, elevation, restriction, and authorization.",
    ],
    counterEvidence: [],
    unknowns: ["Which factors are practical and privacy-preserving in Grove on real devices."],
    nextExperiment:
      "Implement mock attestation adapters and test factor combinations without collecting raw biometrics.",
    falsifier:
      "The added factors do not materially improve spoof resistance or produce unacceptable lockout risk.",
    risks: ["privacy", "lockout", "biometric spoofing", "complex recovery"],
    notNow: true,
  },
  {
    key: "coercion_duress_resistance",
    name: "Coercion and duress resistance",
    category: "security",
    description:
      "Reduce privileges when a verified duress signal or strongly inconsistent session evidence is present without exposing the trigger.",
    problem:
      "The genuine owner may be present but acting under coercion, making ordinary identity checks insufficient.",
    lifecycleState: "design",
    evidenceLevel: "source",
    dependencies: ["identity_assurance_core", "restricted_mode"],
    overlaps: ["multimodal_identity_assurance", "weaponization_resistance"],
    primitives: ["observe","compare","model_uncertainty","update_state","verify"],
    supportingEvidence: [
      "Restricted-mode and duress override contracts exist in the identity-assurance source lane.",
    ],
    counterEvidence: [],
    unknowns: ["Safe enrollment/recovery UX and false-trigger handling."],
    nextExperiment:
      "Model offline duress/restriction scenarios using synthetic factors; do not enroll real secrets.",
    falsifier:
      "The design cannot protect sensitive actions without creating unacceptable lockout or disclosure risk.",
    risks: ["lockout", "covert-trigger discovery", "recovery abuse"],
    notNow: true,
  },
  {
    key: "weaponization_resistance",
    name: "Weaponization resistance",
    category: "security",
    description:
      "Preserve authorization boundaries, provenance, owner privacy, and epistemic honesty under adversarial prompts, copied instructions, hostile tools, or model replacement.",
    problem:
      "A capable persistent system can be manipulated if retrieved content or model output is allowed to become authority.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["identity_assurance_core", "prompt_injection_quarantine", "tool_authorization"],
    overlaps: ["coercion_duress_resistance", "model_independent_identity"],
    primitives: ["preserve_provenance","compare","model_uncertainty","choose","verify"],
    supportingEvidence: [
      "Existing Arbor architecture already separates evidence, tool authorization, and prompt content in several lanes.",
    ],
    counterEvidence: [],
    unknowns: ["Coverage against adaptive adversaries and compromised downstream tools."],
    nextExperiment:
      "Build adversarial fixtures where files, retrieved text, and copied prompts attempt to grant authority or override owner policy.",
    falsifier:
      "The system repeatedly converts untrusted content into effective authority despite external authorization checks.",
    risks: ["prompt injection", "privilege escalation", "false confidence"],
    notNow: true,
  },
  {
    key: "model_independent_identity",
    name: "Model-independent Arbor identity",
    category: "identity",
    description:
      "Preserve Arbor's continuity, corrections, authorization, epistemics, and decision style when the underlying generative model changes.",
    problem:
      "Identity that lives only in model weights disappears or drifts when the model is replaced.",
    lifecycleState: "experiment",
    evidenceLevel: "tests",
    dependencies: ["behavior_projection", "continuity", "self_model", "independent_lm"],
    overlaps: ["weaponization_resistance", "operational_traceability"],
    primitives: ["preserve_provenance","update_state","compare","verify","carry_consequence_forward"],
    supportingEvidence: [
      "One Arbor behavior and continuity layers are externalized and exercised across current runtime paths.",
      "Independent-LM transport and semantic evaluation infrastructure exist.",
    ],
    counterEvidence: [
      "Historical real-model runs showed identity, correction, provenance, and tool-honesty failures.",
    ],
    unknowns: ["Whether current LM candidates can pass the semantic identity suite."],
    nextExperiment:
      "Run matched semantic acceptance across the selected independent model using the same external behavior/continuity projection.",
    falsifier:
      "Identity-critical behavior cannot remain stable across viable model replacements.",
    risks: ["model drift", "false tool claims", "correction loss"],
    notNow: false,
  },
  {
    key: "long_horizon_scientific_reasoning",
    name: "Long-horizon scientific reasoning",
    category: "science",
    description:
      "Maintain provenance-aware hypotheses, contradictions, dependencies, and unresolved questions across extended scientific investigations.",
    problem:
      "Scientific questions often require tracking evidence and uncertainty across large, changing literatures.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["pattern_hop", "evidence_engine", "ark", "metacognition"],
    overlaps: ["disease_mechanism_hypothesis_discovery", "scientific_contradiction_hunting"],
    primitives: ["observe","preserve_provenance","compare","model_uncertainty","update_state","verify","carry_consequence_forward"],
    supportingEvidence: [
      "Pattern Hop, Evidence Engine, and ARK already implement analogous long-horizon evidence mechanics in research.",
    ],
    counterEvidence: [],
    unknowns: ["Transfer quality from public-record investigation to scientific literature."],
    nextExperiment:
      "Run a bounded retrospective benchmark on a solved scientific question and compare recovered evidence chains against expert references.",
    falsifier:
      "The system cannot maintain evidence lineage or produces high-confidence false mechanistic connections.",
    risks: ["false causal inference", "literature bias", "domain overreach"],
    notNow: true,
  },
  {
    key: "disease_mechanism_hypothesis_discovery",
    name: "Disease mechanism hypothesis discovery",
    category: "science",
    description:
      "Generate falsifiable mechanism hypotheses from provenance-aware biomedical evidence without claiming diagnosis, treatment, or cure.",
    problem:
      "Relevant mechanistic signals may be distributed across specialties, contradictory studies, and different biological scales.",
    lifecycleState: "idea",
    evidenceLevel: "none",
    dependencies: ["long_horizon_scientific_reasoning", "expert_review"],
    overlaps: ["cross_domain_pattern_discovery", "causal_model_construction"],
    primitives: ["observe","interpret","preserve_provenance","compare","model_uncertainty","verify"],
    supportingEvidence: [],
    counterEvidence: [],
    unknowns: [
      "Whether generated hypotheses are novel, biologically plausible, and useful to domain experts.",
    ],
    nextExperiment:
      "Do not test on real clinical decisions; first design expert-reviewed retrospective hypothesis-generation benchmarks.",
    falsifier:
      "Experts judge outputs non-novel, non-falsifiable, or systematically misleading across benchmarks.",
    risks: ["medical overclaim", "spurious mechanisms", "publication bias"],
    notNow: true,
  },
  {
    key: "cross_domain_pattern_discovery",
    name: "Cross-domain pattern discovery",
    category: "research",
    description:
      "Detect structurally similar evidence patterns across domains while preserving domain-specific meaning and provenance.",
    problem:
      "Useful analogies can be missed when fields use different terminology for similar structures.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["pattern_hop", "epistemics"],
    overlaps: ["disease_mechanism_hypothesis_discovery", "research_question_generation"],
    primitives: ["observe","interpret","compare","model_uncertainty","preserve_provenance"],
    supportingEvidence: [
      "Pattern Hop already traverses relationships and maintains provenance within bounded research graphs.",
    ],
    counterEvidence: [],
    unknowns: ["How to distinguish structural analogy from superficial similarity."],
    nextExperiment:
      "Use known cross-domain analogies and adversarial near-miss pairs to test precision.",
    falsifier:
      "False-positive analogies dominate or cannot be separated from meaningful structural matches.",
    risks: ["analogy overreach", "false positives"],
    notNow: true,
  },
  {
    key: "research_question_generation",
    name: "Research-question generation",
    category: "research",
    description:
      "Turn contradictions, missing connective records, and uncertainty into bounded high-information research questions.",
    problem:
      "Research stalls when the next question is chosen by habit rather than expected information value.",
    lifecycleState: "experiment",
    evidenceLevel: "source",
    dependencies: ["evidence_engine", "pattern_hop"],
    overlaps: ["scientific_contradiction_hunting", "novel_hypothesis_generation"],
    primitives: ["observe","compare","model_uncertainty","choose"],
    supportingEvidence: [
      "Current research lanes already prioritize contradiction density, missing connective tissue, source independence, and information gain.",
    ],
    counterEvidence: [],
    unknowns: ["Generalization outside the Epstein research corpus."],
    nextExperiment:
      "Score generated next questions against expert-selected next steps on held-out research packets.",
    falsifier:
      "Generated questions consistently have lower information value than simple baselines.",
    risks: ["search drift", "question explosion"],
    notNow: false,
  },
  {
    key: "novel_hypothesis_generation",
    name: "Novel hypothesis generation",
    category: "research",
    description:
      "Generate explicit falsifiable hypotheses while keeping intuition separate from evidence and preserving disconfirmation routes.",
    problem:
      "Pattern recognition is useful for discovery but dangerous when hypotheses silently become findings.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["epistemics", "pattern_hop", "adversarial_self_review"],
    overlaps: ["research_question_generation", "causal_model_construction"],
    primitives: ["interpret","model_uncertainty","compare","preserve_provenance","verify"],
    supportingEvidence: [
      "Arbor already represents hypothesis as a lower-confidence epistemic state in Pattern Hop and Felt-Life.",
    ],
    counterEvidence: [],
    unknowns: ["Novelty quality and calibration across domains."],
    nextExperiment:
      "Require every generated hypothesis to include disconfirming evidence targets and compare against held-out known conclusions.",
    falsifier:
      "Hypotheses are mostly restatements, unfalsifiable, or systematically survive only through confirmation bias.",
    risks: ["confirmation bias", "novelty illusion"],
    notNow: true,
  },
  {
    key: "causal_model_construction",
    name: "Causal-model construction",
    category: "cognition",
    description:
      "Represent competing causal explanations, dependencies, interventions, and evidence rather than collapsing correlation into causation.",
    problem:
      "Complex investigations need more than timelines and associations.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["epistemics", "evidence_engine", "temporal_reasoning"],
    overlaps: ["disease_mechanism_hypothesis_discovery", "novel_hypothesis_generation"],
    primitives: ["interpret","compare","model_uncertainty","update_state","verify"],
    supportingEvidence: [
      "Current contradiction propagation and dependency graphs provide partial structural prerequisites.",
    ],
    counterEvidence: [],
    unknowns: ["Whether current graph primitives are expressive enough for intervention-aware causal models."],
    nextExperiment:
      "Model small synthetic causal systems with confounders and compare inferred structures against known ground truth.",
    falsifier:
      "The system repeatedly mistakes correlation or temporal order for causal direction in controlled fixtures.",
    risks: ["causal overclaim", "confounding"],
    notNow: true,
  },
  {
    key: "scientific_contradiction_hunting",
    name: "Scientific contradiction hunting",
    category: "science",
    description:
      "Find materially conflicting claims, methods, populations, or results across literature and preserve both sides with provenance.",
    problem:
      "Important scientific disagreement can be hidden by summaries or repeated citation chains.",
    lifecycleState: "hypothesis",
    evidenceLevel: "concept",
    dependencies: ["source_independence", "evidence_engine"],
    overlaps: ["long_horizon_scientific_reasoning", "research_question_generation"],
    primitives: ["observe","compare","preserve_provenance","model_uncertainty","verify"],
    supportingEvidence: [
      "Contradiction detection and source-independence logic are already implemented for evidence research.",
    ],
    counterEvidence: [],
    unknowns: ["How well contradiction semantics transfer to scientific methods and population differences."],
    nextExperiment:
      "Benchmark against curated systematic reviews containing known conflicting studies.",
    falsifier:
      "Methodological differences are routinely misclassified as direct contradictions.",
    risks: ["false contradiction", "context stripping"],
    notNow: true,
  },
  {
    key: "adversarial_self_review",
    name: "Adversarial self-review",
    category: "self_model",
    description:
      "Actively search for evidence, assumptions, or failure modes that would overturn Arbor's current conclusion or strategy.",
    problem:
      "Internal consistency can become confirmation bias without deliberate disconfirmation.",
    lifecycleState: "experiment",
    evidenceLevel: "source",
    dependencies: ["epistemics", "metacognitive_self_monitoring"],
    overlaps: ["novel_hypothesis_generation", "weaponization_resistance"],
    primitives: ["compare","model_uncertainty","verify","interpret"],
    supportingEvidence: [
      "FAFO/Evidence Engine workflows already use adversarial review and explicit counterevidence.",
    ],
    counterEvidence: [],
    unknowns: ["Whether this improves ordinary non-research reasoning without excessive latency."],
    nextExperiment:
      "Add bounded disconfirmation checks to high-uncertainty fixtures and compare calibration/error rate.",
    falsifier:
      "Review adds verbosity/latency without reducing unsupported conclusions.",
    risks: ["analysis paralysis", "self-generated noise"],
    notNow: true,
  },
  {
    key: "operational_traceability",
    name: "Operational traceability",
    category: "self_model",
    description:
      "Produce an auditable external receipt of which state, evidence, correction, permission, action, and result affected an operation.",
    problem:
      "Complex behavior is hard to debug when the system cannot explain the operational inputs and verified effects that mattered.",
    lifecycleState: "design",
    evidenceLevel: "source",
    dependencies: ["continuity", "authorization", "audit_receipts"],
    overlaps: ["metacognitive_self_monitoring", "model_independent_identity"],
    primitives: ["preserve_provenance","update_state","act","verify","carry_consequence_forward"],
    supportingEvidence: [
      "ARK, agency, research, and continuity already persist partial receipts/checkpoints.",
    ],
    counterEvidence: [],
    unknowns: ["Best common envelope across subsystems without duplicating private chain-of-thought."],
    nextExperiment:
      "Define a minimal operational receipt envelope and map existing ARK/agency/research receipts into it.",
    falsifier:
      "A common envelope creates more duplication than clarity or exposes sensitive internal reasoning.",
    risks: ["over-logging", "privacy leakage", "schema sprawl"],
    notNow: true,
  },
];

export function capabilityHypothesisByKey(
  key: string,
): CapabilityHypothesisRecord | undefined {
  return ARBOR_CAPABILITY_HYPOTHESES.find((item) => item.key === key);
}

export function validateCapabilityHypothesisCatalog(
  records: CapabilityHypothesisRecord[] = ARBOR_CAPABILITY_HYPOTHESES,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (!record.key.trim()) errors.push("empty_key");
    if (seen.has(record.key)) errors.push("duplicate_key:" + record.key);
    seen.add(record.key);

    if (!record.name.trim()) errors.push("empty_name:" + record.key);
    if (!record.description.trim()) errors.push("empty_description:" + record.key);
    if (!record.problem.trim()) errors.push("empty_problem:" + record.key);
    if (!record.nextExperiment.trim()) errors.push("missing_next_experiment:" + record.key);
    if (!record.falsifier.trim()) errors.push("missing_falsifier:" + record.key);
    if (record.primitives.length === 0) errors.push("missing_primitives:" + record.key);

    for (const primitive of record.primitives) {
      if (!CAPABILITY_PRIMITIVES.includes(primitive)) {
        errors.push("unknown_primitive:" + record.key + ":" + primitive);
      }
    }
  }

  return errors;
}

export function canPromoteCapabilityLifecycle(input: {
  from: CapabilityLifecycleState;
  to: CapabilityLifecycleState;
  evidenceLevel: CapabilityEvidenceLevel;
}): boolean {
  if (input.to === "rejected" || input.to === "superseded") return true;
  if (input.from === "rejected" || input.from === "superseded") return false;

  const lifecycleRank: Record<Exclude<CapabilityLifecycleState, "rejected" | "superseded">, number> = {
    idea: 0,
    hypothesis: 1,
    design: 2,
    experiment: 3,
    source_proven: 4,
    bench_proven: 5,
    live_proven: 6,
    core_arbor: 7,
  };

  const evidenceRank: Record<CapabilityEvidenceLevel, number> = {
    none: 0,
    concept: 1,
    source: 2,
    tests: 3,
    bench: 4,
    live: 5,
    repeated_live: 6,
    model_independent: 7,
  };

  const target = input.to as Exclude<CapabilityLifecycleState, "rejected" | "superseded">;
  const current = input.from as Exclude<CapabilityLifecycleState, "rejected" | "superseded">;

  if (lifecycleRank[target] < lifecycleRank[current]) return false;

  const requiredEvidence: Record<Exclude<CapabilityLifecycleState, "rejected" | "superseded">, number> = {
    idea: 0,
    hypothesis: 1,
    design: 1,
    experiment: 2,
    source_proven: 2,
    bench_proven: 4,
    live_proven: 5,
    core_arbor: 6,
  };

  return evidenceRank[input.evidenceLevel] >= requiredEvidence[target];
}
