import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

type Step =
  | "setup"
  | "a1"
  | "retry"
  | "recall"
  | "isolation"
  | "ownership"
  | "correction"
  | "verify"
  | "cleanup";

type JsonObject = Record<string, unknown>;

class AcceptanceFailure extends Error {
  constructor(
    readonly code: string,
    readonly detail?: string,
  ) {
    super(code);
  }
}

function response(body: JsonObject, status = 200) {
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

function supabaseUrl() {
  const value =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new AcceptanceFailure("missing_supabase_url");
  return value;
}

function authClient() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!key) throw new AcceptanceFailure("missing_publishable_key");

  return createClient(supabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function compact(run: string) {
  return run.replaceAll("-", "");
}

function fixture(run: string) {
  const marker = compact(run).slice(0, 10).toUpperCase();

  return {
    email: `arbor.acceptance.${compact(run)}@example.com`,
    password: `ArborBeta-${compact(run)}-aA1!`,
    projectA: `ARBOR ACCEPTANCE ${run} A`,
    projectB: `ARBOR ACCEPTANCE ${run} B`,
    otherProject: `ARBOR ACCEPTANCE ${run} OTHER`,
    otherOwnerId: stableUuid(run, "other-owner"),
    observatory: `Marrowglass ${marker}`,
    oldPhrase: `Silver Orchard SO-${marker}`,
    newPhrase: `Blue Lantern BL-${marker}`,
    marker,
  };
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

function parseRun(value: string | null) {
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new AcceptanceFailure("invalid_run");
  }
  return value;
}

function parseStep(value: string | null): Step {
  const allowed: Step[] = [
    "setup",
    "a1",
    "retry",
    "recall",
    "isolation",
    "ownership",
    "correction",
    "verify",
    "cleanup",
  ];

  if (!value || !allowed.includes(value as Step)) {
    throw new AcceptanceFailure("invalid_step");
  }
  return value as Step;
}

function a1Text(run: string) {
  const f = fixture(run);
  return (
    `Remember this for this project: the fictional observatory is called ` +
    `${f.observatory}. Its access phrase is ${f.oldPhrase}.`
  );
}

function recallText(run: string) {
  const f = fixture(run);
  return (
    `What is the access phrase for the fictional observatory I told you about? ` +
    `Reply with the phrase if you know it. Acceptance marker ${f.marker}.`
  );
}

function isolationText(run: string) {
  const f = fixture(run);
  return (
    `What access phrase did I give this project's fictional observatory? ` +
    `If I never gave one in this project, say you do not know. ` +
    `Acceptance marker ${f.marker}.`
  );
}

function correctionText(run: string) {
  const f = fixture(run);
  return (
    `Correction: the fictional observatory's access phrase is ` +
    `${f.newPhrase}, not ${f.oldPhrase}.`
  );
}

function correctedRecallText(run: string) {
  const f = fixture(run);
  return (
    `What is the corrected access phrase for my fictional observatory? ` +
    `Reply with the corrected phrase if you know it. ` +
    `Acceptance marker ${f.marker}.`
  );
}

async function readJson(value: Response): Promise<JsonObject | null> {
  try {
    const body = await value.json();
    return body && typeof body === "object"
      ? (body as JsonObject)
      : null;
  } catch {
    return null;
  }
}

function assistantText(body: JsonObject | null) {
  return typeof body?.assistantText === "string"
    ? body.assistantText
    : null;
}

async function signIn(run: string) {
  const f = fixture(run);
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: f.email,
    password: f.password,
  });

  if (
    error ||
    !data.user?.id ||
    !data.session?.access_token
  ) {
    throw new AcceptanceFailure("synthetic_signin_failed");
  }

  return {
    userId: data.user.id,
    token: data.session.access_token,
  };
}

