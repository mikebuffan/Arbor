import fs from "node:fs";
import { createHash } from "node:crypto";
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
    expect(broker).toContain('import "server-only"');
    expect(broker).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(broker.indexOf("await assertAttachmentOwnedByScope")).toBeLessThan(
      broker.indexOf("await inspectPrivilegedStorageObject"),
    );
    expect(broker).toContain('.from("chat_attachments")');
    expect(broker).not.toMatch(
      /scope\.supabase[\s\S]{0,240}?\.from\("chat_attachments"\)[\s\S]{0,240}?\.update\(/,
    );
    expect(routes.join("\n")).not.toContain("@/lib/supabase/admin");
    expect(routes.join("\n")).not.toMatch(/SUPABASE_SERVICE_ROLE/);
  });

  it("preserves applied migrations and limits the forward correction to one policy", () => {
    const migrationsRoot = path.resolve(process.cwd(), "../../supabase/migrations");
    const immutableMigrations = new Map([
      [
        "20260823175536_firefly_public_baseline.sql",
        "126323db0d707e40a23d436aa6eece60eb2034125bcabafb66d5a88a5b9f0c69",
      ],
      [
        "20260823175539_firefly_storage_attachment_policies_baseline.sql",
        "0730bdb431bbdf208526d32df6daeabf21f62e872130c23b27d4dde0706562ba",
      ],
      [
        "20260823175543_milestone_1b_attachment_scope.sql",
        "9154e5281125ce5f5c13c3c93897bb2acf2395e480b6fc0d64cc05b4e886e0f5",
      ],
    ]);

    for (const [filename, expectedHash] of immutableMigrations) {
      const contents = fs.readFileSync(path.join(migrationsRoot, filename));
      expect(createHash("sha256").update(contents).digest("hex")).toBe(
        expectedHash,
      );
    }

    const correctionFiles = fs
      .readdirSync(migrationsRoot)
      .filter((filename) =>
        filename.endsWith("_fix_attachment_scoped_metadata_policy.sql"),
      );
    expect(correctionFiles).toHaveLength(1);

    const correction = fs.readFileSync(
      path.join(migrationsRoot, correctionFiles[0]),
      "utf8",
    );
    const normalized = correction.toLowerCase().replace(/\s+/g, " ");

    expect(correction.match(/drop policy/gi)).toHaveLength(1);
    expect(correction.match(/create policy/gi)).toHaveLength(1);
    expect(normalized).toContain(
      'drop policy if exists "chat attachments select scoped metadata" on public.chat_attachments;',
    );
    expect(normalized).toContain(
      'create policy "chat attachments select scoped metadata" on public.chat_attachments for select to authenticated',
    );
    expect(normalized).toContain(
      "c.id = chat_attachments.conversation_id",
    );
    expect(normalized).toContain(
      "c.project_id = chat_attachments.project_id",
    );
    expect(normalized).toContain("m.id = chat_attachments.message_id");
    expect(normalized).toContain(
      "m.project_id = chat_attachments.project_id",
    );
    expect(normalized).toContain(
      "m.conversation_id = chat_attachments.conversation_id",
    );
    expect(normalized).not.toContain("c.project_id = c.project_id");
    expect(normalized).not.toContain("m.project_id = m.project_id");
    expect(normalized).not.toContain("m.conversation_id = m.conversation_id");
    expect(correction).not.toMatch(/\b(?:grant|revoke|alter\s+table)\b/gi);
    expect(correction).not.toMatch(/\bstorage\.(?:objects|buckets)\b/gi);
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

  it("restores the exact fresh Firefly ACL and policy capture", () => {
    const rollback = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../docs/migrations/PROPOSED_milestone_1b_attachment_scope.rollback.sql",
      ),
      "utf8",
    );
    const normalized = rollback.toLowerCase().replace(/\s+/g, " ");
    const createdPolicies = Array.from(
      rollback.matchAll(/create policy\s+"([^"]+)"/gi),
      (match) => match[1],
    );
    const storageGrantChanges = rollback
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => /^(?:grant|revoke)\b/.test(line))
      .filter((line) => /\bstorage\.(?:objects|buckets)\b/.test(line));
    const capturedPrivileges =
      "delete, insert, maintain, references, select, trigger, truncate, update";

    expect(normalized).toContain(
      "alter table public.chat_attachments owner to postgres;",
    );
    expect(normalized).toContain(
      "alter table public.chat_attachments enable row level security;",
    );
    expect(normalized).toContain(
      "alter table public.chat_attachments no force row level security;",
    );
    expect(normalized).toContain(
      "revoke all privileges on table public.chat_attachments from public;",
    );
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(normalized).toContain(
        `grant ${capturedPrivileges} on table public.chat_attachments to ${role};`,
      );
    }
    expect(createdPolicies).toEqual([
      "chat attachments delete own metadata",
      "chat attachments insert own metadata",
      "chat attachments select own metadata",
      "chat attachments update own metadata",
      "chat attachments delete approved own objects",
      "chat attachments delete own files",
      "chat attachments insert approved own objects",
      "chat attachments insert own files",
      "chat attachments select approved own objects",
      "chat attachments select own files",
      "chat attachments update approved own objects",
      "chat attachments update own files",
    ]);
    expect(rollback.match(/\bas permissive\b/gi)).toHaveLength(12);
    expect(normalized).toContain("and a.status = 'pending'");
    expect(normalized).toContain("and a.status in ('pending', 'uploaded')");
    expect(storageGrantChanges).toEqual([]);
    expect(rollback).not.toMatch(/^\s*grant\s+[^;]*\([^;]*\)\s+on\s+table/gim);
    expect(rollback).not.toMatch(/(?:update|alter table)\s+storage\.buckets/gi);
  });

  it("pre-seeds E2E fixtures before hardening and reserves cleanup for exact owner SQL", () => {
    const plan = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../docs/migrations/milestone-1b-attachment-e2e-fixture-plan.md",
      ),
      "utf8",
    );
    const normalized = plan.toLowerCase().replace(/\s+/g, " ");

    expect(plan.indexOf("## Pre-seed → migrate → verify")).toBeLessThan(
      plan.indexOf("## Exact administrative metadata cleanup"),
    );
    expect(normalized).toContain(
      "create exactly five manifest-tracked metadata rows before migration",
    );
    expect(normalized).toContain(
      "expected pre-migration seeded state is exactly five metadata rows and four objects",
    );
    expect(normalized).toContain(
      "after migration, `service_role` has only `select, update`",
    );
    expect(normalized).toContain(
      "neither fixture creation nor final metadata hard deletion may rely on it",
    );
    expect(normalized).toContain(
      "delete from public.chat_attachments a using pg_temp.arbor_e2e_attachment_cleanup_targets t",
    );
    expect(normalized).toContain("get diagnostics deleted_count = row_count");
    expect(normalized).toContain(
      "an e2e failure does not automatically authorize rollback",
    );
    expect(normalized).toContain(
      "the repository-root `supabase/migrations/` directory is now the approved canonical migration ledger",
    );
    expect(plan).not.toMatch(/create\s+(?:or\s+replace\s+)?function/gi);
    expect(plan).not.toMatch(/grant\s+delete\s+on\s+public\.chat_attachments/gi);
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
