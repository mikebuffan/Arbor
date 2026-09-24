/**
 * REVIEW ONLY: independent, opt-in, single-objective ARK trigger.
 * Does not run memory decay/reflection/sync and does not set up a cron.
 * The trusted route authenticates callers before constructing runCycle.
 * ARK's database store remains responsible for atomic task claim/fencing.
 */
export type DedicatedHeartbeatResult =
  | { status: "skipped"; reason: "ark_dedicated_disabled" | "ark_execution_disabled" | "ark_canary_objective_required" | "ark_invalid_canary_objective_id" }
  | { status: "invoked"; objectiveId: string; result: unknown };

export type DedicatedHeartbeatFlags = {
  ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT?: string;
  ARBOR_ARK_ENABLE_LIVE_EXECUTION?: string;
  ARBOR_ENABLE_ARK_EXECUTION?: string;
  ARBOR_ARK_CANARY_OBJECTIVE_ID?: string;
  ARBOR_ARK_ALLOW_GLOBAL_EXECUTION?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function runDedicatedArkHeartbeat(input: {
  flags: DedicatedHeartbeatFlags;
  runCycle: (args: {
    objectiveId: string;
    workerId: string;
    maxTasks: number;
    maxRuntimeMs: number;
  }) => Promise<unknown>;
  workerId: string;
}): Promise<DedicatedHeartbeatResult> {
  const { flags } = input;
  // Dedicated switch is independent; existing flags must ALSO be enabled.
  if (flags.ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT !== "true") {
    return { status: "skipped", reason: "ark_dedicated_disabled" };
  }
  if (flags.ARBOR_ARK_ENABLE_LIVE_EXECUTION !== "true" || flags.ARBOR_ENABLE_ARK_EXECUTION !== "true") {
    return { status: "skipped", reason: "ark_execution_disabled" };
  }
  const objectiveId = flags.ARBOR_ARK_CANARY_OBJECTIVE_ID?.trim();
  if (!objectiveId) return { status: "skipped", reason: "ark_canary_objective_required" };
  if (!UUID.test(objectiveId)) return { status: "skipped", reason: "ark_invalid_canary_objective_id" };

  // Intentionally *never* switch to global dispatch, even if global flag is set.
  const result = await input.runCycle({
    objectiveId,
    workerId: input.workerId,
    maxTasks: 2,
    maxRuntimeMs: 10_000,
  });
  return { status: "invoked", objectiveId, result };
}
