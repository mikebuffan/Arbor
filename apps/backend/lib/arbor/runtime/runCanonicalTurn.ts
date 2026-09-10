import type { ArborTimeline } from "../timeline/runTimeline";
import type { ArborSubsystem } from "./arborRuntime";

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
    evidence?: unknown;
  }>;

  choose(input: CanonicalTurnContext<State>): Promise<{
    id: string;
    description: string;
    irreversible?: boolean;
    requiresExternalAuthority?: boolean;
    requiresMissingPreference?: boolean;
    highConsequenceFork?: boolean;
  }>;

  execute(input: {
    context: CanonicalTurnContext<State>;
    action: { id: string; description: string };
  }): Promise<unknown>;

  integrate(input: {
    context: CanonicalTurnContext<State>;
    action: { id: string; description: string };
    result: unknown;
  }): Promise<State>;

  verify(input: {
    context: CanonicalTurnContext<State>;
    action: { id: string; description: string };
    result: unknown;
  }): Promise<{
    ok: boolean;
    evidence?: unknown;
    correction?: string;
  }>;

  selfUpdate(input: {
    context: CanonicalTurnContext<State>;
    verification: {
      ok: boolean;
      evidence?: unknown;
      correction?: string;
    };
  }): Promise<State>;

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

function blocker(action: {
  irreversible?: boolean;
  requiresExternalAuthority?: boolean;
  requiresMissingPreference?: boolean;
  highConsequenceFork?: boolean;
}): string | null {
  if (action.requiresExternalAuthority) return "external_authority";
  if (action.irreversible) return "irreversible_action";
  if (action.requiresMissingPreference) return "missing_preference";
  if (action.highConsequenceFork) return "high_consequence_fork";
  return null;
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
  } = input;

  await timeline.record("input", "turn_started");

  let state = await runtime.loadState({
    userId,
    projectId,
    conversationId,
    turnId,
  });

  await timeline.record("retrieve", "state_loaded");

  const subsystem = await runtime.resolveSubsystem({ userText, state });

  const injectedContext = await runtime.buildContext({
    userText,
    state,
    subsystem,
  });

  let context: CanonicalTurnContext<State> = {
    userId,
    projectId,
    conversationId,
    turnId,
    userText,
    channel,
    state,
    subsystem,
    injectedContext,
  };

  const maxSteps = input.maxAgencySteps ?? 64;

  for (let step = 0; step < maxSteps; step += 1) {
    const assessment = await runtime.assess(context);
    if (assessment.complete) break;

    const action = await runtime.choose(context);

    await timeline.record(
      "decide",
      "action_selected",
      { description: action.description },
      action.id,
    );

    const stop = blocker(action);
    if (stop) {
      await timeline.record("blocked", "turn_blocked", { reason: stop }, action.id);
      throw new Error(`arbor_turn_blocked:${stop}`);
    }

    await timeline.record("act", "action_started", {}, action.id);

    const result = await runtime.execute({ context, action });

    await timeline.record("observe", "action_completed", {}, action.id);

    state = await runtime.integrate({ context, action, result });
    context = { ...context, state };

    const verification = await runtime.verify({ context, action, result });

    await timeline.record(
      "verify",
      verification.ok ? "verification_passed" : "verification_failed",
      {
        evidence: verification.evidence,
        correction: verification.correction,
      },
      action.id,
    );

    state = await runtime.selfUpdate({ context, verification });
    context = { ...context, state };

    await timeline.record(
      "update",
      "strategy_updated",
      { verificationOk: verification.ok },
      action.id,
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

  const rendered = await runtime.render({ context, canonicalText });

  await timeline.record("render", "render_completed");
  await timeline.record("complete", "turn_completed");

  return { state, subsystem, canonicalText, rendered };
}
