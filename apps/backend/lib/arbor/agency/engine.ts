import { recordStrategyCandidate } from "./strategyRetention";

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
  status: "active" | "complete" | "blocked" | "checkpointed";
  currentStep: number;
  unresolvedWork: string[];
  recurringWeaknesses: string[];
  strategyNotes: string[];
  blocker?: AgencyBlocker | null;
  attemptedActionIds?: string[];
  lastVerification?: AgencyVerification | null;
};

export type AgencyYieldDecision =
  | { yield: true; reason: "complete" | "blocked" }
  | { yield: false; reason: "continue" | "checkpointed" };

/**
 * A successful intermediate action is never a reason to yield control.
 * The agency loop may return to the caller only when the objective is
 * complete or a genuine blocker requires external/user input.
 */
export function agencyYieldDecision(agency: AgencyState): AgencyYieldDecision {
  if (agency.status === "complete" && agency.unresolvedWork.length === 0) {
    return { yield: true, reason: "complete" };
  }

  if (agency.status === "blocked" && agency.blocker) {
    return { yield: true, reason: "blocked" };
  }
  if (agency.status === "checkpointed") {
    return { yield: false, reason: "checkpointed" };
  }
  return { yield: false, reason: "continue" };
}

export interface AgencyRuntime<SharedState> {
  loadSharedState(): Promise<SharedState>;
  loadAgencyState?(goal: string): Promise<AgencyState | null>;
  recover?(input: { agency: AgencyState; shared: SharedState; action: AgencyAction; blocker: AgencyBlocker }): Promise<AgencyAction | null>;
  proveComplete?(input: { agency: AgencyState; shared: SharedState; evidence?: unknown }): Promise<AgencyVerification>;
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
  const restored = await input.runtime.loadAgencyState?.(input.goal);
  let agency: AgencyState = restored?.goal === input.goal
    ? { ...restored, status: "active", blocker: null }
    : {
        goal: input.goal,
        status: "active",
        currentStep: 0,
        unresolvedWork: [],
        recurringWeaknesses: [],
        strategyNotes: [],
        blocker: null,
        attemptedActionIds: [],
        lastVerification: null,
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
      const proof = input.runtime.proveComplete
        ? await input.runtime.proveComplete({ agency, shared, evidence: assessment.evidence })
        : { ok: true, evidence: assessment.evidence };
      if (proof.ok) {
        agency = { ...agency, status: "complete", unresolvedWork: [], lastVerification: proof };
        await input.runtime.persist({ agency, shared });
        return { agency, shared };
      }
      agency = {
        ...agency,
        status: "active",
        unresolvedWork: assessment.unresolvedWork.length
          ? assessment.unresolvedWork
          : [proof.correction ?? "completion proof failed"],
        lastVerification: proof,
      };
    }

    let action = await input.runtime.choose({ agency, shared });
    let blocker = blockerFor(action);

    if (blocker && input.runtime.recover) {
      const alternate = await input.runtime.recover({ agency, shared, action, blocker });
      if (alternate) {
        action = alternate;
        blocker = blockerFor(action);
      }
    }

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

    agency = {
      ...agency,
      attemptedActionIds: [...new Set([...(agency.attemptedActionIds ?? []), action.id])].slice(-64),
      lastVerification: verification,
      unresolvedWork: verification.ok
        ? agency.unresolvedWork
        : [...new Set([...agency.unresolvedWork, verification.correction ?? `verification failed: ${action.description}`])],
    };

    const audit = await input.runtime.selfAudit({
      agency,
      shared,
      verification,
    });

    const strategyUpdate = audit.strategyChange
      ? recordStrategyCandidate(
          agency.strategyNotes,
          audit.strategyChange,
        )
      : null;

    agency = {
      ...agency,
      status: "active",
      blocker: null,
      recurringWeaknesses: audit.recurringWeakness
        ? [...agency.recurringWeaknesses, audit.recurringWeakness].slice(-20)
        : agency.recurringWeaknesses,
      strategyNotes:
        strategyUpdate?.notes ??
        agency.strategyNotes,
    };

    await input.runtime.persist({ agency, shared });

    // Mandatory continuation gate. Persisting or successfully verifying one
    // action is progress, not completion. Do not return a progress result here.
    if (agencyYieldDecision(agency).yield) {
      return { agency, shared };
    }
  }

  agency = {
    ...agency,
    status: "checkpointed",
    blocker: null,
    unresolvedWork: agency.unresolvedWork.length
      ? agency.unresolvedWork
      : ["resume active objective after execution budget checkpoint"],
  };
  await input.runtime.persist({ agency, shared });
  return { agency, shared };
}
