import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "app/api/admin/consolidate-episode/route.ts",
  "app/api/admin/memory/decay/route.ts",
  "app/api/admin/summarize-episode/route.ts",
  "app/api/admin/system/heartbeat/route.ts",
  "app/api/chat/route.ts",
  "app/api/debug/chat/route.ts",
  "app/api/debug/openai/route.ts",
  "lib/auth/requireUser.ts",
  "lib/auth/routeAuthorization.ts",
  "lib/memory/extractor.ts",
  "lib/memory/retrieval.ts",
  "lib/memory/store.ts",
  "lib/prompt/buildPromptContext.ts",
  "lib/safety/postcheck.ts",
];

describe("Milestone 1A sensitive logging", () => {
  it("does not log credentials, authorization headers, prompt blocks, or raw safety text", () => {
    const source = files
      .map((file) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/console\.(?:log|error|warn)[^\n]*(?:x-admin|authorization|token head|expected head)/i);
    expect(source).not.toMatch(/console\.(?:log|error|warn)[^\n]*,\s*(?:e|err|error)\b/i);
    expect(source).not.toContain("BAD UUID VALUE DETECTED");
    expect(source).not.toContain("[ANCHOR BLOCK]");
    expect(source).not.toContain("transcript preview");
    expect(source).not.toMatch(/logMemoryEvent\([^)]*transcript/i);
    expect(source).not.toMatch(/parse failed[^\n]*raw/i);
    expect(source).not.toMatch(/safety_(?:alert|warning)"[^\n]*assistantText/);
  });
});
