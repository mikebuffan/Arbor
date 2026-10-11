import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// This test deliberately keeps the REAL Annabelle workspace caller and route.
// Only authenticated host identity and the unavailable private database are
// synthetic. It never accesses a manuscript, provider or hosted schema.
const auth = vi.hoisted(() => ({
  requireUser: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
}));
vi.mock("@/lib/auth/requireUser", () => ({ requireUser: auth.requireUser }));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: auth.assertProjectOwnedByUser,
}));
vi.mock("@/lib/auth/routeAuthorization", () => ({
  routeErrorResponse: () => Response.json({ ok: false, error: "server_error" }, { status: 500 }),
}));
import { GET, POST } from "./route";

const ownerId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000011";
const requestId = (n: string) => `00000000-0000-4000-8000-0000000000${n}`;
type Saved = {
  canon: string[];
  locked_passages: string[];
  scene_state: string[];
  unresolved_decisions: string[];
  working_delta: string | null;
  edit_version: number;
};
type Previous = {
  canon: string[];
  lockedPassages: string[];
  sceneState: string[];
  unresolvedDecisions: string[];
  workingDelta: string | null;
};

function syntheticOwnedWorkspace() {
  let saved: Saved | null = null;
  const revisions: { id: string; resulting_version: number; snapshot: Previous }[] = [];
  const requests = new Map<string, { payload: string; version: number }>();
  const client = (): SupabaseClient => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query: any = {
        select: () => query,
        eq: (field: string, value: unknown) => { filters[field] = value; return query; },
        order: () => query,
        limit: () => table === "annabelle_manuscripts"
          ? Promise.resolve({ data: [], error: null }) : query,
        maybeSingle: async () => {
          if (table === "annabelle_workspace_state")
            return { data: saved ? structuredClone(saved) : null, error: null };
          if (table === "annabelle_workspace_revisions") {
            const row = filters.id !== undefined
              ? revisions.find(item => item.id === filters.id)
              : filters.resulting_version !== undefined
                ? revisions.find(item => item.resulting_version === filters.resulting_version)
                : revisions.at(-1);
            return { data: row ? structuredClone(row) : null, error: null };
          }
          throw new Error("unexpected_synthetic_table:" + table);
        },
      };
      return query;
    },
    rpc: async (name: string, args: Record<string, any>) => {
      if (name !== "annabelle_save_workspace_atomic")
        throw new Error("unexpected_synthetic_rpc");
      const payload = JSON.stringify(args);
      const existing = requests.get(args.p_request_id);
      if (existing) return existing.payload === payload
        ? { data: { status: "replayed", editVersion: existing.version }, error: null }
        : { data: null, error: { code: "P0001", message: "annabelle_atomic_request_id_conflict" } };
      const version = saved?.edit_version ?? 0;
      if (version !== args.p_expected_version)
        return { data: null, error: { code: "P0001", message: "annabelle_atomic_version_conflict" } };
      const snapshot: Previous = saved
        ? { canon: saved.canon, lockedPassages: saved.locked_passages,
            sceneState: saved.scene_state, unresolvedDecisions: saved.unresolved_decisions,
            workingDelta: saved.working_delta }
        : { canon: [], lockedPassages: [], sceneState: [], unresolvedDecisions: [], workingDelta: null };
      revisions.push({
        id: args.p_request_id, resulting_version: version + 1,
        snapshot: structuredClone(snapshot),
      });
      saved = {
        canon: args.p_canon, locked_passages: args.p_locked_passages,
        scene_state: args.p_scene_state, unresolved_decisions: args.p_unresolved_decisions,
        working_delta: args.p_working_delta, edit_version: version + 1,
      };
      requests.set(args.p_request_id, { payload, version: version + 1 });
      return { data: { status: "committed", editVersion: version + 1 }, error: null };
    },
  } as unknown as SupabaseClient);
  return { client, revisionCount: () => revisions.length };
}

const read = () => new Request(
  `http://localhost/api/annabelle/workspace?projectId=${projectId}`);
const write = (action: "save" | "restore", expectedVersion: number, id: string, draft?: string) =>
  new Request(`http://localhost/api/annabelle/workspace?projectId=${projectId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action, projectId, expectedVersion, requestId: id,
      ...(action === "save" ? { workingDelta: draft ?? null } : {}),
    }),
  });

describe("Annabelle synthetic HTTP → real workspace save/reopen/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    vi.stubEnv("ANNABELLE_SYNTHETIC_WORKSPACE_ENABLED", "true");
    vi.stubEnv("ANNABELLE_SYNTHETIC_PROJECT_ID", projectId);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reopens through new clients, restores the earlier draft and safely replays the restore", async () => {
    const db = syntheticOwnedWorkspace();
    // A new owned database client is constructed for every HTTP request.
    auth.requireUser.mockImplementation(async () => ({ userId: ownerId, supabase: db.client() }));
    auth.assertProjectOwnedByUser.mockResolvedValue(undefined);

    const empty = await GET(read());
    expect(empty.status).toBe(200);
    expect(await empty.json()).toMatchObject({ editVersion: 0,
      workspace: { workingDelta: null } });

    const first = await POST(write("save", 0, requestId("31"), "Fictional first draft."));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ saved: true, editVersion: 1,
      workspace: { workingDelta: "Fictional first draft." } });

    const reopened = await GET(read());
    expect(reopened.status).toBe(200);
    expect(await reopened.json()).toMatchObject({ editVersion: 1,
      workspace: { workingDelta: "Fictional first draft." } });

    const second = await POST(write("save", 1, requestId("32"), "Fictional revised draft."));
    expect(second.status).toBe(200);
    expect((await second.json()).editVersion).toBe(2);

    const restored = await POST(write("restore", 2, requestId("33")));
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ restored: true, editVersion: 3,
      workspace: { workingDelta: "Fictional first draft." } });

    // Same prior version and same request ID after a lost response must be
    // idempotent; it cannot restore the newer revision's previous state.
    const replay = await POST(write("restore", 2, requestId("33")));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ restored: true, editVersion: 3,
      workspace: { workingDelta: "Fictional first draft." } });

    const fresh = await GET(read());
    expect(await fresh.json()).toMatchObject({ editVersion: 3,
      workspace: { workingDelta: "Fictional first draft." } });
    expect(db.revisionCount()).toBe(3);

    const stale = await POST(write("save", 1, requestId("34"), "Stale overwrite."));
    expect(stale.status).toBe(409);
    expect((await stale.json()).ok).toBe(false);
    expect(db.revisionCount()).toBe(3);
    expect(auth.assertProjectOwnedByUser).toHaveBeenCalled();
  });
});
