import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chapterNumberFromRequest, loadEditorialContext } from "./editorialContext";

function client(recordCount: number) {
  const manuscript = { id: "m1", user_id: "u", project_id: "p", title: "Ever After", source_sha256: "hash", status: "canonical" };
  const records = Array.from({ length: recordCount }, (_, i) => ({
    id: `r${i}`, user_id: "u", project_id: "p", manuscript_id: "m1", chapter_id: null,
    record_type: "canon", subject: "s", content: { text: `record ${i}` }, confidence: 1,
    epistemic_status: "confirmed", source_locator: null, source_sha256: "hash", supersedes_id: null,
    created_at: new Date(1700000000000 + i).toISOString(),
  }));
  return { from(table: string) {
    const rows = table === "annabelle_manuscripts" ? [manuscript] : table === "annabelle_editorial_records" ? records : [];
    const q: any = { select(){return q;}, eq(){return q;}, order(){return q;},
      async limit(n: number){ return { data: rows.slice(0,n), error: null }; } };
    return q;
  }} as unknown as SupabaseClient;
}

describe("Annabelle editorial context bounds", () => {
  it("selects only an unambiguous explicit chapter", () => {
    expect(chapterNumberFromRequest("Please edit chapter 2")).toBe(2);
    expect(chapterNumberFromRequest("Compare chapter 2 and chapter 3")).toBeNull();
    expect(chapterNumberFromRequest("Continue editing")).toBeNull();
  });

  it("fails closed instead of partially loading an over-limit editorial record set", async () => {
    const result = await loadEditorialContext({ supabase: client(1001), userId: "u", projectId: "p" });
    expect(result.status).toBe("incomplete");
    expect(result.records).toEqual([]);
    expect(result.warnings[0]).toContain("exceeds the expanded safe bound");
  });

  it("loads the full bounded window at the limit", async () => {
    const result = await loadEditorialContext({ supabase: client(1000), userId: "u", projectId: "p" });
    expect(result.status).toBe("ready");
    expect(result.records).toHaveLength(1000);
  });
});
