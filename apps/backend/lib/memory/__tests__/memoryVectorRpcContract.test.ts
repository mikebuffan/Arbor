import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "../..");
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20260915035300_restore_conversation_aware_match_memories_v3.sql",
);

describe("conversation-aware memory vector RPC source contract", () => {
  it("defines the five-argument runtime contract after the legacy drop", () => {
    const sql = fs.readFileSync(MIGRATION, "utf8")
      .toLowerCase()
      .replace(/\s+/g, " ");

    expect(sql).toContain(
      "create or replace function public.match_memories_v3( p_user_id uuid, p_project_id uuid, p_conversation_id uuid, p_query_embedding vector(1536), p_match_count integer default 24 )",
    );
    expect(sql).toContain("mi.user_id = p_user_id");
    expect(sql).toContain("mi.scope = 'global'");
    expect(sql).toContain("mi.scope = 'project'");
    expect(sql).toContain("mi.project_id = p_project_id");
    expect(sql).toContain("mi.scope = 'conversation'");
    expect(sql).toContain("p_conversation_id is not null");
    expect(sql).toContain("mi.conversation_id = p_conversation_id");
    expect(sql).toContain("mi.excluded_from_memory = false");
    expect(sql).toContain("mi.deleted_at is null");
    expect(sql).toContain("security invoker");
    expect(sql).toContain(
      "grant execute on function public.match_memories_v3( uuid, uuid, uuid, vector, integer ) to authenticated;",
    );
  });

  it("keeps the runtime caller aligned with the SQL parameter names", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "apps/backend/lib/memory/retrieval.ts"),
      "utf8",
    );
    for (const key of [
      "p_user_id",
      "p_project_id",
      "p_conversation_id",
      "p_query_embedding",
      "p_match_count",
    ]) {
      expect(source).toContain(key);
    }
  });
});
