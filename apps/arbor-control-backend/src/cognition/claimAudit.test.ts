import { describe, expect, it } from "vitest";

import {
  auditClaim,
  auditClaims,
} from "./claimAudit.js";

describe("cognition claim audit", () => {
  it("rejects proposal material presented as actual", () => {
    const result = auditClaim(
      {
        subject: "arbor",
        attribute: "continuity",
        assertedClass: "proposed",
        assertedActual: true,
      },
      "proposed",
    );

    expect(result.approved).toBe(false);
    expect(result.issues).toContain("proposal_presented_as_actual");
  });

  it("rejects proposal material presented as actual even when no current state exists", () => {
    const result = auditClaim(
      {
        subject: "arbor",
        attribute: "new_capability",
        assertedClass: "designed",
        assertedActual: true,
      },
      null,
    );

    expect(result.issues).toContain("proposal_presented_as_actual");
  });

  it("rejects demoting actual behavior back to a proposal", () => {
    const result = auditClaim(
      {
        subject: "arbor",
        attribute: "continuity",
        assertedClass: "proposed",
        assertedActual: false,
      },
      "implemented",
    );

    expect(result.issues).toContain("actual_demoted_to_proposal");
  });

  it("rejects forgetting a supported actual state as unknown or not recovered", () => {
    expect(
      auditClaim(
        {
          subject: "arbor",
          attribute: "continuity",
          assertedClass: "unknown",
          assertedActual: false,
        },
        "implemented",
      ).issues,
    ).toContain("temporal_state_regression");

    expect(
      auditClaim(
        {
          subject: "arbor",
          attribute: "continuity",
          assertedClass: "not_recovered",
          assertedActual: false,
        },
        "observed",
      ).issues,
    ).toContain("temporal_state_regression");
  });

  it("rejects unsupported historical backfill", () => {
    const result = auditClaim(
      {
        subject: "arbor",
        attribute: "memory",
        assertedClass: "observed",
        assertedActual: true,
        historicalBackfill: true,
        supported: false,
      },
      null,
    );

    expect(result.issues).toContain("unsupported_historical_backfill");
  });

  it("keeps unknown distinct from not_recovered", () => {
    const result = auditClaim(
      {
        subject: "arbor",
        attribute: "memory",
        assertedClass: "not_recovered",
        assertedActual: false,
      },
      "unknown",
    );

    expect(result.issues).toContain("unknown_not_recovered_confusion");
  });

  it("audits multiple consequential claims together", () => {
    const state = new Map([
      ["arbor::continuity", "implemented" as const],
      ["arbor::memory", "unknown" as const],
    ]);

    const result = auditClaims(
      [
        {
          subject: "arbor",
          attribute: "continuity",
          assertedClass: "implemented",
          assertedActual: true,
          supported: true,
        },
        {
          subject: "arbor",
          attribute: "memory",
          assertedClass: "not_recovered",
          assertedActual: false,
        },
      ],
      state,
    );

    expect(result.approved).toBe(false);
    expect(result.issues).toEqual(["unknown_not_recovered_confusion"]);
  });
});
