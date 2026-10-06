import type { ArkClaim } from "../ark/types";
import type { ArkExecutorRegistry } from "../ark/executorRegistry";
import {
  runResearchControllerPulse,
  type ResearchControllerPlanner,
  type ResearchControllerStore,
} from "./researchController";
import type { ResearchUnitExecutor } from "./sessionRunner";
import type { TrustedResearchHandoff } from "./arkResearchHandoff";

export const ARK_RESEARCH_CONTROLLER_TASK_KIND =
  "research.controller.tick" as const;

export type AuthorizedResearchControllerBinding = {
  handoff: TrustedResearchHandoff;
  store: ResearchControllerStore;
  executor: ResearchUnitExecutor;
  planner: ResearchControllerPlanner;
};

export type ResolveResearchControllerBinding = (
  claim: ArkClaim,
) => Promise<AuthorizedResearchControllerBinding | null>;

const resumeAfter = (now: Date, seconds = 30) =>
  new Date(now.getTime() + seconds * 1000).toISOString();

function assertClaimBinding(input: {
  claim: ArkClaim;
  binding: AuthorizedResearchControllerBinding;
  sessionId: string;
}) {
  const { claim, binding, sessionId } = input;
  const h = binding.handoff;

  if (
    claim.task.objectiveId !== claim.objective.id ||
    claim.task.userId !== claim.objective.userId ||
    claim.task.projectId !== claim.objective.projectId ||
    !claim.task.leaseToken
  ) {
    throw new Error("research_controller_ark_claim_scope_mismatch");
  }

  if (
    h.ownerId !== claim.task.userId ||
    h.projectId !== claim.task.projectId ||
    h.objectiveId !== claim.task.objectiveId ||
    h.sessionId !== sessionId ||
    h.sourceAccessApproved !== true ||
    h.privacyReviewRequired !== true ||
    !h.authorizationVersion?.trim()
  ) {
    throw new Error("research_controller_ark_binding_scope_mismatch");
  }
}

export function registerArkResearchControllerExecutor(input: {
  registry: ArkExecutorRegistry;
  resolveTrustedBinding: ResolveResearchControllerBinding;
  now?: () => Date;
}): void {
  const now = input.now ?? (() => new Date());

  input.registry.register(
    ARK_RESEARCH_CONTROLLER_TASK_KIND,
    async ({ claim, heartbeat }) => {
      const sessionId = claim.task.payload.sessionId;
      if (typeof sessionId !== "string" || !sessionId.trim()) {
        return {
          status: "blocked",
          blocker: {
            kind: "external_authority",
            message: "Research controller session ID missing from ARK task.",
          },
        };
      }

      const binding = await input.resolveTrustedBinding(claim);
      if (!binding) {
        return {
          status: "blocked",
          blocker: {
            kind: "external_authority",
            message:
              "Research controller task has no approved scoped host binding.",
          },
        };
      }

      assertClaimBinding({ claim, binding, sessionId });
      await heartbeat();

      const result = await runResearchControllerPulse({
        handoff: binding.handoff,
        store: binding.store,
        executor: binding.executor,
        planner: binding.planner,
        at: now().toISOString(),
      });

      if (result.status === "checkpointed") {
        return {
          status: "checkpointed",
          checkpoint: {
            sequence: claim.task.checkpointSequence + 1,
            state: {
              kind: "research_controller_reference",
              sessionId,
              authorizationVersion: binding.handoff.authorizationVersion,
              plan: result.plan,
              appendedUnits: result.appendedUnits,
              receiptPersisted: true,
              latestEvidenceRefs: result.checkpoint.evidenceRefs,
              unresolvedRequiredWork:
                result.checkpoint.unresolvedRequiredWork,
              receiptStatus: result.checkpoint.receiptStatus,
              independentReviewVerified: false,
            },
            nextAction:
              result.checkpoint.unresolvedRequiredWork === 0
                ? "Reassess persisted research state and require independent completion review."
                : "Reload persisted research state, re-plan, and execute one next bounded unit.",
            reason: "executor" as const,
            resumeAfter: resumeAfter(now()),
          },
        };
      }

      if (result.status === "no_claim") {
        return {
          status: "checkpointed",
          checkpoint: {
            sequence: claim.task.checkpointSequence + 1,
            state: {
              kind: "research_controller_wait_reference",
              sessionId,
              authorizationVersion: binding.handoff.authorizationVersion,
              receiptPersisted: false,
              latestEvidenceRefs: [],
              waitReason: result.reason ?? "research_controller_no_claim",
              independentReviewVerified: false,
            },
            nextAction:
              "Reload persisted research state after the bounded wait; do not infer completion from an empty claim.",
            reason: "dependency" as const,
            resumeAfter: resumeAfter(now()),
          },
        };
      }

      if (result.status === "lease_lost") {
        return {
          status: "failed",
          error:
            result.reason ??
            "research_controller_unit_lease_lost",
          retryable: true,
          retryAfterMs: 30_000,
        };
      }

      if (result.status === "awaiting_review") {
        return {
          status: "blocked",
          blocker: {
            kind: "high_consequence_fork",
            message:
              "Research controller reached an independent review boundary: " +
              result.reason,
          },
        };
      }

      if (result.status === "blocked") {
        return {
          status: "blocked",
          blocker: {
            kind: "external_authority",
            message:
              "Research controller reached a genuine boundary: " +
              result.reason,
          },
        };
      }

      if (result.status === "stopped") {
        return {
          status: "blocked",
          blocker: {
            kind: "external_authority",
            message:
              "Research session stopped; inspect persisted state before any restart: " +
              result.reason,
          },
        };
      }

      if (result.status === "idle") {
        return {
          status: "blocked",
          blocker: {
            kind: "external_authority",
            message:
              "Research session is not currently executable: " +
              result.reason,
          },
        };
      }

      return {
        status: "blocked",
        blocker: {
          kind: "external_authority",
          message:
            "Research session or controller binding was not found.",
        },
      };
    },
  );
}
