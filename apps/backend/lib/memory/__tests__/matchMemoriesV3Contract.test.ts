import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("conversation-aware memory RPC source contract", () => {
  it("defines the five-argument match_memories_v3 contract used by retrieval.ts", () => {
    const sql = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../supabase/migrations/20261007013000_restore_conversation_aware_match_memories_v3.sql",
      ),
      "utf8",
    ).toLowerCase().replace(/\s+/g, " ");

    expect(sql).toContain(
      "create or replace function public.match_memories_v3( p_user_id uuid, p_project_id uuid, p_conversation_id uuid, p_query_embedding vector(1536), p_match_count integer default 40 )",
    );
    expect(sql).toContain("security invoker");
    expect(sql).toContain("mi.excluded_from_memory = false");
    expect(sql).toContain("mi.scope = 'global'");
    expect(sql).toContain("mi.scope = 'project'");
    expect(sql).toContain("mi.scope = 'conversation'");
    expect(sql).toContain("mi.conversation_id = p_conversation_id");
    expect(sql).toContain(
      "grant execute on function public.match_memories_v3( uuid, uuid, uuid, vector, integer ) to authenticated;",
    );
  });
});
