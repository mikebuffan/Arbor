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
  "app/api/memory/reset/route.ts",
  "app/api/debug/chat/route.ts",
  "app/api/debug/openai/route.ts",
  "lib/auth/requireUser.ts",
  "lib/auth/routeAuthorization.ts",
  "lib/attachments/broker.ts",
  "lib/attachments/http.ts",
  "lib/arbor/continuity/store.ts",
  "lib/arbor/episodes/getOrCreateOpenEpisode.ts",
  "lib/arbor/telemetry/buildTelemetry.ts",
  "lib/chat/postResponseScheduler.ts",
  "lib/chat/synchronousDiagnostics.ts",
  "lib/memory/correctionResolution.ts",
  "lib/memory/durableEvents.ts",
  "lib/memory/extractor.ts",
  "lib/memory/logger.ts",
  "lib/memory/promoteIdentityAnchors.ts",
  "lib/memory/retrieval.ts",
  "lib/memory/store.ts",
  "lib/prompt/buildPromptContext.ts",
  "lib/safety/decisionOutcome.ts",
  "lib/safety/postcheck.ts",
  "lib/supabase/server.ts",
  "lib/supabase/admin.ts",
  "lib/system/loop.ts",
  "lib/tasks/decay.ts",
  "lib/tasks/reflection.ts",
  "lib/tasks/sync.ts",
  "scripts/live_acceptance/telemetryPrivacyAudit.ts",
];

describe("Milestone 1B sensitive logging", () => {
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

  it("exports only bounded metadata for closeout fallback and retry failures", () => {
    const sourceByFile = new Map(
      files.map((file) => [
        file,
        fs.readFileSync(path.resolve(process.cwd(), file), "utf8"),
      ]),
    );
    const continuity = sourceByFile.get("lib/arbor/continuity/store.ts")!;
    const episodes = sourceByFile.get(
      "lib/arbor/episodes/getOrCreateOpenEpisode.ts",
    )!;
    const memoryReset = sourceByFile.get("app/api/memory/reset/route.ts")!;
    const anchors = sourceByFile.get("lib/memory/promoteIdentityAnchors.ts")!;
    const safeQuery = sourceByFile.get("lib/supabase/admin.ts")!;

    for (const [name, source] of [
      ["continuity", continuity],
      ["episodes", episodes],
      ["memory reset", memoryReset],
      ["identity anchors", anchors],
      ["safeQuery", safeQuery],
    ] as const) {
      expect(source, name).not.toMatch(
        /console\.(?:warn|error|log|debug)\([\s\S]{0,300}?,\s*(?:error|err|e)\s*[,)]/i,
      );
      expect(source, name).not.toMatch(
        /console\.(?:warn|error|log|debug)\([\s\S]{0,300}?(?:message|stack|error)\s*:\s*(?:error|err|e)(?:\?\.|\.|\s|[,}])/i,
      );
    }

    expect(continuity).toContain('operation: "load_state"');
    expect(continuity).toContain('code: "continuity_load_failed"');
    expect(episodes).toContain('operation: "get_or_create_open_episode"');
    expect(episodes).toContain('code: "episode_open_failed"');
    expect(memoryReset).toContain('operation: "reset"');
    expect(memoryReset).toContain('code: "memory_reset_failed"');
    expect(anchors).toContain('operation: "invalidate_prompt_cache"');
    expect(anchors).toContain('code: "prompt_cache_invalidation_failed"');
    expect(anchors).not.toMatch(
      /console\.warn\("\[ANCHOR CACHE INVALIDATION FAILED\]"[\s\S]{0,300}(?:authedUserId|projectId|userText)/,
    );

    expect(safeQuery).toContain('Sentry.captureMessage("supabase_query_failed"');
    expect(safeQuery).toContain('subsystem: "supabase"');
    expect(safeQuery).toContain("operation,");
    expect(safeQuery).toContain('span.setAttribute("error_code", code)');
    expect(safeQuery).toContain('span.setAttribute("retry_attempt", attempt + 1)');
    expect(safeQuery).toContain('message: "supabase_query_failed"');
    expect(safeQuery).not.toContain("Sentry.captureException");
    expect(safeQuery).not.toMatch(/extra\s*:\s*\{[\s\S]{0,120}(?:message|stack)/i);
    expect(safeQuery).not.toContain('span.setAttribute("error_message"');
    expect(safeQuery).not.toMatch(/query_label\s*:\s*label/);
    expect(safeQuery).not.toMatch(/name\s*:\s*label/);
    expect(safeQuery).not.toMatch(
      /setStatus\([\s\S]{0,160}message\s*:\s*(?:error|err|e)(?:\?\.|\.)?message/i,
    );
  });
});
