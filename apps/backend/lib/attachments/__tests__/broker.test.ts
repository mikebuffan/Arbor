import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const storageMocks = vi.hoisted(() => ({
  supabaseAdmin: vi.fn(),
  storageFrom: vi.fn(),
  createSignedUrl: vi.fn(),
  exists: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: storageMocks.supabaseAdmin,
}));

import {
  ATTACHMENT_SIGNED_URL_TTL_SECONDS,
  createAttachmentAccess,
  deleteAttachment,
} from "@/lib/attachments/broker";

const attachment = {
  id: "attachment-a",
  user_id: "user-a",
  project_id: "project-a",
  conversation_id: "conversation-a",
  storage_bucket: "chat-attachments",
  storage_path: "user-a/project-a/conversation-a/attachment-a/file.txt",
  status: "uploaded",
};

function queryWithResult(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function userClient(options?: {
  projectOwned?: boolean;
  conversationOwned?: boolean;
  metadataResponses?: Array<typeof attachment | null>;
  updateResponses?: Array<{ count: number | null; error: unknown }>;
}) {
  const projectQuery = queryWithResult(
    options?.projectOwned === false ? null : { id: "project-a" },
  );
  const conversationQuery = queryWithResult(
    options?.conversationOwned === false ? null : { id: "conversation-a" },
  );
  const metadataResponses = options?.metadataResponses ?? [attachment];
  const attachmentQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
  };
  attachmentQuery.select.mockReturnValue(attachmentQuery);
  attachmentQuery.eq.mockReturnValue(attachmentQuery);
  attachmentQuery.is.mockReturnValue(attachmentQuery);
  for (const data of metadataResponses) {
    attachmentQuery.maybeSingle.mockResolvedValueOnce({ data, error: null });
  }

  const updateResponses = options?.updateResponses ?? [
    { count: 1, error: null },
  ];
  const updateQuery = {
    eq: vi.fn(),
    is: vi.fn(),
  };
  updateQuery.eq.mockReturnValue(updateQuery);
  for (const result of updateResponses) {
    updateQuery.is.mockResolvedValueOnce(result);
  }

  const attachmentRoot = {
    select: vi.fn().mockReturnValue(attachmentQuery),
    update: vi.fn().mockReturnValue(updateQuery),
  };
  const client = {
    from: vi.fn((table: string) => {
      if (table === "projects") return projectQuery;
      if (table === "conversations") return conversationQuery;
      if (table === "chat_attachments") return attachmentRoot;
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;

  return { client, attachmentRoot, updateQuery };
}

function scope(supabase: SupabaseClient) {
  return {
    supabase,
    userId: "user-a",
    projectId: "project-a",
    conversationId: "conversation-a",
    attachmentId: "attachment-a",
  };
}

describe("attachment broker", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    storageMocks.storageFrom.mockReturnValue({
      createSignedUrl: storageMocks.createSignedUrl,
      exists: storageMocks.exists,
      remove: storageMocks.remove,
    });
    storageMocks.supabaseAdmin.mockReturnValue({
      storage: { from: storageMocks.storageFrom },
    });
  });

  afterEach(() => {
    warn.mockRestore();
    vi.useRealTimers();
  });

  it("allows same-user access in the correct project and returns only transient access data", async () => {
    const { client } = userClient();
    storageMocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.test/transient-secret" },
      error: null,
    });

    await expect(createAttachmentAccess(scope(client))).resolves.toEqual({
      signedUrl: "https://storage.test/transient-secret",
      expiresAt: "2026-08-10T12:01:00.000Z",
    });
    expect(storageMocks.createSignedUrl).toHaveBeenCalledWith(
      attachment.storage_path,
      ATTACHMENT_SIGNED_URL_TTL_SECONDS,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("denies same-user access in the wrong project before privileged Storage use", async () => {
    const { client } = userClient({ conversationOwned: false });

    await expect(
      createAttachmentAccess({
        ...scope(client),
        projectId: "project-b",
      }),
    ).rejects.toMatchObject({ status: 404, code: "attachment_not_found" });
    expect(storageMocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("denies same-user deletion in the wrong project before privileged Storage use", async () => {
    const { client } = userClient({ conversationOwned: false });

    await expect(
      deleteAttachment({
        ...scope(client),
        projectId: "project-b",
      }),
    ).rejects.toMatchObject({ status: 404, code: "attachment_not_found" });
    expect(storageMocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("denies a foreign user before privileged Storage use", async () => {
    const { client } = userClient({
      projectOwned: false,
      conversationOwned: false,
      metadataResponses: [null],
    });

    await expect(
      createAttachmentAccess({ ...scope(client), userId: "user-b" }),
    ).rejects.toMatchObject({ status: 404, code: "attachment_not_found" });
    expect(storageMocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("denies foreign-user deletion before privileged Storage use", async () => {
    const { client } = userClient({
      projectOwned: false,
      conversationOwned: false,
      metadataResponses: [null],
    });

    await expect(
      deleteAttachment({ ...scope(client), userId: "user-b" }),
    ).rejects.toMatchObject({ status: 404, code: "attachment_not_found" });
    expect(storageMocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("denies read and delete when metadata and Storage scope disagree", async () => {
    const mismatched = {
      ...attachment,
      storage_path: "user-a/project-b/conversation-a/attachment-a/file.txt",
    };
    const readClient = userClient({ metadataResponses: [mismatched] }).client;
    const deleteClient = userClient({ metadataResponses: [mismatched] }).client;

    await expect(createAttachmentAccess(scope(readClient))).rejects.toMatchObject({
      status: 404,
      code: "attachment_not_found",
    });
    await expect(deleteAttachment(scope(deleteClient))).rejects.toMatchObject({
      status: 404,
      code: "attachment_not_found",
    });
    expect(storageMocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("fails closed without logging a signed URL when signing fails", async () => {
    const { client } = userClient();
    storageMocks.createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "private provider detail" },
    });

    await expect(createAttachmentAccess(scope(client))).rejects.toMatchObject({
      status: 500,
      code: "server_error",
    });
    expect(warn).toHaveBeenCalledWith("attachment_broker_failure", {
      operation: "access",
      stage: "signed_url_create",
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("private provider detail");
  });

  it("deletes Storage first, verifies absence, then soft-deletes scoped metadata", async () => {
    const { client, attachmentRoot } = userClient();
    storageMocks.exists
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    storageMocks.remove.mockResolvedValue({ data: [], error: null });

    await expect(
      deleteAttachment({ ...scope(client), reason: "user cleanup" }),
    ).resolves.toBeUndefined();
    expect(storageMocks.remove).toHaveBeenCalledWith([attachment.storage_path]);
    expect(attachmentRoot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "deleted",
        delete_reason: "user cleanup",
        deleted_at: "2026-08-10T12:00:00.000Z",
      }),
      { count: "exact" },
    );
  });

  it("does not mutate metadata when Storage deletion fails", async () => {
    const { client, attachmentRoot } = userClient();
    storageMocks.exists.mockResolvedValueOnce({ data: true, error: null });
    storageMocks.remove.mockResolvedValue({
      data: null,
      error: { message: "raw storage failure" },
    });

    await expect(deleteAttachment(scope(client))).rejects.toMatchObject({
      status: 500,
      code: "server_error",
    });
    expect(attachmentRoot.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("attachment_broker_failure", {
      operation: "delete",
      stage: "storage_remove",
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("raw storage failure");
  });

  it("reports a partial failure when Storage is absent but metadata soft-delete fails", async () => {
    const { client } = userClient({
      updateResponses: [
        { count: null, error: { message: "raw metadata failure" } },
      ],
    });
    storageMocks.exists
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    storageMocks.remove.mockResolvedValue({ data: [], error: null });

    await expect(deleteAttachment(scope(client))).rejects.toMatchObject({
      status: 500,
      code: "server_error",
    });
    expect(warn).toHaveBeenCalledWith("attachment_broker_failure", {
      operation: "delete",
      stage: "metadata_soft_delete",
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("raw metadata failure");
  });

  it("converges on retry after Storage deletion succeeded but metadata failed", async () => {
    const { client } = userClient({
      metadataResponses: [attachment, attachment],
      updateResponses: [
        { count: null, error: { code: "metadata_failure" } },
        { count: 1, error: null },
      ],
    });
    storageMocks.exists
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    storageMocks.remove.mockResolvedValue({ data: [], error: null });

    await expect(deleteAttachment(scope(client))).rejects.toMatchObject({
      status: 500,
    });
    await expect(deleteAttachment(scope(client))).resolves.toBeUndefined();
    expect(storageMocks.remove).toHaveBeenCalledTimes(1);
  });

  it("soft-deletes metadata when the scoped Storage object is already absent", async () => {
    const { client, attachmentRoot } = userClient();
    storageMocks.exists
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: false, error: null });

    await expect(deleteAttachment(scope(client))).resolves.toBeUndefined();
    expect(storageMocks.remove).not.toHaveBeenCalled();
    expect(attachmentRoot.update).toHaveBeenCalledOnce();
  });

  it("does not soft-delete metadata when absence cannot be verified", async () => {
    const { client, attachmentRoot } = userClient();
    storageMocks.exists
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    storageMocks.remove.mockResolvedValue({ data: [], error: null });

    await expect(deleteAttachment(scope(client))).rejects.toMatchObject({
      status: 500,
      code: "server_error",
    });
    expect(attachmentRoot.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("attachment_broker_failure", {
      operation: "delete",
      stage: "storage_verify",
    });
  });

  it("returns a non-enumerating 404 for a repeated request after durable deletion", async () => {
    const { client } = userClient({
      metadataResponses: [attachment, null],
    });
    storageMocks.exists
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    storageMocks.remove.mockResolvedValue({ data: [], error: null });

    await expect(deleteAttachment(scope(client))).resolves.toBeUndefined();
    await expect(deleteAttachment(scope(client))).rejects.toMatchObject({
      status: 404,
      code: "attachment_not_found",
    });
    expect(storageMocks.storageFrom).toHaveBeenCalledTimes(1);
  });
});
