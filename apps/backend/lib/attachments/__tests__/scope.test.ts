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
  storagePath?: string;
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
            user_id: "user-a",
            project_id: "project-a",
            conversation_id: "conversation-a",
            storage_bucket: "chat-attachments",
            storage_path:
              params.storagePath ??
              "user-a/project-a/conversation-a/attachment-a/file.txt",
            status: "uploaded",
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

  it("allows an attachment in the authenticated user and supplied project scope", async () => {
    const supabase = scopedClient({
      projectOwned: true,
      conversationOwned: true,
      attachmentOwned: true,
    });

    await expect(
      assertAttachmentOwnedByScope({
        supabase,
        userId: "user-a",
        projectId: "project-a",
        conversationId: "conversation-a",
        attachmentId: "attachment-a",
      }),
    ).resolves.toMatchObject({ id: "attachment-a", status: "uploaded" });
  });

  it("normalizes same-user wrong-project access to attachment_not_found", async () => {
    const supabase = scopedClient({
      projectOwned: true,
      conversationOwned: false,
      attachmentOwned: true,
    });

    await expect(
      assertAttachmentOwnedByScope({
        supabase,
        userId: "user-a",
        projectId: "project-b",
        conversationId: "conversation-a",
        attachmentId: "attachment-a",
      }),
    ).rejects.toMatchObject({ status: 404, code: "attachment_not_found" });
  });

  it("normalizes foreign-user access to attachment_not_found", async () => {
    const supabase = scopedClient({
      projectOwned: false,
      conversationOwned: false,
      attachmentOwned: false,
    });

    await expect(
      assertAttachmentOwnedByScope({
        supabase,
        userId: "user-b",
        projectId: "project-a",
        conversationId: "conversation-a",
        attachmentId: "attachment-a",
      }),
    ).rejects.toMatchObject({ status: 404, code: "attachment_not_found" });
  });

  it("rejects a conversation owned by the user but outside the supplied project", async () => {
    const supabase = scopedClient({
      projectOwned: true,
      conversationOwned: false,
    });

    await expect(
      assertAttachmentWriteScope({
        supabase,
        userId: "user-a",
        projectId: "project-b",
        conversationId: "conversation-a",
      }),
    ).rejects.toMatchObject({ status: 404, code: "conversation_not_found" });
  });

  it("rejects metadata whose Storage scope disagrees with its row scope", async () => {
    const supabase = scopedClient({
      projectOwned: true,
      conversationOwned: true,
      attachmentOwned: true,
      storagePath:
        "user-a/project-b/conversation-a/attachment-a/private.txt",
    });

    await expect(
      assertAttachmentOwnedByScope({
        supabase,
        userId: "user-a",
        projectId: "project-a",
        conversationId: "conversation-a",
        attachmentId: "attachment-a",
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

  it("rejects nested or traversal-like attachment filename suffixes", () => {
    for (const storagePath of [
      "user-a/project-a/conversation-a/attachment-a/nested/file.txt",
      "user-a/project-a/conversation-a/attachment-a/..",
      "user-a/project-a/conversation-a/attachment-a/nested\\file.txt",
    ]) {
      expect(() =>
        assertProjectAttachmentPath({
          storageBucket: "chat-attachments",
          storagePath,
          userId: "user-a",
          projectId: "project-a",
          conversationId: "conversation-a",
          attachmentId: "attachment-a",
        }),
      ).toThrowError(expect.objectContaining({ code: "attachment_not_found" }));
    }
  });
});
