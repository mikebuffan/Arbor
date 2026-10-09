import { describe, expect, it, vi } from "vitest";
import { persistDiagnosticCheckpoint } from "../editorialPersistenceAdapter";

const input = { manuscriptId: "synthetic", chapterNumber: 2, sourceSha256: "a".repeat(64),
  checkpoint: { manuscriptId: "synthetic", chapterNumber: 2, sourceSha256: "a".repeat(64),
    diagnosticFingerprint: "diagnostic", nextStage: "diagnostics" as const, completedRecordKeys: [], sequence: 1 },
  diagnostics: [{ engine: "rhythm" as const, severity: "watch" as const, message: "Synthetic note", evidence: [] }] };

describe("Editorial write acknowledgement integrity", () => {
  it("rejects a changed edition before either persistence operation", async () => {
    const port = { persistRecords: vi.fn(), persistCheckpoint: vi.fn() };
    await expect(persistDiagnosticCheckpoint({ ...input, sourceSha256: "b".repeat(64), port }))
      .rejects.toThrow("annabelle_checkpoint_source_changed");
    expect(port.persistRecords).not.toHaveBeenCalled();
    expect(port.persistCheckpoint).not.toHaveBeenCalled();
  });
  it.each([[], ["forged-key"], null, [null]])("never advances a checkpoint from missing or fabricated record keys", async recordKeys => {
    const port = { persistRecords: vi.fn(async () => ({ recordKeys } as never)), persistCheckpoint: vi.fn() };
    await expect(persistDiagnosticCheckpoint({ ...input, port }))
      .rejects.toThrow("annabelle_persistence_record_receipt_mismatch");
    expect(port.persistCheckpoint).not.toHaveBeenCalled();
  });
  it("preserves an earlier completion key and tolerates idempotent repeated acknowledgements", async () => {
    const port = { persistRecords: vi.fn(async (records: readonly {recordKey:string}[]) =>
      ({ recordKeys: [records[0].recordKey, records[0].recordKey] })), persistCheckpoint: vi.fn(async () => {}) };
    const result = await persistDiagnosticCheckpoint({ ...input, port,
      checkpoint: { ...input.checkpoint, completedRecordKeys: ["earlier-stage-key"] } });
    expect(result.checkpoint.completedRecordKeys).toEqual(["earlier-stage-key", result.records[0].recordKey].sort());
  });
});
