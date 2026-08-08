import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertAttachmentOwnedByScope,
  assertAttachmentWriteScope,
  assertProjectAttachmentPath,
} from "@/lib/attachments/scope";

function scopedClient(params: {
  projectOwned: boolean;
  conversationOwned: boolean;
  attachmentOwned?: boolean;
}) {
  const projectQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: params.projectOwned ? { id: "project-a" } : null,
      error: null,
    }),
  };
  projectQuery.select.mockReturnValue(projectQuery);
  projectQuery.eq.mockReturnValue(projectQuery);

  const conversationQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: params.conversationOwned ? { id: "conversation-a" } : null,
      error: null,
    }),
  };
  conversationQuery.select.mockReturnValue(conversationQuery);
  conversationQuery.eq.mockReturnValue(conversationQuery);

  const attachmentQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: params.attachmentOwned
        ? {
            id: "attachment-a",
            storage_bucket: "chat-attachments",
            storage_path:
              "user-a/project-a/conversation-a/attachment-a/file.txt",
          }
        : null,
      error: null,
    }),
  };
  attachmentQuery.select.mockReturnValue(attachmentQuery);
  attachmentQuery.eq.mockReturnValue(attachmentQuery);
  attachmentQuery.is.mockReturnValue(attachmentQuery);

  return {
    from: vi.fn((table: string) => {
      if (table === "projects") return projectQuery;
      if (table === "conversations") return conversationQuery;
      return attachmentQuery;
    }),
  } as unknown as SupabaseClient;
}

describe("attachment application scope", () => {
  it("rejects metadata creation for a foreign project", async () => {
    const supabase = scopedClient({
      projectOwned: false,
      conversationOwned: true,
    });

    await expect(
      assertAttachmentWriteScope({
        supabase,
        userId: "user-a",
        projectId: "project-b",
        conversationId: "conversation-b",
      }),
    ).rejects.toMatchObject({ status: 404, code: "project_not_found" });
  });

  it("rejects metadata creation for a foreign conversation", async () => {
    const supabase = scopedClient({
      projectOwned: true,
      conversationOwned: false,
    });

    await expect(
      assertAttachmentWriteScope({
        supabase,
        userId: "user-a",
        projectId: "project-a",
        conversationId: "conversation-b",
      }),
    ).rejects.toMatchObject({ status: 404, code: "conversation_not_found" });
  });

  it("requires attachment metadata to match the full owned scope", async () => {
    const supabase = scopedClient({
      projectOwned: true,
      conversationOwned: true,
      attachmentOwned: false,
    });

    await expect(
      assertAttachmentOwnedByScope({
        supabase,
        userId: "user-a",
        projectId: "project-a",
        conversationId: "conversation-a",
        attachmentId: "attachment-b",
      }),
    ).rejects.toMatchObject({ status: 404, code: "attachment_not_found" });
  });

  it("rejects a storage path outside the project and conversation scope", () => {
    expect(() =>
      assertProjectAttachmentPath({
        storageBucket: "chat-attachments",
        storagePath:
          "user-a/project-b/conversation-b/attachment-a/file.txt",
        userId: "user-a",
        projectId: "project-a",
        conversationId: "conversation-a",
        attachmentId: "attachment-a",
      }),
    ).toThrowError(expect.objectContaining({ code: "attachment_not_found" }));
  });
});
