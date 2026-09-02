import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "app/api/admin/consolidate-episode/route.ts",
  "app/api/admin/memory/decay/route.ts",
  "app/api/admin/summarize-episode/route.ts",
  "app/api/admin/system/heartbeat/route.ts",
  "app/api/chat/attachments/access/route.ts",
  "app/api/chat/attachments/delete/route.ts",
  "app/api/chat/route.ts",
  "app/api/debug/chat/route.ts",
  "app/api/debug/openai/route.ts",
  "lib/auth/requireUser.ts",
  "lib/auth/routeAuthorization.ts",
  "lib/attachments/broker.ts",
  "lib/attachments/http.ts",
  "lib/arbor/telemetry/buildTelemetry.ts",
  "lib/memory/extractor.ts",
  "lib/memory/logger.ts",
  "lib/memory/retrieval.ts",
  "lib/memory/store.ts",
  "lib/prompt/buildPromptContext.ts",
  "lib/safety/decisionOutcome.ts",
  "lib/safety/postcheck.ts",
  "lib/supabase/server.ts",
  "lib/system/loop.ts",
  "lib/tasks/decay.ts",
  "lib/tasks/reflection.ts",
  "lib/tasks/sync.ts",
];

describe("Milestone 1A sensitive logging", () => {
  it("does not log credentials, authorization headers, prompt blocks, or raw safety text", () => {
    const sources = files.map((file) => ({
      file,
      source: fs.readFileSync(path.resolve(process.cwd(), file), "utf8"),
    }));
    const source = sources.map((entry) => entry.source).join("\n");

    expect(source).not.toMatch(/console\.(?:log|error|warn)[^\n]*(?:x-admin|authorization|token head|expected head)/i);
    expect(source).not.toMatch(/console\.(?:log|error|warn)[^\n]*,\s*(?:e|err|error)\b/i);
    expect(source).not.toContain("BAD UUID VALUE DETECTED");
    expect(source).not.toContain("[ANCHOR BLOCK]");
    expect(source).not.toContain("transcript preview");
    expect(source).not.toMatch(/logMemoryEvent\([^)]*transcript/i);
    expect(source).not.toMatch(/parse failed[^\n]*raw/i);
    expect(source).not.toMatch(/safety_(?:alert|warning)"[^\n]*assistantText/);
    expect(source).not.toMatch(
      /console\.(?:log|debug|error|warn)[^\n]*(?:signedUrl|storagePath|storage_path|delete_reason|reason)/i,
    );
    expect(source).not.toMatch(
      /(?:captureException|setAttribute|setContext|setExtra)[^\n]*(?:signedUrl|storagePath|storage_path)/i,
    );
    expect(source).not.toMatch(
      /console\.(?:log|error|warn)[^\n]*,\s*(?:releaseError|error|err|e)\b/i,
    );

    for (const entry of sources) {
      expect(entry.source, entry.file).not.toMatch(
        /console\.(?:log|debug|error|warn)\([\s\S]{0,240}?,\s*(?:releaseError|error|err|e|payload)(?:\.[a-zA-Z_$][\w$]*)?\s*,?\s*\)/i,
      );
    }
  });
});
