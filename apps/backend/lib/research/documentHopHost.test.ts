import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { RouteAccessError } from "../auth/routeAuthorization";
const auth = vi.hoisted(() => ({ requireUser: vi.fn(), admin: vi.fn(), tick: vi.fn() }));
vi.mock("../auth/requireUser", () => ({ requireUser: auth.requireUser }));
vi.mock("../supabase/admin", () => ({ supabaseAdmin: auth.admin }));
vi.mock("./documentHopExecutor", () => ({ runStoredDocumentHopTick: auth.tick }));
import { GET, POST } from "../../app/api/research/document-hops/route";

const owner = "11111111-1111-4111-8111-111111111111", projectId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333", unitId = "44444444-4444-4444-8444-444444444444";
const post = (body: unknown) => new Request("https://example.org/api/research/document-hops", { method: "POST", body: JSON.stringify(body) });
function harness() {
  const state: any = {
    project: { id: projectId }, gate: { owner_id: owner, project_id: projectId, execution_enabled: false,
      scheduler_enabled: false, real_source_ingestion_enabled: false, publication_enabled: false },
    session: { id: sessionId, user_id: owner, project_id: projectId, objective: "synthetic calendar", status: "running",
      started_at: "2026-10-06T00:00:00Z", deadline_at: "2026-10-06T01:00:00Z", max_work_units: 5,
      consumed_work_units: 0, max_cost_cents: 100, committed_cost_cents: 0, authorized: true,
      cancellation_requested: false, unresolved_required_work: 3, completed_evidence_refs: [] },
    receipt: { session_id: sessionId, unit_id: unitId, user_id: owner, project_id: projectId,
      result: { unit_result: { nextPageId: unitId, hits: [], originalPageReviewRequired: true } } },
    error: null,
  };
  const queries: any[] = [];
  const from = vi.fn((table: string) => {
    const q: any = {};
    for (const k of ["select", "eq", "order", "limit"]) q[k] = vi.fn(() => q);
    q.maybeSingle = vi.fn(async () => ({ data: table === "projects" ? state.project :
      table === "arbor_research_sessions" ? state.session : table === "arbor_research_receipts" ? state.receipt : state.gate,
      error: state.error }));
    queries.push(q); return q;
  });
  const rpc = vi.fn(async () => {
    if (state.applyStop !== false) state.session.status = "cancelled";
    return { data: state.applyStop !== false, error: null };
  });
  const db = { from, rpc };
  auth.requireUser.mockResolvedValue({ userId: owner, supabase: db });
  auth.admin.mockReturnValue(db);
  auth.tick.mockResolvedValue({ status: "no_claim" });
  return { state, db, queries, from, rpc };
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("ARBOR_ENABLE_STORED_DOCUMENT_HOPS", "false"); });
afterEach(() => vi.unstubAllEnvs());

describe("authenticated document hop host route", () => {
  it("rejects invalid auth before any privileged client or executor", async () => {
    auth.requireUser.mockRejectedValue(new RouteAccessError(401, "invalid_token"));
    expect((await POST(post({ projectId, sessionId, action: "tick" }))).status).toBe(401);
    expect(auth.admin).not.toHaveBeenCalled(); expect(auth.tick).not.toHaveBeenCalled();
  });
  it("rejects client owner overrides and unowned projects before admin access", async () => {
    const h = harness();
    expect((await POST(post({ projectId, sessionId, action: "tick", userId: "foreign" }))).status).toBe(400);
    h.state.project = null;
    expect((await POST(post({ projectId, sessionId, action: "stop" }))).status).toBe(404);
    expect(auth.admin).not.toHaveBeenCalled(); expect(auth.tick).not.toHaveBeenCalled();
  });
  it("keeps a server flag from overriding the locked preview integration state", async () => {
    const h = harness();
    expect((await POST(post({ projectId, sessionId, action: "tick" }))).status).toBe(409);
    vi.stubEnv("ARBOR_ENABLE_STORED_DOCUMENT_HOPS", "true");
    for (const gate of [h.state.gate, null, { ...h.state.gate, execution_enabled: true, owner_id: "foreign" },
      { ...h.state.gate, execution_enabled: true, real_source_ingestion_enabled: true }]) {
      h.state.gate = gate;
      const response = await POST(post({ projectId, sessionId, action: "tick" }));
      expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ executionRequested: false });
    }
    expect(auth.admin).not.toHaveBeenCalled(); expect(auth.tick).not.toHaveBeenCalled();
  });
  it("binds an eligible future tick to server identity and clock rather than client overrides", async () => {
    const h = harness(); vi.stubEnv("ARBOR_ENABLE_STORED_DOCUMENT_HOPS", "true");
    h.state.gate.execution_enabled = true; // Hypothetical future schema; v6 CHECK forbids this live.
    const response = await POST(post({ projectId, sessionId, action: "tick" }));
    expect(response.status).toBe(200);
    expect(auth.tick).toHaveBeenCalledWith(expect.objectContaining({ db: h.db, ownerId: owner, projectId, sessionId, enabled: true,
      workerId: expect.stringMatching(/^document-host:/), at: expect.any(String) }));
    expect(await response.json()).toMatchObject({ researchCompletionVerified: false });
  });
  it("allows STOP while execution is off and never invokes the executor", async () => {
    const h = harness();
    const response = await POST(post({ projectId, sessionId, action: "stop" }));
    expect(response.status).toBe(200);
    expect(h.rpc).toHaveBeenCalledWith("arbor_stop_research_session", { p_session_id: sessionId, p_user_id: owner,
      p_project_id: projectId, p_status: "cancelled", p_reason: "cancelled_by_owner" });
    expect(auth.tick).not.toHaveBeenCalled();
    h.state.session.status = "cancelled";
    await POST(post({ projectId, sessionId, action: "stop" }));
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });
  it("reads scoped saved cursors through the user client without admin or execution", async () => {
    const h = harness();
    const response = await GET(new Request(`https://example.org/api/research/document-hops?projectId=${projectId}&sessionId=${sessionId}&unitId=${unitId}`));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ result: { nextPageId: unitId }, researchCompletionVerified: false });
    expect(auth.admin).not.toHaveBeenCalled(); expect(auth.tick).not.toHaveBeenCalled();
    expect(h.queries[1].eq.mock.calls).toEqual([["session_id", sessionId], ["unit_id", unitId], ["user_id", owner], ["project_id", projectId]]);
  });
  it("does not report a STOP as saved when readback fails to confirm it", async () => {
    const h = harness(); h.state.applyStop = false;
    const response = await POST(post({ projectId, sessionId, action: "stop" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "research_stop_not_confirmed" });
  });
  it("hides storage failures instead of exposing error contents", async () => {
    const h = harness(); h.state.error = new Error("private extracted text or database details");
    const response = await POST(post({ projectId, sessionId, action: "stop" }));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ ok: false, error: "document_hop_host_unavailable" });
    expect(auth.admin).not.toHaveBeenCalled();
  });
});
