import { describe, expect, it } from "vitest";
import {
  persistDiagnosticCheckpointVerified,
  type VerifiedEditorialPersistencePort,
} from "../editorialPersistenceAdapter";
import type { EditorialCheckpoint } from "../editorialCheckpoint";

const source = "a".repeat(64);
const checkpoint: EditorialCheckpoint = {
  manuscriptId: "synthetic-manuscript",
  chapterNumber: 2,
  sourceSha256: source,
  diagnosticFingerprint: "synthetic-diagnostic",
  nextStage: "diagnostics",
  completedRecordKeys: [],
  sequence: 1,
};

function fakePort(tamper: (state: EditorialCheckpoint) => EditorialCheckpoint):
  VerifiedEditorialPersistencePort {
  const keys = new Set<string>();
  let stored: EditorialCheckpoint | null = null;
  return {
    persistRecords: async records => {
      for (const row of records) keys.add(row.recordKey);
      return { recordKeys: records.map(row => row.recordKey) };
    },
    persistCheckpoint: async state => { stored = state; },
    readRecordKeys: async () => ({ recordKeys: [...keys] }),
    readCheckpoint: async () => stored ? tamper(stored) : null,
  };
}

async function run(tamper: (value: EditorialCheckpoint) => EditorialCheckpoint) {
  return persistDiagnosticCheckpointVerified({
    port: fakePort(tamper),
    manuscriptId: checkpoint.manuscriptId,
    chapterNumber: 2,
    sourceSha256: source,
    checkpoint,
    diagnostics: [{
      engine: "rhythm", severity: "watch", message: "Synthetic rhythm observation", evidence: [],
    }],
  });
}

describe("Group 14 editorial readback content integrity (synthetic)", () => {
  it.each([NaN, Infinity, 2.5])("rejects invalid saved checkpoint sequence %s", async sequence => {
    await expect(run(state => ({ ...state, sequence })))
      .rejects.toThrow("annabelle_persistence_checkpoint_readback_stale");
  });
  it("accepts genuinely matching checkpoint and record-key readback", async () => {
    const value = await run(state => state);
    expect(value.verified).toBe(true);
    expect(value.checkpoint.completedRecordKeys).toHaveLength(1);
  });

  it("rejects checkpoint row that lost all required record keys", async () => {
    await expect(run(state => ({ ...state, completedRecordKeys: [] })))
      .rejects.toThrow("annabelle_persistence_checkpoint_readback_records_missing");
  });

  it("rejects a checkpoint whose diagnostic identity changed despite same scope and sequence", async () => {
    await expect(run(state => ({ ...state, diagnosticFingerprint: "other-diagnostic" })))
      .rejects.toThrow("annabelle_persistence_checkpoint_readback_content_mismatch");
  });

  it("rejects a checkpoint whose workflow stage changed without being the write just verified", async () => {
    await expect(run(state => ({ ...state, nextStage: "rewrite-review" })))
      .rejects.toThrow("annabelle_persistence_checkpoint_readback_content_mismatch");
  });

  it("allows additional unrelated readback keys without losing the written key", async () => {
    const value = await run(state => ({
      ...state, completedRecordKeys: [...state.completedRecordKeys, "synthetic-other-key"],
    }));
    expect(value.verified).toBe(true);
  });
});
