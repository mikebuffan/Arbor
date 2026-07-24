import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { requireUser } from "@/lib/auth/requireUser";

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "must-not-be-used");
    mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 semantics for a missing bearer token", async () => {
    await expect(
      requireUser(new Request("https://arbor.test/api/chat")),
    ).rejects.toMatchObject({ status: 401, code: "auth_required" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns 401 semantics for an invalid or expired bearer token", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("expired"),
    });

    await expect(
      requireUser(
        new Request("https://arbor.test/api/chat", {
          headers: { authorization: "Bearer expired-token" },
        }),
      ),
    ).rejects.toMatchObject({ status: 401, code: "invalid_token" });
  });

  it("uses the anon key and authenticated bearer context, never service role", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const result = await requireUser(
      new Request("https://arbor.test/api/chat", {
        headers: { authorization: "Bearer valid-token" },
      }),
    );

    expect(result.userId).toBe("user-1");
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://supabase.example",
      "public-anon-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer valid-token" } },
      }),
    );
    expect(mocks.createClient).not.toHaveBeenCalledWith(
      expect.anything(),
      "must-not-be-used",
      expect.anything(),
    );
  });
});
