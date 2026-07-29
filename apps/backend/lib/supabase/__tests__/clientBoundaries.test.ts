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
