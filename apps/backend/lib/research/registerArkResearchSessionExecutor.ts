/**
 * RESEARCH-OWNED, DEFAULT-DISCONNECTED adapter for the EXISTING ARK runner.
 *
 * This is not a scheduler, migration, owner grant, or separate queue.
 * The ARK host must explicitly register the adapter after resolving a trusted
 * owner/project/objective/session binding and source-access authority from DB.
 * Task payload text is NEVER permission to access a source or run a tool.
 */
import type { ArkClaim } from "../ark/types";
import type { ArkExecutorRegistry } from "../ark/executorRegistry";
import {
  runTrustedArkResearchTick,
  type TrustedResearchHandoff,
} from "./arkResearchHandoff";
import type { ResearchStore, ResearchUnitExecutor } from "./sessionRunner";

export const ARK_RESEARCH_TASK_KIND = "research.session.tick" as const;

export type AuthorizedResearchBinding = {
  handoff: TrustedResearchHandoff;
  store: ResearchStore;
  executor: ResearchUnitExecutor;
};

/**
 * Must run via the trusted server: select a binding by authenticated DB rows.
 * A resolver returning null means NO access; never reconstruct from task prose.
 */
export type ResolveResearchBinding = (claim: ArkClaim) =>
  Promise<AuthorizedResearchBinding | null>;

const delay = (now: Date) => new Date(now.getTime() + 60_000).toISOString();

export function registerArkResearchSessionExecutor(input: {
  registry: ArkExecutorRegistry;
  resolveTrustedBinding: ResolveResearchBinding;
  now?: () => Date;
}): void {
  const now = input.now ?? (() => new Date());
  input.registry.register(ARK_RESEARCH_TASK_KIND, async ({ claim, heartbeat }) => {
    const sessionId = claim.task.payload.sessionId;
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return { status: "blocked", blocker: {
        kind: "external_authority",
        message: "Research session ID missing from ARK task.",
      } };
    }
    if (claim.task.objectiveId !== claim.objective.id ||
        claim.task.userId !== claim.objective.userId ||
        claim.task.projectId !== claim.objective.projectId ||
        !claim.task.leaseToken) {
      throw new Error("research_ark_claim_scope_mismatch");
    }
    // Only this injected trusted DB-backed resolver can authorize work.
    const binding = await input.resolveTrustedBinding(claim);
    if (!binding) return { status: "blocked", blocker: {
      kind: "external_authority",
      message: "Research task has no approved scoped host binding.",
    } };
    const h = binding.handoff;
    if (h.ownerId !== claim.task.userId ||
        h.projectId !== claim.task.projectId ||
        h.objectiveId !== claim.task.objectiveId ||
        h.sessionId !== sessionId ||
        h.sourceAccessApproved !== true ||
        h.privacyReviewRequired !== true ||
        !h.authorizationVersion?.trim()) {
      throw new Error("research_ark_binding_scope_mismatch");
    }

    await heartbeat();
    const result = await runTrustedArkResearchTick({
      handoff: h, store: binding.store, executor: binding.executor,
      at: now().toISOString(),
    });

    if (result.status === "not_found" || result.status === "stopped") {
      return { status: "blocked", blocker: {
        kind: "external_authority",
        message: "Research session missing or stopped; review persisted state.",
      } };
    }

    // A lost research lease means its proposed receipt was NOT committed.
    // Do not checkpoint a normal-looking ARK progress event over it.
    if (result.status === "lease_lost") {
      return { status: "blocked", blocker: {
        kind: "external_authority",
        message: "Research unit lost its lease; inspect persisted receipt and retry policy.",
      } };
    }
    // No outstanding units is a HUMAN REVIEW gate, not a forever-looping
    // checkpoint and not a verified finding. The research DB remains source
    // of truth; manual review can create a new authorized ARK objective.
    if (result.status === "idle" &&
        result.reason === "awaiting_completion_verification") {
      return { status: "blocked", blocker: {
        kind: "high_consequence_fork",
        message: "Research units exhausted; independent source/privacy review required.",
      } };
    }
    const checkpoint = "checkpoint" in result ? result.checkpoint : null;
    // One research DB-authoritative tick per ARK invocation. Even zero remaining
    // units or a research receipt is NOT independent finding verification.
    return { status: "checkpointed", checkpoint: {
      sequence: claim.task.checkpointSequence + 1,
      state: {
        kind: "research_session_reference",
        sessionId: h.sessionId,
        authorizationVersion: h.authorizationVersion,
        researchStatus: result.status,
        latestEvidenceRefs: checkpoint?.evidenceRefs ?? [],
        unresolvedRequiredWork: checkpoint?.unresolvedRequiredWork ?? null,
        // No source bodies, transcripts, model text or fabricated completion.
        independentReviewVerified: false,
      },
      nextAction: checkpoint?.unresolvedRequiredWork === 0
        ? "Await independent research completion and source/privacy review."
        : "Reload persisted research session and process next authorized unit.",
      reason: "executor" as const,
      resumeAfter: delay(now()),
    } };
  });
}
