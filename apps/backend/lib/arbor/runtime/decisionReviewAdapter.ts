/**
 * Existing-state adapter for the read-only decision-review prototype.
 *
 * Reuses the canonical agency and continuity loaders. This deliberately does
 * not fabricate a longitudinal decision trail from one merged runtime snapshot:
 * agency is current work state, corrections may be merged across conversations,
 * and an ARK task state is not permission to execute or proof of completion.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAgencyState } from "../agency/state";
import { loadRuntimeState } from "./runtimeStateStore";
import type { AgencyBlocker, AgencyState } from "../agency/engine";
import type { ArborCorrectionKind } from "./runtimeState";

export type ExistingReviewScope = {
  userId: string;
  projectId: string;
  conversationId: string;
};

export type ExistingDecisionReview = {
  scope: ExistingReviewScope;
  agency: {
    goal: string;
    status: AgencyState["status"];
    blocker: AgencyBlocker | null;
    nextAction: string | null;
    objectiveRevision: number | null;
    /** Unverified progress is never called completed by this adapter. */
    lastVerificationOk: boolean | null;
  } | null;
  correctionSignals: Array<{
    id: string;
    kind: ArborCorrectionKind;
    observedAt: string;
    occurrences: number;
    origin: "project-merged-unknown-original-conversation";
  }>;
  needsHumanDecisionReview: boolean;
  humanDecisionReason: AgencyBlocker | null;
  runtimeSource: "exact-conversation-or-merged-fallback" | "unavailable";
  warnings: Array<
    "blocked_without_explicit_reason" |
    "unverified_completion" |
    "merged_correction_origin_unknown"
  >;
  sourceReadOnly: true;
  outcomeVerifiedHere: false;
  grantsExecution: false;
  grantsMemoryPromotion: false;
};

const BOUND_BLOCKERS: readonly AgencyBlocker[] = [
  "external_authority", "irreversible_action",
  "missing_preference", "high_consequence_fork",
];
function requireScope(scope: ExistingReviewScope): void {
  if (!scope || ![scope.userId, scope.projectId, scope.conversationId].every(
    value => typeof value === "string" && value.trim().length > 0 && value.length <= 200))
    throw new Error("decision_review_source_scope_required");
}

/** Extract only explicitly stored facts; do not manufacture decisions/receipts. */
export function projectExistingDecisionReview(input: {
  scope: ExistingReviewScope;
  agency: AgencyState | null;
  runtime: Awaited<ReturnType<typeof loadRuntimeState>>;
}): ExistingDecisionReview {
  requireScope(input.scope);
  const { agency, runtime, scope } = input;
  if (runtime && (runtime.userId !== scope.userId ||
      runtime.projectId !== scope.projectId))
    throw new Error("decision_review_source_runtime_scope_mismatch");

  const blocker = agency?.status === "blocked" &&
    BOUND_BLOCKERS.includes(agency.blocker as AgencyBlocker)
      ? agency.blocker ?? null : null;
  const warnings: ExistingDecisionReview["warnings"] = [];
  if (agency?.status === "blocked" && !blocker)
    warnings.push("blocked_without_explicit_reason");
  if (agency?.status === "complete" && agency.lastVerification?.ok !== true)
    warnings.push("unverified_completion");

  // loadRuntimeState deliberately merges cross-thread correction snapshots.
  // The original conversation/event provenance cannot be inferred here.
  const corrections = runtime?.corrections ?? [];
  if (corrections.length) warnings.push("merged_correction_origin_unknown");

  return {
    scope: { ...scope },
    agency: agency ? {
      goal: agency.goal,
      status: agency.status,
      blocker,
      nextAction: agency.objective?.nextAction ?? null,
      objectiveRevision: agency.objective?.revision ?? null,
      lastVerificationOk: agency.lastVerification?.ok ?? null,
    } : null,
    correctionSignals: corrections.slice(0, 50).map(item => ({
      id: item.id,
      kind: item.kind,
      observedAt: item.observedAt,
      occurrences: item.occurrences ?? 1,
      origin: "project-merged-unknown-original-conversation" as const,
    })),
    needsHumanDecisionReview: blocker !== null,
    humanDecisionReason: blocker,
    runtimeSource: runtime ? "exact-conversation-or-merged-fallback" : "unavailable",
    warnings,
    sourceReadOnly: true,
    outcomeVerifiedHere: false,
    grantsExecution: false,
    grantsMemoryPromotion: false,
  };
}

/**
 * Read via existing owner/project-scoped loaders. No new table or grant.
 * The caller must authenticate scope and decide whether it may expose the
 * returned information. This does not become a public route or auth boundary.
 */
export async function readExistingDecisionReview(input: {
  supabase: SupabaseClient;
  scope: ExistingReviewScope;
}): Promise<ExistingDecisionReview> {
  requireScope(input.scope);
  const { userId, projectId, conversationId } = input.scope;
  const [agency, runtime] = await Promise.all([
    loadAgencyState({ supabase: input.supabase, userId, projectId }),
    loadRuntimeState({ supabase: input.supabase, userId, projectId, conversationId }),
  ]);
  return projectExistingDecisionReview({ scope: input.scope, agency, runtime });
}