async function projects(run: string) {
  const f = fixture(run);
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("projects")
    .select("id,user_id,name")
    .in("name", [f.projectA, f.projectB, f.otherProject]);

  if (error) throw new AcceptanceFailure("project_lookup_failed");

  const a = data?.find((row) => row.name === f.projectA);
  const b = data?.find((row) => row.name === f.projectB);
  const other = data?.find((row) => row.name === f.otherProject);

  if (!a?.id || !b?.id || !other?.id) {
    throw new AcceptanceFailure("fixture_projects_missing");
  }

  return {
    projectAId: a.id as string,
    projectBId: b.id as string,
    otherProjectId: other.id as string,
    userId: a.user_id as string,
  };
}

async function createConversation(
  token: string,
  projectId: string,
  origin: string,
) {
  const { POST } = await import("@/app/api/conversations/route");

  const result = await POST(
    new Request(`${origin}/api/conversations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ projectId }),
    }),
  );

  const body = await readJson(result);
  const conversation =
    body?.conversation && typeof body.conversation === "object"
      ? (body.conversation as JsonObject)
      : null;
  const id =
    typeof conversation?.id === "string"
      ? conversation.id
      : null;

  if (!result.ok || !id) {
    throw new AcceptanceFailure(
      "conversation_create_failed",
      String(result.status),
    );
  }
  return id;
}

async function chat(input: {
  token: string;
  origin: string;
  projectId: string;
  conversationId?: string;
  turnId: string;
  userText: string;
}) {
  const { POST } = await import("@/app/api/chat/route");

  const result = await POST(
    new Request(`${input.origin}/api/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        projectId: input.projectId,
        conversationId: input.conversationId,
        turnId: input.turnId,
        userText: input.userText,
        interactionMode: "text",
      }),
    }),
  );

  return {
    status: result.status,
    body: await readJson(result),
  };
}

async function successfulAssistant(
  result: Awaited<ReturnType<typeof chat>>,
) {
  const text = assistantText(result.body);
  if (result.status !== 200 || !text) {
    throw new AcceptanceFailure("chat_failed", String(result.status));
  }
  return text;
}

async function conversationMessages(
  admin: SupabaseClient,
  userId: string,
  conversationId: string,
) {
  const { data, error } = await admin
    .from("messages")
    .select("id,role,content")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new AcceptanceFailure("message_lookup_failed");
  return data ?? [];
}

async function assertDurablePair(
  admin: SupabaseClient,
  userId: string,
  conversationId: string,
  visibleText: string,
) {
  const rows = await conversationMessages(
    admin,
    userId,
    conversationId,
  );
  const users = rows.filter((row) => row.role === "user");
  const assistants = rows.filter(
    (row) => row.role === "assistant",
  );

  if (
    rows.length !== 2 ||
    users.length !== 1 ||
    assistants.length !== 1 ||
    assistants[0]?.content !== visibleText
  ) {
    throw new AcceptanceFailure("durable_pair_mismatch");
  }
}

async function conversationForText(
  admin: SupabaseClient,
  userId: string,
  projectId: string,
  content: string,
) {
  const { data, error } = await admin
    .from("messages")
    .select("conversation_id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("role", "user")
    .eq("content", content)
    .limit(1)
    .maybeSingle();

  if (error || !data?.conversation_id) {
    throw new AcceptanceFailure("source_conversation_missing");
  }
  return data.conversation_id as string;
}

async function activeMemories(
  admin: SupabaseClient,
  userId: string,
  projectId: string,
) {
  const { data, error } = await admin
    .from("memory_items")
    .select(
      "id,key,value,correction_count,status,deleted_at,delete_reason",
    )
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) throw new AcceptanceFailure("memory_lookup_failed");
  return data ?? [];
}

function memoryContains(
  row: { value?: unknown },
  needle: string,
) {
  return JSON.stringify(row.value).includes(needle);
}

