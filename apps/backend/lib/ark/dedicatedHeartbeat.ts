/**
 * REVIEW ONLY: independent, opt-in, single-objective ARK trigger.
 * Does not run memory decay/reflection/sync and does not set up a cron.
 * The trusted route authenticates callers before constructing runCycle.
 * ARK's database store remains responsible for atomic task claim/fencing.
 */
export type DedicatedHeartbeatResult =
  | { status: "skipped"; reason: "ark_dedicated_disabled" | "ark_execution_disabled" | "ark_canary_objective_required" | "ark_invalid_canary_objective_id" | "ark_preview_database_required" }
  | { status: "invoked"; objectiveId: string; result: unknown };

export type DedicatedHeartbeatFlags = {
  ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT?: string;
  ARBOR_ARK_ENABLE_LIVE_EXECUTION?: string;
  ARBOR_ENABLE_ARK_EXECUTION?: string;
  ARBOR_ARK_CANARY_OBJECTIVE_ID?: string;
  ARBOR_ARK_ALLOW_GLOBAL_EXECUTION?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ARK_PREVIEW_HOST = "tzbpjbhroxiqftqwatnb.supabase.co";

/**
 * The dedicated checkpoint canary must never connect to Firefly or Grove.
 * supabaseAdmin() uses SUPABASE_URL, falling back to NEXT_PUBLIC_SUPABASE_URL;
 * check both whenever present to reject conflicting deployment configuration.
 * The project URL contains no credential and is safe to compare here.
 */
function configuredForArkPreview(flags: DedicatedHeartbeatFlags): boolean {
  const urls = [flags.SUPABASE_URL, flags.NEXT_PUBLIC_SUPABASE_URL]
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0);
  if (urls.length === 0) return false;
  return urls.every((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        url.hostname === ARK_PREVIEW_HOST &&
        url.port === "" &&
        url.username === "" &&
        url.password === "" &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === "";
    } catch {
      return false;
    }
  });
}

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
  if (!configuredForArkPreview(flags)) {
    return { status: "skipped", reason: "ark_preview_database_required" };
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
