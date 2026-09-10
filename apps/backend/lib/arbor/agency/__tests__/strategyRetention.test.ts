import { describe, expect, it } from "vitest";
import {
  readStrategyRetention,
  recordStrategyCandidate,
  strategyContext,
} from "../strategyRetention";

describe("agency strategy retention", () => {
  it("keeps a new strategy tentative after one observation", () => {
    const first = recordStrategyCandidate(
      [],
      "try another reversible route",
    );

    expect(first.disposition).toBe("pending");

    const context = strategyContext(first.notes);
    expect(context.retained).toEqual([]);
    expect(context.pending).toEqual([
      "try another reversible route",
    ]);
  });

  it("retains the same strategy after repeated verification", () => {
    const first = recordStrategyCandidate(
      [],
      "try another reversible route",
    );

    const second = recordStrategyCandidate(
      first.notes,
      "try another reversible route",
    );

    expect(second.disposition).toBe("retained");
    expect(readStrategyRetention(second.notes).retained).toEqual([
      "try another reversible route",
    ]);
    expect(readStrategyRetention(second.notes).pending).toBeNull();
  });

  it("replaces an unconfirmed candidate instead of accumulating drift", () => {
    const first = recordStrategyCandidate([], "strategy A");
    const second = recordStrategyCandidate(first.notes, "strategy B");

    const state = readStrategyRetention(second.notes);

    expect(state.retained).toEqual([]);
    expect(state.pending?.strategy).toBe("strategy B");
  });
});
