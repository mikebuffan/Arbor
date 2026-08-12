import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { createRequestScopedUserClient } from "@/lib/supabase/user";
import { supabaseFromAuthHeader as rootCompatibilityWrapper } from "@/lib/supabaseFromAuthHeader";
import { supabaseFromAuthHeader as bearerCompatibilityWrapper } from "@/lib/supabase/bearer";

describe("Supabase client boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-secret");
    mocks.createClient.mockImplementation((_url, _key, options) => ({ options }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates one isolated user client per request without bearer reuse", () => {
    const first = createRequestScopedUserClient(
      new Request("https://arbor.test/first", {
        headers: { authorization: "Bearer first-token" },
      }),
    );
    const second = createRequestScopedUserClient(
      new Request("https://arbor.test/second", {
        headers: { authorization: "Bearer second-token" },
      }),
    );

    expect(first).not.toBe(second);
    expect(mocks.createClient).toHaveBeenNthCalledWith(
      1,
      "https://supabase.example",
      "public-anon-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer first-token" } },
      }),
    );
    expect(mocks.createClient).toHaveBeenNthCalledWith(
      2,
      "https://supabase.example",
      "public-anon-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer second-token" } },
      }),
    );
  });

  it("keeps both legacy bearer helpers as delegating compatibility wrappers", () => {
    rootCompatibilityWrapper(
      new Request("https://arbor.test/root", {
        headers: { authorization: "Bearer root-token" },
      }),
    );
    bearerCompatibilityWrapper(
      new Request("https://arbor.test/bearer", {
        headers: { authorization: "Bearer bearer-token" },
      }),
    );

    expect(mocks.createClient).toHaveBeenCalledTimes(2);
    expect(mocks.createClient.mock.calls.map((call) => call[2])).toEqual([
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer root-token" } },
      }),
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer bearer-token" } },
      }),
    ]);
  });

  it("never passes the service-role credential to an ordinary user client", () => {
    createRequestScopedUserClient(
      new Request("https://arbor.test/user", {
        headers: { authorization: "Bearer user-token" },
      }),
    );

    expect(mocks.createClient).not.toHaveBeenCalledWith(
      expect.anything(),
      "server-only-secret",
      expect.anything(),
    );
  });

  it("does not instantiate service-role clients inside ordinary API routes", () => {
    const apiRoot = path.resolve(process.cwd(), "app/api");
    const allowedSegments = [
      `${path.sep}admin${path.sep}`,
      `${path.sep}debug${path.sep}`,
      `${path.sep}stripe${path.sep}webhook${path.sep}`,
      `${path.sep}stripe${path.sep}portal${path.sep}`,
    ];
    const files: string[] = [];

    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(fullPath);
        else if (entry.name === "route.ts") files.push(fullPath);
      }
    };
    visit(apiRoot);

    const violations = files
      .filter((file) => !allowedSegments.some((segment) => file.includes(segment)))
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        return (
          source.includes("SUPABASE_SERVICE_ROLE") ||
          /createClient\s*\(/.test(source) ||
          source.includes("@/lib/supabase/admin")
        );
      })
      .map((file) => path.relative(apiRoot, file));

    expect(violations).toEqual([]);
  });

  it("injects user clients into active prompt and memory modules", () => {
    const files = [
      "lib/prompt/buildPromptContext.ts",
      "lib/memory/retrieval.ts",
      "lib/memory/store.ts",
      "lib/memory/anchors.ts",
      "lib/memory/promoteIdentityAnchors.ts",
    ];

    const violations = files.filter((file) => {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      return source.includes("@/lib/supabase/admin");
    });

    expect(violations).toEqual([]);
  });

  it("keeps the import job admin exception behind ownership validation", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "lib/imports/enqueueImportJob.ts"),
      "utf8",
    );

    expect(source).toContain('.eq("id", importId)');
    expect(source).toContain('.eq("user_id", userId)');
    expect(source).toContain('from("system_jobs")');
    expect(source).toContain("@/lib/supabase/admin");
  });

  it("keeps privileged attachment Storage operations behind full scoped validation", () => {
    const broker = fs.readFileSync(
      path.resolve(process.cwd(), "lib/attachments/broker.ts"),
      "utf8",
    );
    const routes = [
      "app/api/chat/attachments/access/route.ts",
      "app/api/chat/attachments/delete/route.ts",
    ].map((file) =>
      fs.readFileSync(path.resolve(process.cwd(), file), "utf8"),
    );

    expect(broker).toContain("assertAttachmentOwnedByScope");
    expect(broker).toContain("supabaseAdmin().storage");
    expect(broker.indexOf("await assertAttachmentOwnedByScope")).toBeLessThan(
      broker.indexOf("supabaseAdmin().storage"),
    );
    expect(broker).toContain("const privilegedClient = supabaseAdmin()");
    expect(broker).toContain('.from("chat_attachments")');
    expect(broker).not.toMatch(
      /scope\.supabase[\s\S]{0,240}?\.from\("chat_attachments"\)[\s\S]{0,240}?\.update\(/,
    );
    expect(broker).not.toMatch(/SUPABASE_SERVICE_ROLE/);
    expect(routes.join("\n")).not.toContain("@/lib/supabase/admin");
    expect(routes.join("\n")).not.toMatch(/SUPABASE_SERVICE_ROLE/);
  });

  it("leaves no direct authenticated attachment write policy in the proposal", () => {
    const proposal = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../docs/migrations/PROPOSED_milestone_1b_attachment_scope.sql",
      ),
      "utf8",
    );
    const createdPolicies = Array.from(
      proposal.matchAll(/create policy\s+"([^"]+)"/gi),
      (match) => match[1],
    );

    expect(createdPolicies).toEqual(["chat attachments select scoped metadata"]);
    expect(proposal).not.toMatch(
      /on\s+public\.chat_attachments[\s\S]{0,120}?for\s+(?:insert|update|delete)\b/gi,
    );
    expect(proposal).not.toMatch(
      /create policy[\s\S]{0,120}?on\s+storage\.objects/gi,
    );
  });

  it("pins the direct attachment Data API grants to the least privilege matrix", () => {
    const proposal = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../docs/migrations/PROPOSED_milestone_1b_attachment_scope.sql",
      ),
      "utf8",
    );
    const normalized = proposal.toLowerCase().replace(/\s+/g, " ");
    const tableGrants = proposal
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.startsWith("grant "));
    const storageGrantChanges = proposal
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => /^(?:grant|revoke)\b/.test(line))
      .filter((line) => /\bstorage\.(?:objects|buckets)\b/.test(line));

    expect(normalized).toContain(
      "revoke all privileges on table public.chat_attachments from anon;",
    );
    expect(normalized).toContain(
      "revoke all privileges on table public.chat_attachments from authenticated;",
    );
    expect(normalized).toContain(
      "revoke all privileges on table public.chat_attachments from service_role;",
    );
    expect(tableGrants).toEqual([
      "grant select on table public.chat_attachments to authenticated;",
      "grant select, update on table public.chat_attachments to service_role;",
    ]);
    expect(storageGrantChanges).toEqual([]);
  });

  it("keeps rollback fail-closed until the immediate pre-apply grants are captured", () => {
    const rollback = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../docs/migrations/PROPOSED_milestone_1b_attachment_scope.rollback.sql",
      ),
      "utf8",
    );

    expect(rollback).toContain("rollback_requires_fresh_firefly_capture");
    expect(rollback).toContain("raise exception");
    expect(rollback).not.toMatch(/^\s*(?:grant|revoke)\b/gim);
    expect(rollback).not.toMatch(/^\s*create\s+policy\b/gim);
  });

  it("keeps the legacy correction route as a canonical-handler adapter", () => {
    const canonical = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/memory/correct/route.ts"),
      "utf8",
    );
    const compatibility = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/memory/correction/route.ts"),
      "utf8",
    );

    expect(canonical).toContain("applyMemoryCorrection");
    expect(compatibility).toContain("applyMemoryCorrection");
    expect(compatibility).not.toContain("correctMemoryItem");
  });

  it("removes request cookie state from the server-client compatibility wrapper", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "lib/supabase/server.ts"),
      "utf8",
    );

    expect(source).not.toContain("cookies");
    expect(source).not.toContain("Authorization");
    expect(source).not.toContain("createClient");
    expect(source).toContain("supabaseAdmin");
  });
});
