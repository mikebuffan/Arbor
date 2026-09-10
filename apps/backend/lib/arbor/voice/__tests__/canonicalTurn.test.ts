import { describe, expect, it } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  validateCanonicalAssistantRow,
} from "../canonicalTurn";

describe("validateCanonicalAssistantRow", () => {
  it("returns the persisted assistant text exactly apart from outer whitespace", () => {
    expect(
      validateCanonicalAssistantRow({
        row: {
          user_id: "user-1",
          project_id: "project-1",
          role: "assistant",
          content: "  canonical Arbor answer  ",
        },
        userId: "user-1",
        projectId: "project-1",
      }),
    ).toBe("canonical Arbor answer");
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
          role: "assistant",
          content: "   ",
        },
        userId: "user-1",
        projectId: "project-1",
      }),
    ).toThrow(RouteAccessError);
  });
});
