import {
  decideResearchSession,
  validateResearchSession,
  type ResearchSession,
} from "./sessionPolicy";
import {
  runTrustedArkResearchTick,
  type ArkResearchCheckpoint,
  type TrustedResearchHandoff,
} from "./arkResearchHandoff";
import type { ResearchStore, ResearchUnitExecutor } from "./sessionRunner";

export const MAX_CONTROLLER_APPEND_PER_PULSE = 8;
export const MAX_CONTROLLER_PENDING_UNITS = 256;

export type ResearchControllerUnitSummary = {
  unitKey: string;
  kind: string;
  status: "queued" | "leased" | "completed" | "blocked" | "failed" | "cancelled";
  attemptCount: number;
  maxAttempts: number;
};

export type ResearchControllerReceiptSummary = {
  unitKey: string;
  status: "completed" | "checkpointed" | "blocked" | "failed";
  evidenceRefs: string[];
  recordedAt: string;
  result?: Record<string, unknown> | null;
};

export type ResearchControllerContext = {
  session: ResearchSession;
  units: ResearchControllerUnitSummary[];
  recentReceipts: ResearchControllerReceiptSummary[];
};

export type PlannedResearchUnit = {
  unitKey: string;
  kind: string;
  description: string;
  payload: Record<string, unknown>;
  maxCostReservationCents: number;
  maxAttempts?: number;
};

export type ResearchControllerPlan =
  | {
      action: "run_next";
      rationale: string;
    }
  | {
      action: "append_then_run";
      rationale: string;
      units: PlannedResearchUnit[];
    }
  | {
      action: "await_review";
      rationale: string;
      unresolvedWork?: string[];
    }
  | {
      action: "blocked";
      rationale: string;
      unresolvedWork?: string[];
    };

export type ResearchControllerPlanner = {
  plan(input: {
    goal: string;
    context: ResearchControllerContext;
  }): Promise<ResearchControllerPlan>;
};

export type ResearchControllerStore = ResearchStore & {
  loadControllerContext(sessionId: string): Promise<ResearchControllerContext | null>;
  appendPlannedUnits(input: {
    session: ResearchSession;
    units: PlannedResearchUnit[];
  }): Promise<{ appended: number; existing: number }>;
};

export type ResearchControllerPulseResult =
  | { status: "not_found" }
  | { status: "stopped"; reason: string }
  | { status: "idle"; reason: string }
  | {
      status: "awaiting_review" | "blocked";
      reason: string;
      unresolvedWork: string[];
    }
  | {
      status: "checkpointed";
      plan: ResearchControllerPlan["action"];
      checkpoint: ArkResearchCheckpoint;
      appendedUnits: number;
    }
  | {
      status: "no_claim";
      plan: ResearchControllerPlan["action"];
      appendedUnits: number;
      reason?: string;
    }
  | {
      status: "lease_lost";
      plan: ResearchControllerPlan["action"];
      appendedUnits: number;
      reason?: string;
    };

function normalizePlannedUnits(units: PlannedResearchUnit[]): PlannedResearchUnit[] {
  if (!Array.isArray(units) || units.length === 0 ||
      units.length > MAX_CONTROLLER_APPEND_PER_PULSE) {
    throw new Error("research_controller_invalid_plan_size");
  }

  const seen = new Set<string>();
  return units.map((unit) => {
    const unitKey = unit.unitKey?.trim();
    const kind = unit.kind?.trim();
    const description = unit.description?.trim();

    if (!unitKey || unitKey.length > 200 || seen.has(unitKey) ||
        !kind || kind.length > 200 || !kind.startsWith("research.") ||
        !description || description.length > 2000 ||
        !unit.payload || typeof unit.payload !== "object" || Array.isArray(unit.payload) ||
        !Number.isSafeInteger(unit.maxCostReservationCents) ||
        unit.maxCostReservationCents < 0 ||
        unit.maxCostReservationCents > 1_000_000 ||
        (unit.maxAttempts !== undefined &&
          (!Number.isSafeInteger(unit.maxAttempts) ||
            unit.maxAttempts < 1 || unit.maxAttempts > 20))) {
      throw new Error("research_controller_invalid_planned_unit");
    }

    seen.add(unitKey);
    return {
      ...unit,
      unitKey,
      kind,
      description,
      payload: { ...unit.payload },
    };
  });
}

function unresolvedFromContext(context: ResearchControllerContext): string[] {
  const pending = context.units
    .filter((unit) => unit.status === "queued" || unit.status === "leased")
    .map((unit) => unit.unitKey);

  if (pending.length) return pending;
  if (context.session.unresolvedRequiredWork > 0) {
    return [
      String(context.session.unresolvedRequiredWork) +
        " required research item(s) remain unresolved",
    ];
  }
  return [];
}

