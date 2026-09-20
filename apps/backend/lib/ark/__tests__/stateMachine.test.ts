import { describe, expect, it } from "vitest";
import {
  assertArkObjectiveTransition,
  assertArkTaskTransition,
  validateArkTaskGraph,
} from "@/lib/ark/stateMachine";

describe("ARK state-machine invariants", () => {
  it("rejects terminal-state resurrection", () => {
    expect(() => assertArkObjectiveTransition("completed", "running"))
      .toThrow("ark_invalid_objective_transition:completed:running");
    expect(() => assertArkTaskTransition("completed", "queued"))
      .toThrow("ark_invalid_task_transition:completed:queued");
  });

  it("accepts a dependency DAG and rejects missing, self, and cyclic edges", () => {
    expect(() => validateArkTaskGraph([
      { taskKey: "collect", kind: "test", description: "collect", idempotencyKey: "a" },
      { taskKey: "verify", kind: "test", description: "verify", dependencies: ["collect"], idempotencyKey: "b" },
    ])).not.toThrow();

    expect(() => validateArkTaskGraph([
      { taskKey: "verify", kind: "test", description: "verify", dependencies: ["missing"], idempotencyKey: "a" },
    ])).toThrow("ark_unknown_dependency:verify:missing");

    expect(() => validateArkTaskGraph([
      { taskKey: "same", kind: "test", description: "same", dependencies: ["same"], idempotencyKey: "a" },
    ])).toThrow("ark_self_dependency:same");

    expect(() => validateArkTaskGraph([
      { taskKey: "a", kind: "test", description: "a", dependencies: ["b"], idempotencyKey: "a" },
      { taskKey: "b", kind: "test", description: "b", dependencies: ["a"], idempotencyKey: "b" },
    ])).toThrow(/ark_dependency_cycle/);
  });
});
