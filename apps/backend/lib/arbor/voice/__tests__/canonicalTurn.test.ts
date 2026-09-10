import { describe, expect, it } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  validateCanonicalAssistantRow,
} from "../canonicalTurn";

describe("validateCanonicalAssistantRow", () => {
  it("returns the persisted assistant text without mutation", () => {
    expect(
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "project-1",
          conversation_id: "conversation-1",
          role: "assistant",
          content: "  canonical Arbor answer  ",
        },
        userId: "user-1",
        projectId: "project-1",
      }),
    ).toBe("  canonical Arbor answer  ");
  });

  it("rejects missing assistant turns", () => {
    expect(() =>
      validateCanonicalAssistantRow({
        row: null,
        userId: "user-1",
        projectId: "project-1",
      }),
    ).toThrow(RouteAccessError);
  });

  it("rejects cross-project or non-assistant rows", () => {
    expect(() =>
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "other-project",
          conversation_id: "conversation-1",
          role: "assistant",
          content: "nope",
        },
        userId: "user-1",
        projectId: "project-1",
      }),
    ).toThrow(RouteAccessError);

    expect(() =>
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "project-1",
          conversation_id: "conversation-1",
          role: "user",
          content: "also nope",
        },
        userId: "user-1",
        projectId: "project-1",
      }),
    ).toThrow(RouteAccessError);
  });

  it("rejects empty canonical assistant text", () => {
    expect(() =>
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "project-1",
          conversation_id: "conversation-1",
          role: "assistant",
          content: "   ",
        },
        userId: "user-1",
        projectId: "project-1",
      }),
    ).toThrow(RouteAccessError);
  });

  it("rejects deleted canonical assistant turns", () => {
    expect(() =>
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "project-1",
          conversation_id: "conversation-1",
          role: "assistant",
          content: "deleted answer",
          deleted_at: "2026-09-10T20:00:00.000Z",
        },
        userId: "user-1",
        projectId: "project-1",
        now: "2026-09-10T21:00:00.000Z",
      }),
    ).toThrow(RouteAccessError);
  });

  it("rejects expired canonical assistant turns", () => {
    expect(() =>
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "project-1",
          conversation_id: "conversation-1",
          role: "assistant",
          content: "expired answer",
          expires_at: "2026-09-10T20:59:59.000Z",
        },
        userId: "user-1",
        projectId: "project-1",
        now: "2026-09-10T21:00:00.000Z",
      }),
    ).toThrow(RouteAccessError);
  });

  it("allows an unexpired canonical assistant turn", () => {
    expect(
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "project-1",
          conversation_id: "conversation-1",
          role: "assistant",
          content: "still valid",
          expires_at: "2026-09-10T21:00:01.000Z",
        },
        userId: "user-1",
        projectId: "project-1",
        now: "2026-09-10T21:00:00.000Z",
      }),
    ).toBe("still valid");
  });
});