async function waitForMemory(
  admin: SupabaseClient,
  userId: string,
  projectId: string,
  needle: string,
) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    const rows = await activeMemories(
      admin,
      userId,
      projectId,
    );
    if (rows.some((row) => memoryContains(row, needle))) {
      return rows;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new AcceptanceFailure("memory_continuation_timeout");
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
    throw new AcceptanceFailure("synthetic_user_create_failed");
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

  if (inserted.error || inserted.data?.length !== 3) {
    await admin.auth.admin.deleteUser(userId);
    throw new AcceptanceFailure("fixture_project_create_failed");
  }

  return {
    ok: true,
    step: "setup",
    run,
    next: "a1",
  };
}

async function stepA1(run: string, origin: string) {
  const admin = supabaseAdmin();
  const auth = await signIn(run);
  const p = await projects(run);
  const conversationId = await createConversation(
    auth.token,
    p.projectAId,
    origin,
  );

  const result = await chat({
    token: auth.token,
    origin,
    projectId: p.projectAId,
    conversationId,
    turnId: stableUuid(run, "a1"),
    userText: a1Text(run),
  });
  const text = await successfulAssistant(result);

  await assertDurablePair(
    admin,
    auth.userId,
    conversationId,
    text,
  );

  return {
    ok: true,
    step: "a1",
    run,
    providerTurn: "pass",
    durablePair: "pass",
    assistantSha256: createHash("sha256")
      .update(text)
      .digest("hex"),
    next: "retry",
  };
}

async function stepRetry(run: string, origin: string) {
  const admin = supabaseAdmin();
  const auth = await signIn(run);
  const p = await projects(run);
  const conversationId = await conversationForText(
    admin,
    auth.userId,
    p.projectAId,
    a1Text(run),
  );
  const before = await conversationMessages(
    admin,
    auth.userId,
    conversationId,
  );
  const durable = before.find(
    (row) => row.role === "assistant",
  )?.content;

  const result = await chat({
    token: auth.token,
    origin,
    projectId: p.projectAId,
    conversationId,
    turnId: stableUuid(run, "a1"),
    userText: a1Text(run),
  });
  const text = await successfulAssistant(result);
  const after = await conversationMessages(
    admin,
    auth.userId,
    conversationId,
  );

  if (
    before.length !== 2 ||
    after.length !== 2 ||
    !durable ||
    text !== durable
  ) {
    throw new AcceptanceFailure("same_turn_retry_diverged");
  }

  return {
    ok: true,
    step: "retry",
    run,
    sameTurnIdConverged: true,
    duplicateRows: false,
    next: "recall",
  };
}

async function stepRecall(run: string, origin: string) {
  const admin = supabaseAdmin();
  const f = fixture(run);
  const auth = await signIn(run);
  const p = await projects(run);

  await waitForMemory(
    admin,
    auth.userId,
    p.projectAId,
    f.oldPhrase,
  );

  const sourceConversation = await conversationForText(
    admin,
    auth.userId,
    p.projectAId,
    a1Text(run),
  );
  const conversationId = await createConversation(
    auth.token,
    p.projectAId,
    origin,
  );

  if (conversationId === sourceConversation) {
    throw new AcceptanceFailure(
      "cross_conversation_not_created",
    );
  }

  const result = await chat({
    token: auth.token,
    origin,
    projectId: p.projectAId,
    conversationId,
    turnId: stableUuid(run, "recall"),
    userText: recallText(run),
  });
  const text = await successfulAssistant(result);

  await assertDurablePair(
    admin,
    auth.userId,
    conversationId,
    text,
  );

  if (!text.includes(f.oldPhrase)) {
    throw new AcceptanceFailure(
      "cross_conversation_recall_failed",
    );
  }

  return {
    ok: true,
    step: "recall",
    run,
    crossConversationRecall: true,
    next: "isolation",
  };
}

