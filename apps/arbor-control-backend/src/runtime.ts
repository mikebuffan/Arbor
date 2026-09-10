import {
  createHash,
  randomUUID,
} from "node:crypto";

import type { ArborAuditSink } from "./audit.js";
import {
  runAgency,
  type AgencyResult,
} from "./agency.js";
import {
  MikeBackendBridge,
  type ArborBackendBridge,
} from "./backendBridge.js";
import {
  addAcousticCorrection,
  pushAnnabelleRevision,
  renderAnnabelleWorkspace,
  restoreLatestAnnabelleRevision,
  type AnnabelleWorkspace,
} from "./controlState.js";
import {
  buildControlCapabilities,
} from "./controlCapabilities.js";
import { ARBOR_CORE_INJECTION } from "./identity.js";
import {
  stateScope,
  type ArborStateStore,
} from "./stateStore.js";
import {
  resolveSubsystem,
  subsystemInjection,
} from "./subsystems.js";
import type {
  ArborState,
  ArborTurnRequest,
  CanonicalArborResponse,
  StoredArborTurn,
} from "./types.js";
import {
  defaultVoiceId,
  normalizeVoiceId,
} from "./voiceConfig.js";

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

export type AgencyRunner = typeof runAgency;

export class ArborControlRuntime {
  private readonly scopeTails = new Map<string, Promise<void>>();

  constructor(
    private readonly store: ArborStateStore,
    private readonly bridge: ArborBackendBridge = new MikeBackendBridge(),
    private readonly audit?: ArborAuditSink,
    private readonly agencyRunner: AgencyRunner = runAgency,
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

    return this.withScopeLock(scope, async () => {
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
    });
  }

  async restoreAnnabelleWorkspace(input: {
    projectId?: string;
    conversationId?: string;
  }): Promise<ArborState> {
    const scope = stateScope(input);

    return this.withScopeLock(scope, async () => {
      const current = await this.getState(input);
      const restored = restoreLatestAnnabelleRevision(current);
      await this.store.save(scope, restored);
      return restored;
    });
  }

  async addVoiceCorrection(input: {
    projectId?: string;
    conversationId?: string;
    correction: string;
  }): Promise<ArborState> {
    const scope = stateScope(input);

    return this.withScopeLock(scope, async () => {
      const current = await this.getState(input);
      const next = addAcousticCorrection(
        current,
        input.correction,
      );
      await this.store.save(scope, next);
      return next;
    });
  }

  async setVoice(input: {
    projectId?: string;
    conversationId?: string;
    voiceId: string;
  }): Promise<ArborState> {
    const scope = stateScope(input);

    return this.withScopeLock(scope, async () => {
      const current = await this.getState(input);
      const next: ArborState = {
        ...current,
        voiceId: normalizeVoiceId(input.voiceId),
      };
      await this.store.save(scope, next);
      return next;
    });
  }

  async runTurn(
    request: ArborTurnRequest,
    authorization?: string,
  ): Promise<CanonicalArborResponse> {
    const scope = stateScope(request);
    const turnId = request.turnId ?? randomUUID();
    const fingerprint = requestFingerprint(request, scope);

    return this.withScopeLock(
      scope,
      () => this.runTurnLocked({
        request,
        authorization,
        scope,
        turnId,
        fingerprint,
      }),
    );
  }

