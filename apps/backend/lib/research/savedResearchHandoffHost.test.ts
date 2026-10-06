import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), owned: vi.fn(), admin: vi.fn(), record: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth/requireUser", () => ({ requireUser: mocks.auth }));
vi.mock("@/lib/auth/ownership", () => ({ assertProjectOwnedByUser: mocks.owned }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("./savedResearchHandoff", async importOriginal => ({ ...await importOriginal<object>(),
  recordSavedResearchHandoff: mocks.record, readSavedResearchCheckpoint: mocks.read }));
import { GET, POST } from "@/app/api/research/saved-handoff/route";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
const projectId = "22222222-2222-4222-8222-222222222222", owner = "11111111-1111-4111-8111-111111111111";
const objectiveId = "33333333-3333-4333-8333-333333333333";
const handoff = { version: 1, runRef: "synthetic",
  artifacts: [{ name: "note.md", libraryFileId: "libfile_synthetic", fileId: "file_synthetic", libraryVersion: 1, bytes: 1, sha256: "a".repeat(64) }],
  sources: [{ identifier: "source", url: "https://example.invalid/source", sha256: "b".repeat(64), physicalPages: 1,
    inspectedPages: "p1", familyOverlap: "one family", accessUncertainty: "synthetic" }], observations: ["manual observation"],
  contradictions: [], uncertainty: ["unverified execution"], nextQuestion: "Where is the executed instrument?",
  evidenceStatus: "manual_observations_not_misconduct_findings", saveVerification: "reported_library_receipt_requires_independent_recovery" };
const post = (value: unknown) => new Request("https://example.invalid/api/research/saved-handoff", { method: "POST", body: JSON.stringify(value) });
let db: any;
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ARBOR_ENABLE_SAVED_RESEARCH_HANDOFF", "false");
  db = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: owner,
    app_metadata: { arbor_saved_research_handoff: { project_ids: [projectId] } } } }, error: null }) } };
  mocks.auth.mockResolvedValue({ userId: owner, supabase: db }); mocks.admin.mockReturnValue({ service: true });
  mocks.record.mockResolvedValue({ objectiveId, nextQuestion: handoff.nextQuestion, researchCompletionVerified: false, executionRequested: false });
});
afterEach(() => vi.unstubAllEnvs());
describe("manual saved research host", () => {
  it("denies missing authentication before privileged access", async () => {
    mocks.auth.mockRejectedValue(new RouteAccessError(401, "invalid_token"));
    expect((await POST(post({ projectId, handoff }))).status).toBe(401); expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("rejects malformed or overridden scope and oversized envelopes", async () => {
    expect((await POST(post({ projectId, handoff, ownerId: owner }))).status).toBe(400);
    expect((await POST(new Request("https://example.invalid", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await POST(new Request("https://example.invalid", { method: "POST", body: "x".repeat(262145) }))).status).toBe(413);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("checks owned project before service access, and defaults writes off", async () => {
    expect((await POST(post({ projectId, handoff }))).status).toBe(409);
    vi.stubEnv("ARBOR_ENABLE_SAVED_RESEARCH_HANDOFF", "true"); mocks.owned.mockRejectedValue(new RouteAccessError(404, "project_not_found"));
    expect((await POST(post({ projectId, handoff }))).status).toBe(404); expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("requires fresh server-owned project grant; editable metadata and changed identity fail", async () => {
    vi.stubEnv("ARBOR_ENABLE_SAVED_RESEARCH_HANDOFF", "true");
    for (const user of [{ id: owner, user_metadata: { arbor_saved_research_handoff: { project_ids: [projectId] } } },
      { id: "foreign", app_metadata: { arbor_saved_research_handoff: { project_ids: [projectId] } } }]) {
      db.auth.getUser.mockResolvedValue({ data: { user }, error: null });
      expect((await POST(post({ projectId, handoff }))).status).toBe(403);
    }
    expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.record).not.toHaveBeenCalled();
  });
  it("uses server identity and returns confirmed custody without claiming completed research", async () => {
    vi.stubEnv("ARBOR_ENABLE_SAVED_RESEARCH_HANDOFF", "true");
    const response = await POST(post({ projectId, handoff }));
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.record).toHaveBeenCalledWith({ db: { service: true }, ownerId: owner, projectId, handoff,
      workerId: expect.stringMatching(/^saved-research:/) });
    expect(await response.json()).toMatchObject({ researchCompletionVerified: false, executionRequested: false });
  });
  it("reads scoped checkpoint through user RLS while writes are off, with no privileged client", async () => {
    mocks.read.mockResolvedValue({ handoff, nextQuestion: handoff.nextQuestion });
    const response = await GET(new Request(`https://example.invalid?projectId=${projectId}&objectiveId=${objectiveId}`));
    expect(response.status).toBe(200); expect(mocks.read).toHaveBeenCalledWith(db, owner, projectId, objectiveId);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("fails closed on unavailable storage and redacts underlying errors", async () => {
    vi.stubEnv("ARBOR_ENABLE_SAVED_RESEARCH_HANDOFF", "true"); mocks.record.mockRejectedValue(new Error("secret SQL source text"));
    const response = await POST(post({ projectId, handoff }));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ ok: false, error: "saved_research_handoff_unavailable" });
  });
});
