import crypto from "node:crypto";

import type { ArborAuditSink } from "./audit.js";
import { ARBOR_CORE_INJECTION } from "./identity.js";
import { runAgency } from "./agency.js";
import { resolveSubsystem, subsystemInjection } from "./subsystems.js";
import {
  addAcousticCorrection,
  pushAnnabelleRevision,
  renderAnnabelleWorkspace,
  type AnnabelleWorkspace,
} from "./controlState.js";
import {
  buildControlCapabilities,
} from "./controlCapabilities.js";
import { stateScope, type ArborStateStore } from "./stateStore.js";
import { defaultVoiceId, normalizeVoiceId } from "./voiceConfig.js";
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
  voiceId: defaultVoiceId(),
};

export class ArborControlRuntime {
  constructor(
    private readonly store: ArborStateStore,
    private readonly bridge: ArborBackendBridge,
    private readonly audit?: ArborAuditSink,
  ) {}

  async getState(input: {
    projectId?: string;
    conversationId?: string;
  }): Promise<ArborState> {
    const scope = stateScope(input);
    const saved = await this.store.load(scope);

    if (!saved) {
      return structuredClone(DEFAULT_STATE);
    }

    let voiceId: string;

    try {
      voiceId = normalizeVoiceId(saved.voiceId);
    } catch {
      voiceId = defaultVoiceId();
    }

    return {
      ...saved,
      voiceId,
    };
  }

  async setAnnabelleWorkspace(input: {
    projectId?: string;
    conversationId?: string;
    workspace: AnnabelleWorkspace;
  }): Promise<ArborState> {
    const scope = stateScope(input);
    const current = await this.getState(input);
    const revisioned = pushAnnabelleRevision(
      current,
      "direct Annabelle workspace replacement",
    );

    const next: ArborState = {
      ...revisioned,
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

  async setVoice(input: {
    projectId?: string;
    conversationId?: string;
    voiceId: string;
  }): Promise<ArborState> {
    const scope = stateScope(input);
    const current = await this.getState(input);

    const next: ArborState = {
      ...current,
      voiceId: normalizeVoiceId(input.voiceId),
    };

    await this.store.save(scope, next);
    return next;
  }

  async runTurn(
    request: ArborTurnRequest,
    authorization?: string,
  ): Promise<CanonicalArborResponse> {
    const scope = stateScope(request);
    const turnId = request.turnId ?? crypto.randomUUID();

    await this.record(turnId, request, "input", "turn_started", {
      channel: request.channel ?? "text",
    });

    const prior = await this.getState(request);

    await this.record(turnId, request, "retrieve", "state_loaded", {
      subsystem: prior.activeSubsystem,
      unresolvedCount: prior.unresolvedWork.length,
      voiceId: prior.voiceId,
    });

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

    await this.record(turnId, request, "decide", "subsystem_resolved", {
      subsystem: activeSubsystem,
    });

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
      capabilities: buildControlCapabilities(),
      context: {
        projectId: request.projectId,
        conversationId: request.conversationId,
        turnId,
      },
    });

    await this.record(
      turnId,
      request,
      agency.status === "blocked" ? "blocked" : "verify",
      agency.status === "blocked"
        ? "agency_blocked"
        : "agency_verified",
      {
        complete: agency.status === "complete",
        toolCalls: agency.toolCalls,
        unresolvedCount: agency.state.unresolvedWork.length,
        blockedReason:
          agency.status === "blocked"
            ? agency.blocker
            : undefined,
      },
    );

    await this.store.save(scope, agency.state);

    await this.record(turnId, request, "persist", "state_persisted", {
      subsystem: agency.state.activeSubsystem,
      unresolvedCount: agency.state.unresolvedWork.length,
    });

    const response: CanonicalArborResponse = {
      text: agency.text,
      projectId: request.projectId,
      conversationId: request.conversationId,
      turnId,
      subsystem: activeSubsystem,
      channel: request.channel ?? "text",
      voice: {
        voiceId: agency.state.voiceId,
        acousticCorrections: [
          ...agency.state.acousticCorrections,
        ],
      },
    };

    await this.store.saveTurn(response);

    await this.record(turnId, request, "generate", "canonical_response_saved", {
      subsystem: activeSubsystem,
      channel: response.channel,
      characterCount: response.text.length,
      voiceId: response.voice.voiceId,
    });

    await this.bridge.persistTurn({
      projectId: request.projectId,
      conversationId: request.conversationId,
      turnId,
      userText: request.userText,
      assistantText: response.text,
      authorization,
    });

    await this.record(turnId, request, "complete", "turn_completed", {
      subsystem: activeSubsystem,
      channel: response.channel,
      toolCalls: agency.toolCalls,
    });

    return response;
  }

  private async record(
    turnId: string,
    request: ArborTurnRequest,
    phase:
      | "input"
      | "retrieve"
      | "decide"
      | "act"
      | "observe"
      | "verify"
      | "update"
      | "generate"
      | "persist"
      | "render"
      | "complete"
      | "blocked"
      | "error",
    event: string,
    detail?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.audit) return;

    await this.audit.record({
      turnId,
      projectId: request.projectId,
      conversationId: request.conversationId,
      phase,
      event,
      detail,
    });
  }
}