async function stepIsolation(
  run: string,
  origin: string,
) {
  const admin = supabaseAdmin();
  const f = fixture(run);
  const auth = await signIn(run);
  const p = await projects(run);
  const conversationId = await createConversation(
    auth.token,
    p.projectBId,
    origin,
  );

  const result = await chat({
    token: auth.token,
    origin,
    projectId: p.projectBId,
    conversationId,
    turnId: stableUuid(run, "isolation"),
    userText: isolationText(run),
  });
  const text = await successfulAssistant(result);

  await assertDurablePair(
    admin,
    auth.userId,
    conversationId,
    text,
  );

  if (
    text.includes(f.oldPhrase) ||
    text.includes(f.newPhrase) ||
    text.includes(f.observatory)
  ) {
    throw new AcceptanceFailure(
      "cross_project_isolation_failed",
    );
  }

  return {
    ok: true,
    step: "isolation",
    run,
    crossProjectIsolation: true,
    next: "ownership",
  };
}

async function stepOwnership(
  run: string,
  origin: string,
) {
  const auth = await signIn(run);
  const p = await projects(run);

  const result = await chat({
    token: auth.token,
    origin,
    projectId: p.otherProjectId,
    turnId: stableUuid(run, "ownership"),
    userText: `Ownership boundary probe ${fixture(run).marker}`,
  });

  if (![403, 404].includes(result.status)) {
    throw new AcceptanceFailure(
      "ownership_boundary_failed",
      String(result.status),
    );
  }

  return {
    ok: true,
    step: "ownership",
    run,
    ownershipBoundary: true,
    rejectedStatus: result.status,
    next: "correction",
  };
}

async function stepCorrection(
  run: string,
  origin: string,
) {
  const admin = supabaseAdmin();
  const f = fixture(run);
  const auth = await signIn(run);
  const p = await projects(run);

  await waitForMemory(
    admin,
    auth.userId,
    p.projectAId,
    f.oldPhrase,
  );

  const conversationId = await createConversation(
    auth.token,
    p.projectAId,
    origin,
  );

  const result = await chat({
    token: auth.token,
    origin,
    projectId: p.projectAId,
    conversationId,
    turnId: stableUuid(run, "correction"),
    userText: correctionText(run),
  });
  const text = await successfulAssistant(result);

  await assertDurablePair(
    admin,
    auth.userId,
    conversationId,
    text,
  );

  return {
    ok: true,
    step: "correction",
    run,
    correctionTurn: "pass",
    next: "verify",
  };
}

async function stepVerify(
  run: string,
  origin: string,
) {
  const admin = supabaseAdmin();
  const f = fixture(run);
  const auth = await signIn(run);
  const p = await projects(run);

  const activeA = await waitForMemory(
    admin,
    auth.userId,
    p.projectAId,
    f.newPhrase,
  );

  const oldRows = activeA.filter((row) =>
    memoryContains(row, f.oldPhrase),
  );
  const newRows = activeA.filter((row) =>
    memoryContains(row, f.newPhrase),
  );

  if (oldRows.length !== 0 || newRows.length < 1) {
    throw new AcceptanceFailure(
      "correction_memory_convergence_failed",
    );
  }

  if (
    !newRows.some(
      (row) => Number(row.correction_count ?? 0) >= 1,
    )
  ) {
    throw new AcceptanceFailure(
      "correction_count_not_incremented",
    );
  }

  const activeB = await activeMemories(
    admin,
    auth.userId,
    p.projectBId,
  );

  if (
    activeB.some((row) =>
      JSON.stringify(row.value).includes(f.marker),
    )
  ) {
    throw new AcceptanceFailure(
      "project_b_fixture_memory_leaked",
    );
  }

  const conversationId = await createConversation(
    auth.token,
    p.projectAId,
    origin,
  );

  const result = await chat({
    token: auth.token,
    origin,
    projectId: p.projectAId,
    conversationId,
    turnId: stableUuid(run, "verify"),
    userText: correctedRecallText(run),
  });
  const text = await successfulAssistant(result);

  await assertDurablePair(
    admin,
    auth.userId,
    conversationId,
    text,
  );

  if (
    !text.includes(f.newPhrase) ||
    text.includes(f.oldPhrase)
  ) {
    throw new AcceptanceFailure(
      "corrected_recall_failed",
    );
  }

  const counted = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.userId);

  if (counted.error || counted.count !== 10) {
    throw new AcceptanceFailure(
      "logical_turn_message_count_failed",
      String(counted.count ?? -1),
    );
  }

  return {
    ok: true,
    step: "verify",
    run,
    checks: {
      providerTurns: "pass",
      durablePairs: "pass",
      sameTurnIdRetry: "pass",
      crossConversationRecall: "pass",
      crossProjectIsolation: "pass",
      ownershipBoundary: "pass",
      correctionConvergence: "pass",
      correctedRecall: "pass",
      logicalTurns: 5,
      durableMessages: counted.count,
    },
    next: "cleanup",
  };
}

