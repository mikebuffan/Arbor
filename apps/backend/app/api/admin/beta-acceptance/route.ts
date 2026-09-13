import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { GET as legacyGET } from "@/lib/arbor/betaAcceptanceLegacyRoute";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINISH_BRANCH = "arbor/backend-beta-finish";

const USER_TABLES = [
  "annabelle_workspace_revisions",
  "arbor_timeline_events",
  "decision_outcomes",
  "trace_logs",
  "ar_event_log",
  "ar_memory_candidates",
  "ar_memory_reinforcement",
  "ar_topic_segments",
  "arbor_agency_strategy_candidates",
  "arbor_conversation_state",
  "arbor_runtime_state",
  "chat_attachments",
  "conversation_import_chunks",
  "conversation_imports",
  "conversation_summaries",
  "safety_signals",
  "safety_state",
  "topic_stats",
  "memory_pending",
  "memory_items",
  "memory_items_legacy",
  "memories",
  "messages",
  "episodes",
  "conversations",
  "annabelle_workspace_state",
  "usage_daily",
  "user_memory_summaries",
  "user_working_context",
  "user_prefs",
  "user_profile",
  "projects",
] as const;

const VERIFY_ONLY_USER_TABLES = new Set<string>([
  "chat_attachments",
]);

class CleanupFailure extends Error {
  constructor(
    readonly code: string,
    readonly detail?: string,
  ) {
    super(code);
  }
}

function response(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-arbor-beta-acceptance": "1",
    },
  });
}

function previewAllowed() {
  return (
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === FINISH_BRANCH
  );
}

function compact(run: string) {
  return run.replaceAll("-", "");
}

function stableUuid(run: string, label: string) {
  const bytes = Buffer.from(
    createHash("sha256")
      .update(`${run}:${label}`)
      .digest()
      .subarray(0, 16),
  );

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function fixture(run: string) {
  return {
    email: `arbor.acceptance.${compact(run)}@example.com`,
    password: `ArborBeta-${compact(run)}-aA1!`,
    projectA: `ARBOR ACCEPTANCE ${run} A`,
    projectB: `ARBOR ACCEPTANCE ${run} B`,
    otherProject: `ARBOR ACCEPTANCE ${run} OTHER`,
    otherOwnerId: stableUuid(run, "other-owner"),
  };
}

function parseRun(value: string | null) {
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new CleanupFailure("invalid_run");
  }

  return value;
}

function safeDatabaseCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{1,24}$/i.test(code)
    ? code
    : "unknown";
}

async function deleteExactFixtureProjects(
  admin: SupabaseClient,
  run: string,
  projectUserId: string | null,
) {
  const f = fixture(run);

  if (projectUserId) {
    for (const name of [f.projectA, f.projectB]) {
      const deleted = await admin
        .from("projects")
        .delete()
        .eq("name", name)
        .eq("user_id", projectUserId);

      if (deleted.error) {
        throw new CleanupFailure(
          "cleanup_fixture_project_failed",
          safeDatabaseCode(deleted.error),
        );
      }
    }
  }

  const other = await admin
    .from("projects")
    .delete()
    .eq("name", f.otherProject)
    .eq("user_id", f.otherOwnerId);

  if (other.error) {
    throw new CleanupFailure(
      "cleanup_other_project_failed",
      safeDatabaseCode(other.error),
    );
  }
}

async function verifyExactFixtureProjectsGone(
  admin: SupabaseClient,
  run: string,
) {
  const f = fixture(run);
  const lookup = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .in("name", [f.projectA, f.projectB, f.otherProject]);

  if (lookup.error) {
    throw new CleanupFailure(
      "cleanup_fixture_verify_failed",
      safeDatabaseCode(lookup.error),
    );
  }

  if ((lookup.count ?? 0) !== 0) {
    throw new CleanupFailure(
      "cleanup_fixture_project_residue",
      `row_count:${lookup.count ?? 0}`,
    );
  }
}

