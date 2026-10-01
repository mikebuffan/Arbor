import { describe, expect, it } from "vitest";
import { editorialRecordTypes } from "../annabelle/editorial";

describe("Annabelle editorial persistence contract", () => {
  it("covers every durable editorial record family", () => {
    expect(editorialRecordTypes).toEqual(expect.arrayContaining([
      "reader_reaction","editor_note","voice_evidence","gold_exemplar","canon",
      "character_state","relationship_state","knowledge_state","timeline",
      "thread_payoff","motif","physicality","location","injury_recovery",
      "problem","decision","do_not_touch","production_artifact","duplicate",
      "contradiction","impact",
    ]));
  });
  it("does not expose an edit/rewrite record type as diagnostic evidence", () => {
    expect(editorialRecordTypes).not.toContain("rewrite" as never);
  });
});
