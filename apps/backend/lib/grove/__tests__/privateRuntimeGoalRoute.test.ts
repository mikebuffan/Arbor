import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("../privateRuntimeGoalWrite", () => ({
  savePrivateGroveRuntimeGoal: mocks.save,
}));

import { POST } from "@/app/api/grove/runtime-goal/route";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const body = {
  projectId: "00000000-0000-4000-8000-000000000001",
  conversationId: "00000000-0000-4000-8000-000000000002",
  expectedCurrentGoal: "finish the spine",
  goal: "connect Grove to ARK",
};

const req = (value: unknown = body, type = "application/json") =>
  new Request("https://grove.example.org/api/grove/runtime-goal", {
    method: "POST",
    headers: { "content-type": type },
    body: typeof value === "string" ? value : JSON.stringify(value),
  });

beforeEach(() => {
  vi.stubEnv("GROVE_API_ENABLED", "true");
  vi.stubEnv("GROVE_PRIVATE_RUNTIME_GOAL_WRITE_ENABLED", "true");
  mocks.save.mockResolvedValue({
    status: "saved",
    currentGoal: body.goal,
    replayed: false,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("explicit Grove runtime goal route", () => {
  it.each([
    "GROVE_API_ENABLED",
    "GROVE_PRIVATE_RUNTIME_GOAL_WRITE_ENABLED",
  ])("stays off before parsing when %s is off", async (flag) => {
    vi.stubEnv(flag, "false");
    expect((await POST(req("bad"))).status).toBe(404);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("passes only bounded explicit goal fields to the writer", async () => {
    const response = await POST(req());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "saved",
      currentGoal: body.goal,
      replayed: false,
      grantsExecution: false,
      verifiesCompletion: false,
    });
    expect(mocks.save).toHaveBeenCalledWith({
      ...body,
      request: expect.any(Request),
    });
  });

  it("permits an explicit null only for clearing or expecting no goal", async () => {
    expect((await POST(req({
      ...body,
      expectedCurrentGoal: null,
      goal: null,
    }))).status).toBe(200);
  });

  it.each([
    { ...body, fireflyUserId: body.projectId },
    { ...body, objectiveId: body.projectId },
    { ...body, goal: "" },
    { ...body, expectedCurrentGoal: "" },
    { ...body, goal: "x".repeat(501) },
  ])("rejects caller authority and malformed goal state %#", async (value) => {
    expect((await POST(req(value))).status).toBe(400);
  });

  it("limits request bytes and requires JSON", async () => {
    expect((await POST(req("x".repeat(5000)))).status).toBe(413);
    expect((await POST(req(body, "text/plain"))).status).toBe(415);
  });

  it("preserves stale-write conflicts without leaking provider failures", async () => {
    mocks.save.mockRejectedValueOnce(
      new RouteAccessError(409, "grove_runtime_goal_conflict"),
    );
    expect((await POST(req())).status).toBe(409);

    mocks.save.mockRejectedValueOnce(new Error("secret provider details"));
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
