import { describe, expect, it } from "vitest";
import {
  runAgency,
  type AgencyRuntime,
} from "../engine";

type Shared = { completed: number };

describe("runAgency", () => {
  it("keeps doing reversible work without a user babysitting loop", async () => {
    const persisted: number[] = [];

    const runtime: AgencyRuntime<Shared> = {
      async loadSharedState() {
        return { completed: 0 };
      },

      async assess({ shared }) {
        return {
          complete: shared.completed >= 3,
          unresolvedWork:
            shared.completed >= 3
              ? []
              : [`finish step ${shared.completed + 1}`],
        };
      },

      async choose() {
        return {
          id: crypto.randomUUID(),
          description: "do the next reversible step",
          reversible: true,
        };
      },

      async execute() {
        return 1;
      },

      async integrate({ shared, result }) {
        return { completed: shared.completed + Number(result) };
      },

      async verify({ shared }) {
        return { ok: shared.completed > 0, evidence: shared.completed };
      },

      async selfAudit() {
        return {};
      },

      async persist({ shared }) {
        persisted.push(shared.completed);
      },
    };

    const result = await runAgency({
      goal: "complete three steps",
      runtime,
    });

    expect(result.agency.status).toBe("complete");
    expect(result.shared.completed).toBe(3);
    expect(persisted).toEqual([1, 2, 3, 3]);
  });

  it("retains unresolved work at a real boundary", async () => {
    const runtime: AgencyRuntime<Shared> = {
      async loadSharedState() {
        return { completed: 0 };
      },
      async assess() {
        return { complete: false, unresolvedWork: ["publish external change"] };
      },
      async choose() {
        return {
          id: "publish",
          description: "publish external change",
          reversible: false,
        };
      },
      async execute() {
        throw new Error("should_not_execute");
      },
      async integrate({ shared }) {
        return shared;
      },
      async verify() {
        return { ok: true };
      },
      async selfAudit() {
        return {};
      },
      async persist() {},
    };

    const result = await runAgency({ goal: "publish", runtime });

    expect(result.agency.status).toBe("blocked");
    expect(result.agency.blocker).toBe("irreversible_action");
    expect(result.agency.unresolvedWork).toEqual(["publish external change"]);
  });

  it("keeps a learned strategy tentative until repeated verification", async () => {
    let rounds = 0;

    const runtime: AgencyRuntime<Shared> = {
      async loadSharedState() {
        return { completed: 0 };
      },

      async assess({ shared }) {
        return {
          complete: shared.completed >= 2,
          unresolvedWork:
            shared.completed >= 2
              ? []
              : ["fix approach"],
        };
      },

      async choose() {
        return {
          id: `fix-${rounds}`,
          description: "fix approach",
          reversible: true,
        };
      },

      async execute() {
        rounds += 1;
        return 1;
      },

      async integrate({ shared, result }) {
        return {
          completed: shared.completed + Number(result),
        };
      },

      async verify() {
        return {
          ok: false,
          correction: "do not narrate instead of acting",
        };
      },

      async selfAudit({ verification }) {
        return {
          recurringWeakness: "status narration",
          strategyChange: verification.correction,
        };
      },

      async persist() {},
    };

    const result = await runAgency({
      goal: "fix approach",
      runtime,
    });

    expect(rounds).toBe(2);
    expect(result.agency.strategyNotes).toContain(
      "do not narrate instead of acting",
    );
    expect(
      result.agency.strategyNotes.some((note) =>
        note.startsWith("__arbor_pending_strategy_v1__:"),
      ),
    ).toBe(false);
  });

});
