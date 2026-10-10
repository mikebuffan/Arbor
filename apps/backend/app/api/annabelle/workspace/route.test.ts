import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  loadVersionedAnnabelleWorkspace: vi.fn(),
  updateAnnabelleWorkspace: vi.fn(),
  restoreLatestAnnabelleWorkspaceRevision: vi.fn(),
}));
vi.mock("@/lib/auth/requireUser", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/auth/ownership", () => ({ assertProjectOwnedByUser: mocks.assertProjectOwnedByUser }));
vi.mock("@/lib/auth/routeAuthorization", () => ({
  routeErrorResponse: () => Response.json({ ok: false, error: "server_error" }, { status: 500 }),
}));
vi.mock("@/lib/arbor/subsystem/annabelleWorkspace", () => ({
  loadVersionedAnnabelleWorkspace: mocks.loadVersionedAnnabelleWorkspace,
  updateAnnabelleWorkspace: mocks.updateAnnabelleWorkspace,
  restoreLatestAnnabelleWorkspaceRevision: mocks.restoreLatestAnnabelleWorkspaceRevision,
}));
import { GET, POST } from "./route";

const projectId = "00000000-0000-4000-8000-000000000011";
const foreignId = "00000000-0000-4000-8000-000000000022";
const requestId = "00000000-0000-4000-8000-000000000031";
const workspace = {
  canon: [], lockedPassages: [], sceneState: [],
  unresolvedDecisions: [], workingDelta: null,
};
let hasManuscript = false;
const query: any = {
  select: () => query,
  eq: () => query,
  limit: async () => ({ data: hasManuscript ? [{ id: "manuscript" }] : [], error: null }),
};
const supabase = { from: vi.fn(() => query) };
function request(method: "GET" | "POST", body?: unknown, target = projectId) {
  return new Request(
    `http://localhost/api/annabelle/workspace?projectId=${target}`,
    method === "GET" ? { headers: { authorization: "Bearer synthetic" } } : {
      method, headers: {
        authorization: "Bearer synthetic", "content-type": "application/json",
      }, body: JSON.stringify(body),
    },
  );
}

describe("Annabelle synthetic editor API boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    hasManuscript = false;
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    vi.stubEnv("ANNABELLE_SYNTHETIC_WORKSPACE_ENABLED", "true");
    vi.stubEnv("ANNABELLE_SYNTHETIC_PROJECT_ID", projectId);
    mocks.requireUser.mockResolvedValue({ userId: "synthetic-owner", supabase });
    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.loadVersionedAnnabelleWorkspace.mockResolvedValue({ workspace, editVersion: 0 });
    mocks.updateAnnabelleWorkspace.mockResolvedValue({ ...workspace, workingDelta: "Synthetic prose." });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is disabled unless both synthetic and atomic release gates are enabled", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "false");
    const a = await GET(request("GET"));
    expect(a.status).toBe(404);
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    vi.stubEnv("ANNABELLE_SYNTHETIC_WORKSPACE_ENABLED", "false");
    const b = await GET(request("GET"));
    expect(b.status).toBe(404);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it("reads only the explicitly allowlisted owned synthetic project", async () => {
    const result = await GET(request("GET"));
    expect(result.status).toBe(200);
    expect((await result.json()).editVersion).toBe(0);
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(supabase, "synthetic-owner", projectId);
    const rejected = await GET(request("GET", undefined, foreignId));
    expect(rejected.status).toBe(404);
    expect(mocks.loadVersionedAnnabelleWorkspace).toHaveBeenCalledTimes(1);
  });

  it("refuses an allowlisted project if it contains any manuscript", async () => {
    hasManuscript = true;
    const result = await GET(request("GET"));
    expect(result.status).toBe(409);
    expect((await result.json()).error).toBe("annabelle_test_project_contains_manuscript");
    expect(mocks.loadVersionedAnnabelleWorkspace).not.toHaveBeenCalled();
    const post = await POST(request("POST", {
      action: "save", projectId, requestId, expectedVersion: 0,
      workingDelta: "Synthetic prose.",
    }));
    expect(post.status).toBe(409);
    expect(mocks.updateAnnabelleWorkspace).not.toHaveBeenCalled();
  });

  it("routes an approved fictional edit through the actual atomic workspace owner", async () => {
    mocks.loadVersionedAnnabelleWorkspace.mockResolvedValue({ workspace, editVersion: 1 });
    const result = await POST(request("POST", {
      action: "save", projectId, requestId, expectedVersion: 0,
      workingDelta: "Synthetic prose.",
    }));
    expect(result.status).toBe(200);
    expect(mocks.updateAnnabelleWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ projectId, requestId, expectedVersion: 0, reason: "synthetic draft acceptance" }),
      expect.any(Function),
    );
    expect((await result.json()).editVersion).toBe(1);
  });

  it("rejects missing revision tokens before any write", async () => {
    const result = await POST(request("POST", {
      action: "save", projectId, workingDelta: "Synthetic prose.",
    }));
    expect(result.status).toBe(400);
    expect(mocks.updateAnnabelleWorkspace).not.toHaveBeenCalled();
  });
});