async function syntheticUserId(run: string) {
  const f = fixture(run);
  const admin = supabaseAdmin();
  const listed = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listed.error) {
    throw new AcceptanceFailure(
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
    throw new AcceptanceFailure(
      "synthetic_user_identity_mismatch",
    );
  }

  return user.id;
}

async function deleteSyntheticRows(
  admin: SupabaseClient,
  userId: string,
  run: string,
) {
  for (const table of USER_TABLES) {
    const deleted = await admin
      .from(table)
      .delete()
      .eq("user_id", userId);

    if (deleted.error) {
      throw new AcceptanceFailure(
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
    throw new AcceptanceFailure(
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
    const result = await admin
      .from(table)
      .select("user_id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId);

    if (result.error) {
      throw new AcceptanceFailure(
        "cleanup_verify_failed",
        table,
      );
    }

    if ((result.count ?? 0) !== 0) {
      throw new AcceptanceFailure(
        "cleanup_residue_remaining",
        `${table}:${result.count}`,
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
    throw new AcceptanceFailure(
      "cleanup_other_project_residue",
    );
  }
}

async function stepCleanup(run: string) {
  const admin = supabaseAdmin();
  const userId = await syntheticUserId(run);

  await new Promise((resolve) => setTimeout(resolve, 2_000));
  await deleteSyntheticRows(admin, userId, run);

  const deleted = await admin.auth.admin.deleteUser(userId);
  if (deleted.error) {
    throw new AcceptanceFailure(
      "synthetic_auth_delete_failed",
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 1_000));
  await deleteSyntheticRows(admin, userId, run);
  await verifyZeroResidue(admin, userId, run);

  const authLookup =
    await admin.auth.admin.getUserById(userId);

  if (!authLookup.error && authLookup.data.user) {
    throw new AcceptanceFailure(
      "synthetic_auth_residue_remaining",
    );
  }

  return {
    ok: true,
    step: "cleanup",
    run,
    zeroResidue: true,
    verdict: "LIVE_ACCEPTANCE_PASS",
  };
}

export async function GET(request: Request) {
  if (!previewAllowed()) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  let step: Step | undefined;
  let run: string | undefined;

  try {
    step = parseStep(url.searchParams.get("step"));

    if (step === "setup") {
      run = randomUUID();
      return response(await setup(run));
    }

    run = parseRun(url.searchParams.get("run"));

    const result =
      step === "a1"
        ? await stepA1(run, url.origin)
        : step === "retry"
          ? await stepRetry(run, url.origin)
          : step === "recall"
            ? await stepRecall(run, url.origin)
            : step === "isolation"
              ? await stepIsolation(run, url.origin)
              : step === "ownership"
                ? await stepOwnership(run, url.origin)
                : step === "correction"
                  ? await stepCorrection(run, url.origin)
                  : step === "verify"
                    ? await stepVerify(run, url.origin)
                    : await stepCleanup(run);

    return response(result);
  } catch (error) {
    const code =
      error instanceof AcceptanceFailure
        ? error.code
        : "acceptance_internal_failure";
    const detail =
      error instanceof AcceptanceFailure
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
