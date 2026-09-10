import {
  describe,
  expect,
  it,
} from "vitest";

import {
  adapterFailure,
  adapterSuccess,
} from "../result";

import {
  decideAdapterRecovery,
} from "../recovery";

describe("adapter recovery contract", () => {
  it("wraps successful evidence", () => {
    expect(
      adapterSuccess(
        "ok",
        { source: "tool" },
      ),
    ).toEqual({
      ok: true,
      value: "ok",
      evidence: {
        source: "tool",
      },
    });
  });

  it("tries an untried alternate before stopping", () => {
    const failure =
      adapterFailure({
        kind:
          "provider_failure",
        error:
          "provider A failed",
        retryable:
          false,
        alternateRoutes: [
          "provider-a",
          "provider-b",
        ],
      });

    expect(
      decideAdapterRecovery(
        failure,
        ["provider-a"],
      ),
    ).toEqual({
      kind:
        "alternate",
      route:
        "provider-b",
      reason:
        "provider A failed",
    });
  });

  it("blocks at authorization boundaries", () => {
    const failure =
      adapterFailure({
        kind:
          "authorization",
        error:
          "missing authority",
        retryable:
          false,
      });

    expect(
      decideAdapterRecovery(
        failure,
        [],
      ).kind,
    ).toBe(
      "block",
    );
  });

  it("retries transient failures when no alternate exists", () => {
    const failure =
      adapterFailure({
        kind:
          "transient",
        error:
          "temporary provider failure",
        retryable:
          true,
      });

    expect(
      decideAdapterRecovery(
        failure,
        [],
      ).kind,
    ).toBe(
      "retry",
    );
  });
});
