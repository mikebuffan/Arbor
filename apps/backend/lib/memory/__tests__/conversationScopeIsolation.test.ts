import { describe, expect, it } from "vitest";
import { isMemoryInProjectScope } from "@/lib/memory/retrieval";

describe("conversation memory scope isolation", () => {
  const projectId = "project-a";
  const conversationId = "conversation-a";

  it("allows global memory in any conversation", () => {
    expect(
      isMemoryInProjectScope(
        { project_id: null, conversation_id: null, scope: "global" },
        projectId,
        conversationId,
      ),
    ).toBe(true);
  });

  it("allows project memory throughout the same project", () => {
    expect(
      isMemoryInProjectScope(
        { project_id: projectId, conversation_id: null, scope: "project" },
        projectId,
        conversationId,
      ),
    ).toBe(true);
  });

  it("allows conversation memory only in the exact conversation", () => {
    expect(
      isMemoryInProjectScope(
        {
          project_id: projectId,
          conversation_id: conversationId,
          scope: "conversation",
        },
        projectId,
        conversationId,
      ),
    ).toBe(true);

    expect(
      isMemoryInProjectScope(
        {
          project_id: projectId,
          conversation_id: "conversation-b",
          scope: "conversation",
        },
        projectId,
        conversationId,
      ),
    ).toBe(false);
  });

  it("fails closed for legacy conversation memory without lineage", () => {
    expect(
      isMemoryInProjectScope(
        {
          project_id: projectId,
          conversation_id: null,
          scope: "conversation",
        },
        projectId,
        conversationId,
      ),
    ).toBe(false);
  });

  it("does not admit project or conversation memory without project context", () => {
    expect(
      isMemoryInProjectScope(
        { project_id: projectId, conversation_id: null, scope: "project" },
        null,
        null,
      ),
    ).toBe(false);

    expect(
      isMemoryInProjectScope(
        {
          project_id: projectId,
          conversation_id: conversationId,
          scope: "conversation",
        },
        null,
        null,
      ),
    ).toBe(false);
  });
});