async function setup(run: string) {
  const f = fixture(run);
  const admin = supabaseAdmin();

  const created = await admin.auth.admin.createUser({
    email: f.email,
    password: f.password,
    email_confirm: true,
    user_metadata: {
      arbor_acceptance_run: run,
    },
  });

  const userId = created.data.user?.id;
  if (created.error || !userId) {
    throw new CleanupFailure("synthetic_user_create_failed");
  }

  const inserted = await admin
    .from("projects")
    .insert([
      {
        user_id: userId,
        name: f.projectA,
        persona_id: "arbor",
        framework_version: "v1",
      },
      {
        user_id: userId,
        name: f.projectB,
        persona_id: "arbor",
        framework_version: "v1",
      },
      {
        user_id: f.otherOwnerId,
        name: f.otherProject,
        persona_id: "arbor",
        framework_version: "v1",
      },
    ])
    .select("id");

  if (inserted.error) {
    const dbCode = safeDatabaseCode(inserted.error);
    await deleteExactFixtureProjects(admin, run, userId).catch(() => undefined);
    await admin.auth.admin.deleteUser(userId);
    throw new CleanupFailure(
      "fixture_project_insert_failed",
      dbCode,
    );
  }

  if (inserted.data?.length !== 3) {
    const rowCount = inserted.data?.length ?? 0;
    await deleteExactFixtureProjects(admin, run, userId).catch(() => undefined);
    await admin.auth.admin.deleteUser(userId);
    throw new CleanupFailure(
      "fixture_project_verify_failed",
      `row_count:${rowCount}`,
    );
  }

  return {
    ok: true,
    step: "setup",
    run,
    next: "a1",
  };
}

async function resolveSyntheticIdentity(run: string) {
  const f = fixture(run);
  const admin = supabaseAdmin();

  const projectLookup = await admin
    .from("projects")
    .select("user_id,name")
    .in("name", [f.projectA, f.projectB]);

  if (projectLookup.error) {
    throw new CleanupFailure(
      "synthetic_project_lookup_failed",
      safeDatabaseCode(projectLookup.error),
    );
  }

  const projectUserIds = [
    ...new Set(
      (projectLookup.data ?? [])
        .map((row) => row.user_id)
        .filter(
          (value): value is string =>
            typeof value === "string",
        ),
    ),
  ];

  if (projectUserIds.length > 1) {
    throw new CleanupFailure(
      "synthetic_user_identity_mismatch",
    );
  }

  const projectUserId = projectUserIds[0] ?? null;
  let authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null = null;

  if (projectUserId) {
    const lookup = await admin.auth.admin.getUserById(projectUserId);
    if (!lookup.error && lookup.data.user) {
      authUser = lookup.data.user;
    }
  }

  if (!authUser) {
    for (let page = 1; page <= 50; page += 1) {
      const listed = await admin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (listed.error) {
        throw new CleanupFailure(
          "synthetic_user_lookup_failed",
        );
      }

      const match = listed.data.users.find(
        (candidate) => candidate.email === f.email,
      );

      if (match) {
        authUser = match;
        break;
      }

      if (listed.data.users.length < 100) break;
    }
  }

  if (authUser) {
    if (
      authUser.email !== f.email ||
      authUser.user_metadata?.arbor_acceptance_run !== run ||
      (projectUserId && authUser.id !== projectUserId)
    ) {
      throw new CleanupFailure(
        "synthetic_user_identity_mismatch",
      );
    }
  }

  return {
    projectUserId,
    authUserId: authUser?.id ?? null,
    validatedUserId: authUser?.id ?? null,
  };
}

