import { createHash } from "node:crypto";

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

async function syntheticUserId(run: string) {
  const f = fixture(run);
  const admin = supabaseAdmin();
  const listed = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listed.error) {
    throw new CleanupFailure(
      "synthetic_user_lookup_failed",
    );
  }

  const user = listed.data.users.find(
    (candidate) => candidate.email === f.email,
  );

  if (
    !user ||
    user.user_metadata?.arbor_acceptance_run !== run
  ) {
    throw new CleanupFailure(
      "synthetic_user_identity_mismatch",
    );
  }

  return user.id;
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

  const f = fixture(run);
  const other = await admin
    .from("projects")
    .delete()
    .eq("name", f.otherProject)
    .eq("user_id", f.otherOwnerId);

  if (other.error) {
    throw new CleanupFailure(
      "cleanup_other_project_failed",
    );
  }
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

  const f = fixture(run);
  const other = await admin
    .from("projects")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("name", f.otherProject)
    .eq("user_id", f.otherOwnerId);

  if (other.error || (other.count ?? 0) !== 0) {
    throw new CleanupFailure(
      "cleanup_other_project_residue",
    );
  }
}

async function cleanup(run: string) {
  const admin = supabaseAdmin();
  const userId = await syntheticUserId(run);

  await new Promise((resolve) =>
    setTimeout(resolve, 2_000),
  );

  await deleteSyntheticRows(admin, userId, run);

  const deleted =
    await admin.auth.admin.deleteUser(userId);

  if (deleted.error) {
    throw new CleanupFailure(
      "synthetic_auth_delete_failed",
    );
  }

  await new Promise((resolve) =>
    setTimeout(resolve, 1_000),
  );

  await deleteSyntheticRows(admin, userId, run);
  await verifyZeroResidue(admin, userId, run);

  const authLookup =
    await admin.auth.admin.getUserById(userId);

  if (!authLookup.error && authLookup.data.user) {
    throw new CleanupFailure(
      "synthetic_auth_residue_remaining",
    );
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

  if (url.searchParams.get("step") !== "cleanup") {
    return legacyGET(request);
  }

  let run: string | undefined;

  try {
    run = parseRun(url.searchParams.get("run"));
    return response(await cleanup(run));
  } catch (error) {
    const code =
      error instanceof CleanupFailure
        ? error.code
        : "cleanup_internal_failure";
    const detail =
      error instanceof CleanupFailure
        ? error.detail
        : undefined;

    console.error("ARBOR_BETA_ACCEPTANCE_FAILURE", {
      subsystem: "beta_acceptance",
      step: "cleanup",
      code,
    });

    return response(
      {
        ok: false,
        step: "cleanup",
        ...(run ? { run } : {}),
        error: code,
        ...(detail ? { detail } : {}),
      },
      500,
    );
  }
}