  private async runTurnLocked(input: {
    request: ArborTurnRequest;
    authorization?: string;
    scope: string;
    turnId: string;
    fingerprint: string;
  }): Promise<CanonicalArborResponse> {
    const {
      request,
      authorization,
      scope,
      turnId,
      fingerprint,
    } = input;

    try {
      const existing = await this.store.loadTurn(turnId);

      if (existing) {
        if (existing.requestFingerprint !== fingerprint) {
          throw new Error("turn_id_conflict");
        }

        await this.record(
          turnId,
          request,
          "complete",
          "turn_replayed",
          {
            replayed: true,
            subsystem: existing.response.subsystem,
            channel: existing.response.channel,
          },
        );

        return structuredClone(existing.response);
      }

      await this.record(
        turnId,
        request,
        "input",
        "turn_started",
        {
          channel: request.channel ?? "text",
        },
      );

      const prior = await this.getState(request);
      const history = await this.store.recentMessages(scope, 12);

      await this.record(
        turnId,
        request,
        "retrieve",
        "state_loaded",
        {
          subsystem: prior.activeSubsystem,
          unresolvedCount: prior.unresolvedWork.length,
          voiceId: prior.voiceId,
          historyMessages: history.length,
        },
      );

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

      await this.record(
        turnId,
        request,
        "decide",
        "subsystem_resolved",
        {
          subsystem: activeSubsystem,
        },
      );

      let externalState: Record<string, unknown> = {};
      let externalContextAvailable = false;

      try {
        externalState = await this.bridge.loadState({
          projectId: request.projectId,
          conversationId: request.conversationId,
          authorization,
        });
        externalContextAvailable =
          Object.keys(externalState).length > 0;
      } catch {
        externalState = {};
        externalContextAvailable = false;
      }

      await this.record(
        turnId,
        request,
        "retrieve",
        "external_context_checked",
        {
          externalContextAvailable,
        },
      );

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

      const agency = await this.agencyRunner({
        instructions,
        userText: request.userText,
        history,
        state,
        capabilities: buildControlCapabilities(),
        context: {
          projectId: request.projectId,
          conversationId: request.conversationId,
          turnId,
        },
        hooks: {
          onCapabilityStart: async ({
            round,
            capability,
            risk,
          }) => {
            await this.record(
              turnId,
              request,
              "act",
              "capability_started",
              {
                round,
                capability,
                risk,
              },
            );
          },
          onCapabilityResult: async ({
            round,
            capability,
            risk,
          }) => {
            await this.record(
              turnId,
              request,
              "observe",
              "capability_completed",
              {
                round,
                capability,
                risk,
              },
            );
          },
          onBoundary: async ({
            round,
            capability,
            risk,
            blocker,
          }) => {
            await this.record(
              turnId,
              request,
              "blocked",
              "agency_boundary",
              {
                round,
                capability,
                risk,
                blockedReason: blocker,
              },
            );
          },
          onVerification: async ({
            round,
            complete,
            unresolvedCount,
            strategyCandidate,
            toolCalls,
            researchCalls,
          }) => {
            await this.record(
              turnId,
              request,
              "verify",
              "completion_checked",
              {
                round,
                complete,
                unresolvedCount,
                toolCalls: toolCalls + researchCalls,
              },
            );

            if (strategyCandidate) {
              await this.record(
                turnId,
                request,
                "update",
                "strategy_candidate_observed",
                {
                  round,
                  strategyCandidate,
                },
              );
            }
          },
        },
      });

      const response = this.buildCanonicalResponse(
        request,
        turnId,
        activeSubsystem,
        agency,
      );

      await this.record(
        turnId,
        request,
        "generate",
        "canonical_response_generated",
        {
          subsystem: activeSubsystem,
          channel: response.channel,
          characterCount: response.text.length,
          voiceId: response.voice.voiceId,
          complete: agency.status === "complete",
        },
      );

      const storedTurn: StoredArborTurn = {
        turnId,
        scope,
        requestFingerprint: fingerprint,
        userText: request.userText,
        createdAt: new Date().toISOString(),
        response,
      };

      await this.store.commitTurn(
        scope,
        agency.state,
        storedTurn,
      );

      await this.record(
        turnId,
        request,
        "persist",
        "state_and_canonical_turn_persisted",
        {
          subsystem: agency.state.activeSubsystem,
          unresolvedCount: agency.state.unresolvedWork.length,
          characterCount: response.text.length,
        },
      );

      await this.bridge.persistTurn({
        projectId: request.projectId,
        conversationId: request.conversationId,
        turnId,
        userText: request.userText,
        assistantText: response.text,
        authorization,
      });

      await this.record(
        turnId,
        request,
        "complete",
        "turn_returned",
        {
          subsystem: activeSubsystem,
          channel: response.channel,
          toolCalls: agency.toolCalls + agency.researchCalls,
          complete: agency.status === "complete",
        },
      );

      return response;
    } catch (error) {
      await this.record(
        turnId,
        request,
        "error",
        "turn_failed",
      ).catch(() => undefined);

      throw error;
    }
  }

  private buildCanonicalResponse(
    request: ArborTurnRequest,
    turnId: string,
    activeSubsystem: ArborState["activeSubsystem"],
    agency: AgencyResult,
  ): CanonicalArborResponse {
    return {
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
  }

  private async withScopeLock<T>(
    scope: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const previous = (
      this.scopeTails.get(scope) ?? Promise.resolve()
    ).catch(() => undefined);

    let release: () => void = () => undefined;

    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const tail = previous.then(() => gate);
    this.scopeTails.set(scope, tail);

    await previous;

    try {
      return await work();
    } finally {
      release();

      if (this.scopeTails.get(scope) === tail) {
        this.scopeTails.delete(scope);
      }
    }
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

function requestFingerprint(
  request: ArborTurnRequest,
  scope: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        scope,
        userText: request.userText,
        channel: request.channel ?? "text",
      }),
    )
    .digest("hex");
}
