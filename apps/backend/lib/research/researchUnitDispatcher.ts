import type { SupabaseClient } from "@supabase/supabase-js";
import { runPatternHopResearch } from "@/lib/memory/patternHopResearch";
import type {
  ResearchUnitExecutor,
  ResearchClaim,
} from "./sessionRunner";
import type {
  ResearchSession,
  ResearchUnitReceipt,
} from "./sessionPolicy";
import { buildInvestigationIntegrityUnitHandler } from "./investigationIntegrityUnit";
import type { TrustedInvestigationFindingStore } from "./investigationIntegrityStore";

export type ResearchUnitHandler = (input: {
  session: ResearchSession;
  claim: ResearchClaim;
  remainingMs: number;
  remainingCostCents: number;
  at: string;
}) => Promise<ResearchUnitReceipt>;

export class ResearchUnitDispatcher {
  private readonly handlers = new Map<string, ResearchUnitHandler>();

  register(kind: string, handler: ResearchUnitHandler): this {
    const normalized = kind.trim();
    if (!normalized.startsWith("research.") || this.handlers.has(normalized)) {
      throw new Error("research_unit_dispatcher_invalid_registration");
    }
    this.handlers.set(normalized, handler);
    return this;
  }

  kinds(): string[] {
    return [...this.handlers.keys()].sort();
  }

  executor(): ResearchUnitExecutor {
    return async (input) => {
      const handler = this.handlers.get(input.claim.kind);
      if (!handler) {
        throw new Error("research_unit_kind_not_registered:" + input.claim.kind);
      }
      return handler(input);
    };
  }
}

function text(value: unknown, field: string, min = 1, max = 4000): string {
  if (typeof value !== "string") {
    throw new Error("invalid_research_pattern_hop_" + field);
  }
  const clean = value.trim();
  if (clean.length < min || clean.length > max) {
    throw new Error("invalid_research_pattern_hop_" + field);
  }
  return clean;
}

function optionalText(
  value: unknown,
  field: string,
  max = 4000,
): string | undefined {
  if (value === null || value === undefined) return undefined;
  return text(value, field, 1, max);
}

function integer(
  value: unknown,
  field: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === null || value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error("invalid_research_pattern_hop_" + field);
  }
  return value as number;
}

function priorRunId(claim: ResearchClaim): string | undefined {
  const payloadRun = optionalText(claim.payload.runId, "run_id", 200);
  const prior = claim.lastResult?.patternHopRunId;
  const receiptRun = optionalText(prior, "prior_run_id", 200);
  if (payloadRun && receiptRun && payloadRun !== receiptRun) {
    throw new Error("research_pattern_hop_run_id_conflict");
  }
  return receiptRun ?? payloadRun;
}

export function buildDefaultResearchUnitDispatcher(input: {
  supabase: SupabaseClient;
  integrityStore?: TrustedInvestigationFindingStore;
}): ResearchUnitDispatcher {
  const dispatcher = new ResearchUnitDispatcher().register(
    "research.pattern_hop",
    async ({ session, claim, at }) => {
      const seed = text(claim.payload.seed, "seed", 2, 4000);
      const objective = optionalText(claim.payload.objective, "objective");
      const conversationId = optionalText(
        claim.payload.conversationId,
        "conversation_id",
        200,
      );
      const maxDepth = integer(claim.payload.maxDepth, "max_depth", 4, 1, 6);
      const maxHops = integer(
        claim.payload.maxHopsPerAttempt,
        "max_hops_per_attempt",
        4,
        1,
        8,
      );
      const runId = priorRunId(claim);

      const result = await runPatternHopResearch({
        supabase: input.supabase,
        userId: session.userId,
        projectId: session.projectId,
        conversationId: conversationId ?? null,
        seed,
        objective: objective ?? session.objective,
        maxDepth,
        maxHops,
        runId,
      });

      const evidenceRefs = Array.from(
        new Set(
          result.evidence
            .map((evidence) => String(evidence.id ?? "").trim())
            .filter(Boolean),
        ),
      ).slice(0, 100);

      const terminalWithEvidence =
        (result.status === "complete" || result.status === "exhausted") &&
        evidenceRefs.length > 0;

      const status: ResearchUnitReceipt["status"] =
        result.status === "blocked"
          ? "blocked"
          : terminalWithEvidence
            ? "completed"
            : result.status === "complete" || result.status === "exhausted"
              ? "blocked"
              : "checkpointed";

      return {
        sessionId: session.id,
        unitId: claim.unitId,
        idempotencyKey: claim.idempotencyKey,
        status,
        recordedAt: at,
        costCents: 0,
        evidenceRefs,
        unresolvedRequiredWork:
          status === "completed"
            ? Math.max(0, session.unresolvedRequiredWork - 1)
            : session.unresolvedRequiredWork,
        result: {
          patternHopRunId: result.runId,
          patternHopStatus: result.status,
          frontierRemaining: result.state.frontier.length,
          foundEvidence: result.verificationState.foundEvidence,
          edgeCount: result.verificationState.edgeCount,
          absenceSemantics: result.verificationState.absenceSemantics,
          independentlyVerifiedFinding: false,
        },
      };
    },
  );

  if (input.integrityStore) {
    dispatcher.register(
      "research.integrity_gate",
      buildInvestigationIntegrityUnitHandler(input.integrityStore),
    );
  }

  return dispatcher;
}
