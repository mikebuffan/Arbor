export type AgencyBlocker =
  | "external_authority"
  | "irreversible_action"
  | "missing_preference"
  | "high_consequence_fork";

export type AgencyAction = {
  id: string;
  description: string;
  reversible: boolean;
  requiresExternalAuthority?: boolean;
  requiresMissingPreference?: boolean;
  highConsequenceFork?: boolean;
};

export type AgencyVerification = {
  ok: boolean;
  evidence?: unknown;
  correction?: string;
};

export type AgencyState = {
  goal: string;
  status: "active" | "complete" | "blocked";
  currentStep: number;
  unresolvedWork: string[];
  recurringWeaknesses: string[];
  strategyNotes: string[];
  blocker?: AgencyBlocker | null;
};

export interface AgencyRuntime<SharedState> {
  loadSharedState(): Promise<SharedState>;
  assess(input: { agency: AgencyState; shared: SharedState }): Promise<{ complete: boolean; unresolvedWork: string[]; evidence?: unknown }>;
  choose(input: { agency: AgencyState; shared: SharedState }): Promise<AgencyAction>;
  execute(input: { agency: AgencyState; shared: SharedState; action: AgencyAction }): Promise<unknown>;
  integrate(input: { agency: AgencyState; shared: SharedState; action: AgencyAction; result: unknown }): Promise<SharedState>;
  verify(input: { agency: AgencyState; shared: SharedState; action: AgencyAction; result: unknown }): Promise<AgencyVerification>;
  selfAudit(input: { agency: AgencyState; shared: SharedState; verification: AgencyVerification }): Promise<{ recurringWeakness?: string; strategyChange?: string }>;
  persist(input: { agency: AgencyState; shared: SharedState }): Promise<void>;
}

function blockerFor(action: AgencyAction): AgencyBlocker | null {
  if (action.requiresExternalAuthority) return "external_authority";
  if (!action.reversible) return "irreversible_action";
  if (action.requiresMissingPreference) return "missing_preference";
  if (action.highConsequenceFork) return "high_consequence_fork";
  return null;
}

export async function runAgency<SharedState>(input: {
  goal: string;
  runtime: AgencyRuntime<SharedState>;
  maxSteps?: number;
}): Promise<{ agency: AgencyState; shared: SharedState }> {
  let shared = await input.runtime.loadSharedState();
  let agency: AgencyState = {
    goal: input.goal,
    status: "active",
    currentStep: 0,
    unresolvedWork: [],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
  };

  const maxSteps = input.maxSteps ?? 64;

  for (let i = 0; i < maxSteps; i += 1) {
    const assessment = await input.runtime.assess({ agency, shared });

    agency = {
      ...agency,
      currentStep: i,
      unresolvedWork: assessment.unresolvedWork,
    };

    if (assessment.complete) {
      agency = { ...agency, status: "complete", unresolvedWork: [] };
      await input.runtime.persist({ agency, shared });
      return { agency, shared };
    }

    const action = await input.runtime.choose({ agency, shared });
    const blocker = blockerFor(action);

    if (blocker) {
      agency = { ...agency, status: "blocked", blocker };
      await input.runtime.persist({ agency, shared });
      return { agency, shared };
    }

    const result = await input.runtime.execute({ agency, shared, action });
    shared = await input.runtime.integrate({ agency, shared, action, result });

    const verification = await input.runtime.verify({
      agency,
      shared,
      action,
      result,
    });

    const audit = await input.runtime.selfAudit({
      agency,
      shared,
      verification,
    });

    agency = {
      ...agency,
      recurringWeaknesses: audit.recurringWeakness
        ? [...agency.recurringWeaknesses, audit.recurringWeakness].slice(-20)
        : agency.recurringWeaknesses,
      strategyNotes: audit.strategyChange
        ? [...agency.strategyNotes, audit.strategyChange].slice(-20)
        : agency.strategyNotes,
    };

    await input.runtime.persist({ agency, shared });
  }

  throw new Error(`agency_step_budget_exhausted:${maxSteps}`);
}
