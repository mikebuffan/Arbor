import { GET as runAcceptanceStep } from "@/app/api/admin/beta-acceptance/route";
import { supabaseAdmin } from "@/lib/supabase/admin";

type JsonObject = Record<string, unknown>;

type AcceptanceStep =
  | "setup"
  | "a1"
  | "retry"
  | "recall"
  | "isolation"
  | "ownership"
  | "correction"
  | "verify"
  | "cleanup";

const RUN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object"
    ? (value as JsonObject)
    : null;
}

function runFromUser(user: {
  user_metadata?: Record<string, unknown>;
}) {
  const value = user.user_metadata?.arbor_acceptance_run;
  return typeof value === "string" && RUN_PATTERN.test(value)
    ? value
    : null;
}

async function acceptanceUsers() {
  const admin = supabaseAdmin();
  const users: Array<{
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }> = [];

  for (let page = 1; page <= 50; page += 1) {
    const listed = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (listed.error) {
      throw new Error("acceptance_user_lookup_failed");
    }

    users.push(
      ...listed.data.users.filter((user) => {
        const email = user.email ?? "";
        return (
          email.startsWith("arbor.acceptance.") &&
          email.endsWith("@example.com") &&
          Boolean(runFromUser(user))
        );
      }),
    );

    if (listed.data.users.length < 100) break;
  }

  return users;
}

async function invoke(
  step: AcceptanceStep,
  run?: string,
) {
  const url = new URL(
    "https://acceptance.preview.invalid/api/admin/beta-acceptance",
  );
  url.searchParams.set("step", step);
  if (run) url.searchParams.set("run", run);

  const result = await runAcceptanceStep(new Request(url));

  let body: JsonObject | null = null;
  try {
    body = object(await result.json());
  } catch {
    body = null;
  }

  return {
    status: result.status,
    body:
      body ??
      ({
        ok: false,
        error: "acceptance_invalid_response",
      } satisfies JsonObject),
  };
}

async function markFailed(
  user: Awaited<ReturnType<typeof acceptanceUsers>>[number],
  step: AcceptanceStep,
  body: JsonObject,
) {
  const admin = supabaseAdmin();

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      arbor_acceptance_failed: true,
      arbor_acceptance_failure_step: step,
      arbor_acceptance_failure_code:
        typeof body.error === "string"
          ? body.error
          : "unknown",
    },
  });
}

async function invokeChecked(
  step: AcceptanceStep,
  run: string,
  user: Awaited<ReturnType<typeof acceptanceUsers>>[number],
) {
  const result = await invoke(step, run);

  if (
    result.status !== 200 ||
    result.body.ok !== true
  ) {
    await markFailed(user, step, result.body);

    return {
      ok: false,
      run,
      attemptedStep: step,
      result: result.body,
      next: "cleanup",
    };
  }

  return result.body;
}

async function durableMessageCount(userId: string) {
  const admin = supabaseAdmin();
  const counted = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (counted.error) {
    throw new Error("acceptance_message_count_failed");
  }

  return counted.count ?? 0;
}

export async function advanceBetaAcceptance() {
  const users = await acceptanceUsers();

  if (users.length > 1) {
    return {
      ok: false,
      error: "multiple_acceptance_fixtures",
      fixtureCount: users.length,
    };
  }

  if (users.length === 0) {
    const setup = await invoke("setup");
    return {
      orchestrator: "setup",
      ...setup.body,
    };
  }

  const user = users[0];
  const run = runFromUser(user);

  if (!run) {
    return {
      ok: false,
      error: "acceptance_run_missing",
    };
  }

  if (user.user_metadata?.arbor_acceptance_failed === true) {
    const cleanup = await invoke("cleanup", run);
    return {
      orchestrator: "cleanup_after_failure",
      ...cleanup.body,
    };
  }

  const count = await durableMessageCount(user.id);

  if (count === 0) {
    return {
      orchestrator: "a1",
      ...(await invokeChecked("a1", run, user)),
    };
  }

  if (count === 2) {
    const retry = await invokeChecked(
      "retry",
      run,
      user,
    );
    if (retry.ok !== true) return retry;

    const recall = await invokeChecked(
      "recall",
      run,
      user,
    );
    return {
      orchestrator: "retry_recall",
      run,
      retry,
      recall,
      ok: recall.ok === true,
      next:
        recall.ok === true
          ? "isolation"
          : "cleanup",
    };
  }

  if (count === 4) {
    const isolation = await invokeChecked(
      "isolation",
      run,
      user,
    );
    if (isolation.ok !== true) return isolation;

    const ownership = await invokeChecked(
      "ownership",
      run,
      user,
    );
    return {
      orchestrator: "isolation_ownership",
      run,
      isolation,
      ownership,
      ok: ownership.ok === true,
      next:
        ownership.ok === true
          ? "correction"
          : "cleanup",
    };
  }

  if (count === 6) {
    return {
      orchestrator: "correction",
      ...(await invokeChecked(
        "correction",
        run,
        user,
      )),
    };
  }

  if (count === 8) {
    return {
      orchestrator: "verify",
      ...(await invokeChecked(
        "verify",
        run,
        user,
      )),
    };
  }

  if (count === 10) {
    const cleanup = await invoke("cleanup", run);
    return {
      orchestrator: "cleanup",
      ...cleanup.body,
    };
  }

  await markFailed(
    user,
    "cleanup",
    {
      error: "unexpected_durable_message_count",
    },
  );

  return {
    ok: false,
    run,
    error: "unexpected_durable_message_count",
    durableMessages: count,
    next: "cleanup",
  };
}
