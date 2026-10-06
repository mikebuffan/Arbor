import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  enabled: vi.fn(),
}));

vi.mock("../privateArkObjectiveRun", () => ({
  runPrivateGroveArkObjective: mocks.run,
  grovePrivateArkExecutionEnabled: mocks.enabled,
}));

import { POST } from "@/app/api/grove/ark/run/route";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const body = {
  projectId: "00000000-0000-4000-8000-000000000001",
  conversationId: "00000000-0000-4000-8000-000000000002",
  objectiveId: "00000000-0000-4000-8000-000000000003",
  requestId: "00000000-0000-4000-8000-000000000004",
};

const req = (value: unknown = body, type = "application/json") =>
  new Request("https://grove.example.org/api/grove/ark/run", {
    method: "POST",
    headers: { "content-type": type },
    body: typeof value === "string" ? value : JSON.stringify(value),
  });

beforeEach(() => {
  vi.stubEnv("GROVE_API_ENABLED", "true");
  mocks.enabled.mockReturnValue(true);
  mocks.run.mockResolvedValue({
    objectiveId: body.objectiveId,
    taskId: "00000000-0000-4000-8000-000000000005",
    taskStatus: "completed",
    attemptCount: 1,
    lastError: null,
    completed: true,
    replayed: false,
    resultJson: "{}",
    resultTruncated: false,
    verifiesObjectiveCompletion: false,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("explicit bounded Grove ARK run route", () => {
  it("stays unavailable before parsing when execution is not fully enabled", async () => {
    mocks.enabled.mockReturnValue(false);
    expect((await POST(req("bad"))).status).toBe(404);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("accepts only exact objective/run identifiers", async () => {
    const response = await POST(req());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      objectiveId: body.objectiveId,
      taskStatus: "completed",
      grantsExecution: true,
      verifiesObjectiveCompletion: false,
    });
    expect(mocks.run).toHaveBeenCalledWith({
      ...body,
      request: expect.any(Request),
    });
  });

  it.each([
    { ...body, userId: body.projectId },
    { ...body, taskId: body.projectId },
    { ...body, objectiveId: "not-a-uuid" },
  ])("rejects caller-supplied authority or malformed identifiers %#", async (value) => {
    expect((await POST(req(value))).status).toBe(400);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("requires JSON and bounds bytes", async () => {
    expect((await POST(req(body, "text/plain"))).status).toBe(415);
    expect((await POST(req("x".repeat(5000)))).status).toBe(413);
  });

  it("preserves scoped denial and hides provider errors", async () => {
    mocks.run.mockRejectedValueOnce(
      new RouteAccessError(403, "grove_ark_execution_not_granted"),
    );
    expect((await POST(req())).status).toBe(403);

    mocks.run.mockRejectedValueOnce(new Error("secret provider detail"));
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