async function countUserRows(
  admin: SupabaseClient,
  table: (typeof USER_TABLES)[number],
  userId: string,
) {
  const result = await admin
    .from(table)
    .select("user_id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId);

  if (result.error) {
    throw new CleanupFailure(
      "cleanup_verify_failed",
      table,
    );
  }

  return result.count ?? 0;
}

async function deleteSyntheticRows(
  admin: SupabaseClient,
  userId: string,
  run: string,
) {
  for (const table of USER_TABLES) {
    if (VERIFY_ONLY_USER_TABLES.has(table)) {
      const count = await countUserRows(
        admin,
        table,
        userId,
      );

      if (count !== 0) {
        throw new CleanupFailure(
          "cleanup_residue_remaining",
          `${table}:${count}`,
        );
      }

      continue;
    }

    const deleted = await admin
      .from(table)
      .delete()
      .eq("user_id", userId);

    if (deleted.error) {
      throw new CleanupFailure(
        "cleanup_delete_failed",
        table,
      );
    }
  }

  await deleteExactFixtureProjects(admin, run, userId);
}

async function verifyZeroResidue(
  admin: SupabaseClient,
  userId: string,
  run: string,
) {
  for (const table of USER_TABLES) {
    const count = await countUserRows(
      admin,
      table,
      userId,
    );

    if (count !== 0) {
      throw new CleanupFailure(
        "cleanup_residue_remaining",
        `${table}:${count}`,
      );
    }
  }

  await verifyExactFixtureProjectsGone(admin, run);
}

async function verifyNoOrphanUserRows(
  admin: SupabaseClient,
  userId: string,
) {
  for (const table of USER_TABLES) {
    if (table === "projects") continue;
    const count = await countUserRows(admin, table, userId);
    if (count !== 0) {
      throw new CleanupFailure(
        "orphan_cleanup_user_rows_remaining",
        `${table}:${count}`,
      );
    }
  }
}

async function cleanup(run: string) {
  const admin = supabaseAdmin();
  const identity = await resolveSyntheticIdentity(run);

  await new Promise((resolve) =>
    setTimeout(resolve, 2_000),
  );

  if (identity.validatedUserId) {
    await deleteSyntheticRows(
      admin,
      identity.validatedUserId,
      run,
    );

    const deleted = await admin.auth.admin.deleteUser(
      identity.authUserId!,
    );

    if (deleted.error) {
      throw new CleanupFailure(
        "synthetic_auth_delete_failed",
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1_000),
    );

    await deleteSyntheticRows(
      admin,
      identity.validatedUserId,
      run,
    );
    await verifyZeroResidue(
      admin,
      identity.validatedUserId,
      run,
    );

    const authLookup = await admin.auth.admin.getUserById(
      identity.authUserId!,
    );

    if (!authLookup.error && authLookup.data.user) {
      throw new CleanupFailure(
        "synthetic_auth_residue_remaining",
      );
    }
  } else {
    if (identity.projectUserId) {
      await verifyNoOrphanUserRows(
        admin,
        identity.projectUserId,
      );
    }

    await deleteExactFixtureProjects(
      admin,
      run,
      identity.projectUserId,
    );
    await verifyExactFixtureProjectsGone(admin, run);
  }

  return {
    ok: true,
    step: "cleanup",
    run,
    zeroResidue: true,
    verdict: "CLEANUP_PASS",
  };
}

export async function GET(request: Request) {
  if (!previewAllowed()) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const step = url.searchParams.get("step");

  let run: string | undefined;

  try {
    if (step === "setup") {
      run = randomUUID();
      return response(await setup(run));
    }

    if (step !== "cleanup") {
      return legacyGET(request);
    }

    run = parseRun(url.searchParams.get("run"));
    return response(await cleanup(run));
  } catch (error) {
    const code =
      error instanceof CleanupFailure
        ? error.code
        : "acceptance_wrapper_failure";
    const detail =
      error instanceof CleanupFailure
        ? error.detail
        : undefined;

    console.error("ARBOR_BETA_ACCEPTANCE_FAILURE", {
      subsystem: "beta_acceptance",
      step: step ?? "unknown",
      code,
    });

    return response(
      {
        ok: false,
        step: step ?? "unknown",
        ...(run ? { run } : {}),
        error: code,
        ...(detail ? { detail } : {}),
      },
      500,
    );
  }
}