/**
 * One controller pulse only.
 *
 * The planner adapter is intentionally supplied by the trusted host; production
 * wiring should use Arbor's existing agency controller rather than a second
 * model/planner. The controller may refresh the durable task graph, then
 * executes at most one trusted research tick. It never self-schedules or marks
 * research independently verified.
 */
export async function runResearchControllerPulse(input: {
  handoff: TrustedResearchHandoff;
  store: ResearchControllerStore;
  executor: ResearchUnitExecutor;
  planner: ResearchControllerPlanner;
  at: string;
}): Promise<ResearchControllerPulseResult> {
  const context = await input.store.loadControllerContext(input.handoff.sessionId);
  if (!context) return { status: "not_found" };

  validateResearchSession(context.session);
  if (context.session.id !== input.handoff.sessionId ||
      context.session.userId !== input.handoff.ownerId ||
      context.session.projectId !== input.handoff.projectId) {
    throw new Error("research_controller_scope_mismatch");
  }

  const sessionDecision = decideResearchSession(context.session, input.at);
  if (sessionDecision.action === "stop") {
    if ((sessionDecision.status === "blocked" ||
         sessionDecision.status === "cancelled" ||
         sessionDecision.status === "timebox_ended") &&
        sessionDecision.status !== context.session.status) {
      await input.store.stop({
        session: context.session,
        status: sessionDecision.status,
        reason: sessionDecision.reason,
      });
    }
    return { status: "stopped", reason: sessionDecision.reason };
  }
  if (sessionDecision.action === "idle" &&
      sessionDecision.reason !== "awaiting_completion_verification") {
    return { status: "idle", reason: sessionDecision.reason };
  }

  if (context.units.filter((unit) =>
      unit.status === "queued" || unit.status === "leased").length >
      MAX_CONTROLLER_PENDING_UNITS) {
    return {
      status: "blocked",
      reason: "research_controller_pending_unit_limit",
      unresolvedWork: unresolvedFromContext(context),
    };
  }

  const hasPersistedRunnableUnit = context.units.some(
    (unit) => unit.status === "queued" || unit.status === "leased",
  );

  // A durable already-planned unit does not need another model decision just
  // to continue. Re-plan only when the persisted queue itself needs a new
  // decision. This keeps multi-hour runs bounded in model calls while ARK
  // remains responsible for resuming the current durable unit.
  const plan: ResearchControllerPlan = hasPersistedRunnableUnit
    ? {
        action: "run_next",
        rationale: "Continue the existing persisted bounded research unit.",
      }
    : await input.planner.plan({
        goal: context.session.objective,
        context,
      });

  if (plan.action === "await_review" || plan.action === "blocked") {
    return {
      status: plan.action === "await_review" ? "awaiting_review" : "blocked",
      reason: plan.rationale,
      unresolvedWork: plan.unresolvedWork ?? unresolvedFromContext(context),
    };
  }

  let appendedUnits = 0;
  if (plan.action === "append_then_run") {
    const units = normalizePlannedUnits(plan.units);
    const append = await input.store.appendPlannedUnits({
      session: context.session,
      units,
    });
    appendedUnits = append.appended;
  }

  const tick = await runTrustedArkResearchTick({
    handoff: input.handoff,
    store: input.store,
    executor: input.executor,
    at: input.at,
  });

  if (tick.status === "committed") {
    return {
      status: "checkpointed",
      plan: plan.action,
      checkpoint: tick.checkpoint,
      appendedUnits,
    };
  }

  if (tick.status === "lease_lost") {
    return {
      status: "lease_lost",
      plan: plan.action,
      appendedUnits,
      reason: tick.reason,
    };
  }

  if (tick.status === "not_found") return { status: "not_found" };
  if (tick.status === "duplicate") {
    return {
      status: "no_claim",
      plan: plan.action,
      appendedUnits,
      reason: "research_duplicate_requires_receipt_readback",
    };
  }
  if (tick.status === "stopped") {
    return { status: "stopped", reason: tick.reason ?? "research_session_stopped" };
  }
  if (tick.status === "idle") {
    return {
      status: "awaiting_review",
      reason: tick.reason ?? "research_session_idle",
      unresolvedWork: unresolvedFromContext(context),
    };
  }

  return {
    status: "no_claim",
    plan: plan.action,
    appendedUnits,
    reason: "reason" in tick ? tick.reason : undefined,
  };
}
