import { describe,expect,it } from "vitest";
import { assertFullConsumption,buildReadReceipt } from "../annabelle/readReceipts";

describe("Annabelle source-backed read receipts",()=>{
 it("creates a full-consumption receipt from actual source text",()=>{
  const r=buildReadReceipt({sourceText:"abc\ndef",sourceSha256:"chapter-hash"});
  expect(r.source_char_count).toBe(7);expect(r.consumed_char_count).toBe(7);expect(r.consumed_start).toBe(0);expect(r.consumed_end).toBe(7);expect(r.source_text_sha256).toHaveLength(64);
 });
 it("rejects partial consumption",()=>expect(()=>assertFullConsumption({sourceCharCount:100,consumedStart:0,consumedEnd:99,consumedCharCount:99})).toThrow("annabelle_read_receipt_requires_full_consumption"));
 it("rejects skipped prefixes",()=>expect(()=>assertFullConsumption({sourceCharCount:100,consumedStart:1,consumedEnd:100,consumedCharCount:100})).toThrow("annabelle_read_receipt_requires_full_consumption"));
});
