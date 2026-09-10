import type { ArborTimeline } from "../timeline/runTimeline";
import type { ArborSubsystem } from "./arborRuntime";
import {
  runAgency,
  type AgencyAction,
  type AgencyState,
  type AgencyVerification,
} from "@/lib/arbor/agency/engine";

export type ArborChannel = "text" | "voice";

export type CanonicalTurnContext<State> = {
  userId: string;
  projectId: string;
  conversationId: string;
  turnId: string;
  userText: string;
  channel: ArborChannel;
  state: State;
  subsystem: ArborSubsystem;
  injectedContext: string[];
};

export type CanonicalTurnResult<State, Rendered> = {
  state: State;
  subsystem: ArborSubsystem;
  canonicalText: string;
  rendered: Rendered;
  agency: AgencyState;
};

export interface CanonicalTurnRuntime<State, Rendered> {
  loadState(input: {
    userId: string;
    projectId: string;
    conversationId: string;
    turnId: string;
  }): Promise<State>;

  resolveSubsystem(input: {
    userText: string;
    state: State;
  }): Promise<ArborSubsystem>;

  buildContext(input: {
    userText: string;
    state: State;
    subsystem: ArborSubsystem;
  }): Promise<string[]>;

  assess(input: CanonicalTurnContext<State>): Promise<{
    complete: boolean;
    unresolvedWork: string[];
    evidence?: unknown;
  }>;

  choose(input: CanonicalTurnContext<State>): Promise<AgencyAction>;

  execute(input: {
    context: CanonicalTurnContext<State>;
    action: AgencyAction;
  }): Promise<unknown>;

  integrate(input: {
    context: CanonicalTurnContext<State>;
    action: AgencyAction;
    result: unknown;
  }): Promise<State>;

  verify(input: {
    context: CanonicalTurnContext<State>;
    action: AgencyAction;
    result: unknown;
  }): Promise<AgencyVerification>;

  selfAudit(input: {
    context: CanonicalTurnContext<State>;
    verification: AgencyVerification;
  }): Promise<{
    recurringWeakness?: string;
    strategyChange?: string;
  }>;

  persistAgency(input: {
    context: CanonicalTurnContext<State>;
    agency: AgencyState;
  }): Promise<void>;

  generateCanonical(input: CanonicalTurnContext<State>): Promise<string>;

  persist(input: {
    context: CanonicalTurnContext<State>;
    canonicalText: string;
  }): Promise<void>;

  render(input: {
    context: CanonicalTurnContext<State>;
    canonicalText: string;
  }): Promise<Rendered>;
}

export async function runCanonicalTurn<State, Rendered>(input: {
  runtime: CanonicalTurnRuntime<State, Rendered>;
  timeline: ArborTimeline;
  userId: string;
  projectId: string;
  conversationId: string;
  turnId: string;
  userText: string;
  channel: ArborChannel;
  goal: string;
  maxAgencySteps?: number;
}): Promise<CanonicalTurnResult<State, Rendered>> {
  const {
    runtime,
    timeline,
    userId,
    projectId,
    conversationId,
    turnId,
    userText,
    channel,
    goal,
  } = input;

  await timeline.record("input", "turn_started");

  const initialState = await runtime.loadState({
    userId,
    projectId,
    conversationId,
    turnId,
  });

  await timeline.record("retrieve", "state_loaded");

  const subsystem = await runtime.resolveSubsystem({
    userText,
    state: initialState,
  });

  const injectedContext = await runtime.buildContext({
    userText,
    state: initialState,
    subsystem,
  });

  let context: CanonicalTurnContext<State> = {
    userId,
    projectId,
    conversationId,
    turnId,
    userText,
    channel,
    state: initialState,
    subsystem,
    injectedContext,
  };

  const agencyResult = await runAgency<State>({
    goal,
    maxSteps: input.maxAgencySteps,
    runtime: {
      async loadSharedState() {
        return context.state;
      },

      async assess({ shared }) {
        context = { ...context, state: shared };
        return runtime.assess(context);
      },

      async choose({ shared }) {
        context = { ...context, state: shared };
        const action = await runtime.choose(context);

        await timeline.record(
          "decide",
          "action_selected",
          { description: action.description },
          action.id,
        );

        return action;
      },

      async execute({ shared, action }) {
        context = { ...context, state: shared };

        await timeline.record("act", "action_started", {}, action.id);

        const result = await runtime.execute({
          context,
          action,
        });

        await timeline.record("observe", "action_completed", {}, action.id);

        return result;
      },

      async integrate({ shared, action, result }) {
        context = { ...context, state: shared };

        const next = await runtime.integrate({
          context,
          action,
          result,
        });

        context = { ...context, state: next };
        return next;
      },

      async verify({ shared, action, result }) {
        context = { ...context, state: shared };

        const verification = await runtime.verify({
          context,
          action,
          result,
        });

        await timeline.record(
          "verify",
          verification.ok ? "verification_passed" : "verification_failed",
          {
            evidence: verification.evidence,
            correction: verification.correction,
          },
          action.id,
        );

        return verification;
      },

      async selfAudit({ shared, verification }) {
        context = { ...context, state: shared };

        const audit = await runtime.selfAudit({
          context,
          verification,
        });

        await timeline.record(
          "update",
          "strategy_updated",
          {
            verificationOk: verification.ok,
            recurringWeakness: audit.recurringWeakness,
            strategyChange: audit.strategyChange,
          },
        );

        return audit;
      },

      async persist({ agency, shared }) {
        context = { ...context, state: shared };
        await runtime.persistAgency({ context, agency });
      },
    },
  });

  context = {
    ...context,
    state: agencyResult.shared,
  };

  if (agencyResult.agency.status === "blocked") {
    await timeline.record(
      "blocked",
      "turn_blocked",
      {
        reason: agencyResult.agency.blocker,
        unresolvedWork: agencyResult.agency.unresolvedWork,
      },
    );
  }

  const canonicalText = await runtime.generateCanonical(context);

  await timeline.record(
    "generate",
    "canonical_response_generated",
    { characterCount: canonicalText.length },
  );

  await runtime.persist({ context, canonicalText });
  await timeline.record("persist", "state_persisted");

  const rendered = await runtime.render({
    context,
    canonicalText,
  });

  await timeline.record("render", "render_completed");

  if (agencyResult.agency.status === "complete") {
    await timeline.record("complete", "turn_completed");
  }

  return {
    state: agencyResult.shared,
    subsystem,
    canonicalText,
    rendered,
    agency: agencyResult.agency,
  };
}
