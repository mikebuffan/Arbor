import { describe, it, expect, beforeEach, vi } from "vitest";
import { promoteIdentityAnchors } from "@/lib/memory/promoteIdentityAnchors";

vi.mock("@/lib/memory/anchors", () => {
  return {
    setProjectAnchor: vi.fn(async () => {}),
    getProjectAnchors: vi.fn(async () => []),
  };
});

vi.mock("@/lib/prompt/buildPromptContext", () => {
  return {
    invalidatePromptCache: vi.fn(() => {}),
  };
});

import { setProjectAnchor, getProjectAnchors } from "@/lib/memory/anchors";
import { invalidatePromptCache } from "@/lib/prompt/buildPromptContext";

describe("promoteIdentityAnchors - negative anchors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes user.do_not_call from 'Don't call me X' and invalidates prompt cache", async () => {
    (getProjectAnchors as any).mockResolvedValueOnce([]);

    await promoteIdentityAnchors({
      authedUserId: "u1",
      projectId: "p1",
      userText: `Don't call me Mike. Call me Dude.`,
      extracted: [],
    });

    const calls = (setProjectAnchor as any).mock.calls as any[];
    const doNotCall = calls.find((c) => c[0]?.memKey === "user.do_not_call");
    expect(doNotCall).toBeTruthy();
    expect(doNotCall[0].memValue).toContain("Mike");

    expect(invalidatePromptCache).toHaveBeenCalledWith({
      authedUserId: "u1",
      projectId: "p1",
      conversationId: null,
    });
  });

  it("merges user.do_not_call on subsequent updates", async () => {
    (getProjectAnchors as any).mockResolvedValueOnce([
      { mem_key: "user.do_not_call", mem_value: "Mike" },
    ]);

    await promoteIdentityAnchors({
      authedUserId: "u1",
      projectId: "p1",
      userText: `Also don't call me Michael.`,
      extracted: [],
    });

    const calls = (setProjectAnchor as any).mock.calls as any[];
    const doNotCall = calls.find((c) => c[0]?.memKey === "user.do_not_call");
    expect(doNotCall).toBeTruthy();
    expect(doNotCall[0].memValue).toContain("Mike");
    expect(doNotCall[0].memValue).toContain("Michael");
  });
});
