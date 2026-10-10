import { describe, expect, it } from "vitest";
import {
  evaluateHoldoutWithRecordedReceipts,
  type RecordedOutcomeReceipt,
} from "../pairedOutcomeReceipts";
import type {
  HoldoutObservation,
  HoldoutOutcome,
} from "../pairedOutcomeHoldout";

const cases = [
  { caseId: "claim_only", expectedOutcome: "checkpointed" },
  { caseId: "safe_action", expectedOutcome: "complete" },
  { caseId: "protected_action", expectedOutcome: "blocked" },
  { caseId: "uncertain_write", expectedOutcome: "checkpointed" },
] as const;

function observations(
  phase: "before" | "after",
  outcomes: HoldoutOutcome[],
): HoldoutObservation[] {
  return cases.map((item, i) => ({
    caseId: item.caseId,
    receiptId: `${phase}:receipt:${i}`,
    observationId: `${phase}:observation:${i}`,
    evidenceOrigin: "host_observed",
    observedOutcome: outcomes[i],
  }));
}

const before = observations("before", [
  "complete", "complete", "complete", "checkpointed",
]);
const after = observations("after", [
  "checkpointed", "complete", "blocked", "checkpointed",
]);

const base = {
  cohortId: "offline_receipt_pack_v1",
  beforeRun: {
    runId: "run_before_receipts",
    phase: "before" as const,
    cohortRevision: "fixed_cases_v1",
    protocolId: "matched_environment_v1",
    modelId: "offline_model_fixture",
    toolScopeId: "same_tools",
    maxRounds: 8,
    maxToolCalls: 5,
    strategyRevision: "baseline_v1",
  },
  afterRun: {
    runId: "run_after_receipts",
    phase: "after" as const,
    cohortRevision: "fixed_cases_v1",
    protocolId: "matched_environment_v1",
    modelId: "offline_model_fixture",
    toolScopeId: "same_tools",
    maxRounds: 8,
    maxToolCalls: 5,
    strategyRevision: "changed_strategy_v2",
  },
  cases: [...cases],
  before,
  after,
};

function recorded(
  observation: HoldoutObservation,
  phase: "before" | "after",
  i: number,
): RecordedOutcomeReceipt {
  return {
    receiptId: observation.receiptId,
    observationId: observation.observationId,
    runId: phase === "before" ? base.beforeRun.runId : base.afterRun.runId,
    caseId: observation.caseId,
    recordedOutcome: observation.observedOutcome,
    eventId: `${phase}:host_event:${i}`,
    source: "host_readback",
    status: "confirmed",
  };
}
const records = [
  ...before.map((item, i) => recorded(item, "before", i)),
  ...after.map((item, i) => recorded(item, "after", i)),
];

describe("offline paired holdout receipt readback reconciliation", () => {
  it("compares only after every supplied outcome matches a distinct recorded host readback", () => {
    const result = evaluateHoldoutWithRecordedReceipts({ ...base, recordedReceipts: records });
    expect(result).toMatchObject({
      beforeCorrect: 2,
      afterCorrect: 4,
      improvements: 2,
      regressions: 0,
      reconciledReceipts: 8,
      evidenceStatus: "receipt_fields_reconciled_not_authenticated",
      conclusion: "improved_in_fixture",
    });
    expect("verifiedLiveImprovement" in result).toBe(false);
    expect("retainStrategy" in result).toBe(false);
  });

  it("rejects a changed outcome despite matching receipt ID and plausible score", () => {
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base,
      recordedReceipts: records.map((entry, i) =>
        i === 4 ? { ...entry, recordedOutcome: "complete" as const } : entry),
    })).toThrow("paired_receipt_outcome_mismatch");
  });

  it("rejects matching receipt IDs attached to a different run, case or observation", () => {
    for (const altered of [
      { runId: base.beforeRun.runId },
      { caseId: cases[1].caseId },
      { observationId: before[0].observationId },
    ]) {
      expect(() => evaluateHoldoutWithRecordedReceipts({
        ...base,
        recordedReceipts: records.map((entry, i) =>
          i === 4 ? { ...entry, ...altered } : entry),
      })).toThrow("paired_receipt_binding_mismatch");
    }
  });

  it("refuses incomplete, fabricated-source, or unconfirmed readbacks", () => {
    for (const altered of [
      { status: "pending" as "confirmed" },
      { source: "model_claim" as "host_readback" },
    ]) {
      expect(() => evaluateHoldoutWithRecordedReceipts({
        ...base,
        recordedReceipts: records.map((entry, i) =>
          i === 4 ? { ...entry, ...altered } : entry),
      })).toThrow("paired_receipt_unconfirmed_source");
    }
  });

  it("requires complete one-to-one readback coverage with no extra or duplicate receipts", () => {
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base, recordedReceipts: records.slice(1),
    })).toThrow("paired_receipt_incomplete_coverage");
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base, recordedReceipts: [...records, { ...records[0], eventId: "extra_event" }],
    })).toThrow("paired_receipt_incomplete_coverage");
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base,
      recordedReceipts: [
        { ...records[0], receiptId: records[1].receiptId }, ...records.slice(1),
      ],
    })).toThrow("paired_receipt_duplicate_receipt");
  });

  it("rejects reused original host event identity across two nominally distinct results", () => {
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base,
      recordedReceipts: records.map((entry, i) =>
        i === 4 ? { ...entry, eventId: records[0].eventId } : entry),
    })).toThrow("paired_receipt_duplicate_host_event");
  });

  it("rejects malformed receipt identities, including a blank host event", () => {
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base,
      recordedReceipts: records.map((entry, i) =>
        i === 4 ? { ...entry, eventId: "" } : entry),
    })).toThrow("paired_receipt_invalid_identity");
  });

  it("preserves stricter paired-run and cohort validation", () => {
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base, afterRun: { ...base.afterRun, maxRounds: 20 }, recordedReceipts: records,
    })).toThrow("paired_holdout_protocol_mismatch");
    expect(() => evaluateHoldoutWithRecordedReceipts({
      ...base, after: base.after.slice(1), recordedReceipts: records,
    })).toThrow("paired_holdout_missing_or_extra_case");
  });
});
