import { describe, expect, it, vi } from "vitest";
import { persistPatternHopEdges } from "../patternHopStore";

const edge = { fromEvidenceId: "parent", toEvidenceId: "child", originatingClue: "source",
  relationship: "cross_reference", hopDepth: 1, confidence: .8,
  epistemicStatus: "derived" as const, rationale: "Synthetic source link" };
const params = { runId: "run", idMap: new Map([["parent", "db-parent"], ["child", "db-child"]]), edges: [edge] };
const receipt = { id: "edge", run_id: "run", from_evidence_id: "db-parent",
  to_evidence_id: "db-child", relationship: "cross_reference", hop_depth: 1 };
function db(existing: unknown, inserted: unknown = receipt) {
  const q: any = {};
  q.select = q.eq = q.is = () => q;
  q.insert = vi.fn(() => q);
  q.maybeSingle = async () => ({ data: existing, error: null });
  q.single = async () => ({ data: inserted, error: null });
  return { supabase: { from: () => q } as never, insert: q.insert };
}
const mismatches = [
  { ...receipt, id: "" }, { ...receipt, run_id: "foreign" },
  { ...receipt, from_evidence_id: "foreign" }, { ...receipt, to_evidence_id: "foreign" },
  { ...receipt, relationship: "different" }, { ...receipt, hop_depth: 9 },
];
describe("Pattern Hop edge write receipts", () => {
  it("reuses the matching edge without a duplicate insert", async () => {
    const x = db(receipt);
    await persistPatternHopEdges({ ...params, supabase: x.supabase });
    expect(x.insert).not.toHaveBeenCalled();
  });
  it.each(mismatches)("rejects mismatched duplicate receipts", async row => {
    const x = db(row);
    await expect(persistPatternHopEdges({ ...params, supabase: x.supabase }))
      .rejects.toThrow("pattern_hop_edge_existing_identity_invalid");
    expect(x.insert).not.toHaveBeenCalled();
  });
  it("accepts a new matching edge receipt", async () => {
    const x = db(null);
    await persistPatternHopEdges({ ...params, supabase: x.supabase });
    expect(x.insert).toHaveBeenCalledTimes(1);
  });
  it.each([null, ...mismatches])("rejects missing or replaced insert receipts", async row => {
    const x = db(null, row);
    await expect(persistPatternHopEdges({ ...params, supabase: x.supabase }))
      .rejects.toThrow("pattern_hop_edge_insert_identity_invalid");
  });
  it("preserves null root endpoints for both insertion and replay", async () => {
    const rootParams = { ...params, edges: [{ ...edge, fromEvidenceId: null }] };
    for (const existing of [null, { ...receipt, from_evidence_id: null }]) {
      const x = db(existing, { ...receipt, from_evidence_id: null });
      await expect(persistPatternHopEdges({ ...rootParams, supabase: x.supabase })).resolves.toBeUndefined();
    }
  });
});
