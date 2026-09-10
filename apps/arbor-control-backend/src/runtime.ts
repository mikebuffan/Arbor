import crypto from "node:crypto";

import { ARBOR_CORE_INJECTION } from "./identity.js";
import { runAgency } from "./agency.js";
import { resolveSubsystem, subsystemInjection } from "./subsystems.js";
import {
  addAcousticCorrection,
  renderAnnabelleWorkspace,
  type AnnabelleWorkspace,
} from "./controlState.js";
import { stateScope, type ArborStateStore } from "./stateStore.js";
import type { ArborBackendBridge } from "./backendBridge.js";
import type {
  ArborState,
  ArborTurnRequest,
  CanonicalArborResponse,
} from "./types.js";

const CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on)[.!?\s]*$/i;

const DEFAULT_STATE: ArborState = {
  activeSubsystem: "arbor",
  goal: null,
  unresolvedWork: [],
  strategyNotes: [],
  acousticCorrections: [],
  voiceId: process.env.ARBOR_VOICE ?? "cedar",
};

export class ArborControlRuntime {
  constructor(
    private readonly store: ArborStateStore,
    private readonly bridge: ArborBackendBridge,
  ) {}

  async getState(input: {
    projectId?: string;
    conversationId?: string;
  }): Promise<ArborState> {
    const scope = stateScope(input);

    return (
      (await this.store.load(scope)) ??
      structuredClone(DEFAULT_STATE)
    );
  }

  async setAnnabelleWorkspace(input: {
    projectId?: string;
    conversationId?: string;
    workspace: AnnabelleWorkspace;
  }): Promise<ArborState> {
    const scope = stateScope(input);
    const current = await this.getState(input);

    const next: ArborState = {
      ...current,
      annabelle: structuredClone(input.workspace),
    };

    await this.store.save(scope, next);
    return next;
  }

  async addVoiceCorrection(input: {
    projectId?: string;
    conversationId?: string;
    correction: string;
  }): Promise<ArborState> {
    const scope = stateScope(input);
    const current = await this.getState(input);
    const next = addAcousticCorrection(current, input.correction);

    await this.store.save(scope, next);
    return next;
  }

  async runTurn(
    request: ArborTurnRequest,
    authorization?: string,
  ): Promise<CanonicalArborResponse> {
    const scope = stateScope(request);
    const prior = await this.getState(request);

    const activeSubsystem = resolveSubsystem(
      request.userText,
      prior.activeSubsystem,
    );

    const resume =
      prior.unresolvedWork.length > 0 &&
      CONTINUATION.test(request.userText.trim());

    const state: ArborState = {
      ...prior,
      activeSubsystem,
      goal:
        resume && prior.goal
          ? prior.goal
          : request.userText.trim(),
    };

    const externalState = await this.bridge.loadState({
      projectId: request.projectId,
      conversationId: request.conversationId,
      authorization,
    });

    const instructions = [
      ARBOR_CORE_INJECTION,
      subsystemInjection(state),
      activeSubsystem === "annabelle"
        ? renderAnnabelleWorkspace(state)
        : "",
      state.acousticCorrections.length
        ? `VOICE ACOUSTIC CORRECTIONS:\n${state.acousticCorrections
            .map((item) => `- ${item}`)
            .join("\n")}`
        : "",
      Object.keys(externalState).length
        ? `EXTERNAL BACKEND CONTEXT:\n${JSON.stringify(externalState)}`
        : "",
      state.strategyNotes.length
        ? `RETAINED STRATEGIES:\n${state.strategyNotes
            .map((item) => `- ${item}`)
            .join("\n")}`
        : "",
      state.unresolvedWork.length
        ? `UNRESOLVED WORK:\n${state.unresolvedWork
            .map((item) => `- ${item}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const agency = await runAgency({
      instructions,
      userText: request.userText,
      state,
    });

    await this.store.save(scope, agency.state);

    const turnId = request.turnId ?? crypto.randomUUID();

    const response: CanonicalArborResponse = {
      text: agency.text,
      projectId: request.projectId,
      conversationId: request.conversationId,
      turnId,
      subsystem: activeSubsystem,
      channel: request.channel ?? "text",
    };

    await this.store.saveTurn(response);

    await this.bridge.persistTurn({
      projectId: request.projectId,
      conversationId: request.conversationId,
      turnId,
      userText: request.userText,
      assistantText: response.text,
      authorization,
    });

    return response;
  }
}
