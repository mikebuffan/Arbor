import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  AgencyState,
} from "../engine";

import {
  decodeSuspendedOpenLoop,
  preserveSuspendedOpenLoops,
  projectAgencyWorkForPrompt,
  restoreMostRecentOpenLoop,
  splitAgencyWork,
  suspendAgencyIntoWork,
} from "../openLoops";

function agency(
  overrides: Partial<AgencyState> = {},
): AgencyState {
  return {
    goal: "unzip and inspect Arbor export",
    status: "active",
    currentStep: 12,
    unresolvedWork: [
      "index extracted files",
      "pattern-hop recovered code",
    ],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
    ...overrides,
  };
}

describe(
  "durable interrupted open loops",
  () => {
    it(
      "keeps the exact old job while an unrelated foreground turn runs",
      () => {
        const work =
          suspendAgencyIntoWork(
            ["complete goal: Am I bossy?"],
            agency(),
            {
              id: "bossy-interruption",
              suspendedAt:
                "2026-09-14T20:30:00.000Z",
            },
          );

        const split =
          splitAgencyWork(work);

        expect(split.current).toEqual([
          "complete goal: Am I bossy?",
        ]);
        expect(split.suspended).toHaveLength(1);
        expect(
          split.suspended[0].checkpoint.goal,
        ).toBe(
          "unzip and inspect Arbor export",
        );
        expect(
          split.suspended[0].checkpoint
            .unresolvedWork,
        ).toEqual([
          "index extracted files",
          "pattern-hop recovered code",
        ]);
      },
    );

    it(
      "does not let tool progress erase a suspended sibling objective",
      () => {
        const interrupted =
          suspendAgencyIntoWork(
            ["complete goal: foreground question"],
            agency(),
            { id: "old-job" },
          );

        const selected =
          preserveSuspendedOpenLoops(
            interrupted,
            ["execute capability: search"],
          );

        const observed =
          preserveSuspendedOpenLoops(
            selected,
            ["verify capability result: search"],
          );

        const split =
          splitAgencyWork(observed);

        expect(split.current).toEqual([
          "verify capability result: search",
        ]);
        expect(split.suspended).toHaveLength(1);
        expect(
          split.suspended[0].checkpoint.goal,
        ).toBe(
          "unzip and inspect Arbor export",
        );
      },
    );

    it(
      "restores the interrupted job after the foreground goal verifies complete",
      () => {
        const foreground =
          agency({
            goal: "Am I bossy?",
            currentStep: 2,
            unresolvedWork:
              suspendAgencyIntoWork(
                ["finalize verified goal"],
                agency(),
                { id: "resume-me" },
              ),
          });

        const restored =
          restoreMostRecentOpenLoop(
            foreground,
          );

        expect(restored).not.toBeNull();
        expect(restored?.goal).toBe(
          "unzip and inspect Arbor export",
        );
        expect(restored?.currentStep).toBe(12);
        expect(restored?.status).toBe("active");
        expect(restored?.unresolvedWork).toEqual([
          "index extracted files",
          "pattern-hop recovered code",
        ]);
      },
    );

    it(
      "uses LIFO interruption semantics for nested foreground turns",
      () => {
        const a = agency({
          goal: "A",
          currentStep: 1,
          unresolvedWork: ["finish A"],
        });

        const b = agency({
          goal: "B",
          currentStep: 2,
          unresolvedWork:
            suspendAgencyIntoWork(
              ["finish B"],
              a,
              { id: "A" },
            ),
        });

        const c = agency({
          goal: "C",
          currentStep: 3,
          unresolvedWork:
            suspendAgencyIntoWork(
              ["finish C"],
              b,
              { id: "B" },
            ),
        });

        const resumeB =
          restoreMostRecentOpenLoop(c);
        const resumeA = resumeB
          ? restoreMostRecentOpenLoop(resumeB)
          : null;

        expect(resumeB?.goal).toBe("B");
        expect(resumeB?.unresolvedWork[0]).toBe(
          "finish B",
        );
        expect(resumeA?.goal).toBe("A");
        expect(resumeA?.unresolvedWork).toEqual([
          "finish A",
        ]);
      },
    );

    it(
      "restores a blocked prior job with its boundary intact",
      () => {
        const blocked =
          agency({
            status: "blocked",
            blocker: "external_authority",
            unresolvedWork: [
              "wait for explicit deployment approval",
            ],
          });

        const foreground =
          agency({
            goal: "answer side question",
            unresolvedWork:
              suspendAgencyIntoWork(
                ["answer side question"],
                blocked,
                { id: "blocked-job" },
              ),
          });

        const restored =
          restoreMostRecentOpenLoop(
            foreground,
          );

        expect(restored?.status).toBe("blocked");
        expect(restored?.blocker).toBe(
          "external_authority",
        );
        expect(restored?.unresolvedWork).toContain(
          "wait for explicit deployment approval",
        );
      },
    );

    it(
      "projects checkpoint metadata as readable background work, never raw payload",
      () => {
        const stored =
          suspendAgencyIntoWork(
            ["answer foreground"],
            agency(),
            { id: "projection" },
          );

        const projected =
          projectAgencyWorkForPrompt(stored);

        expect(projected[0]).toBe(
          "answer foreground",
        );
        expect(projected[1]).toContain(
          "background open loop: unzip and inspect Arbor export",
        );
        expect(projected[1]).toContain(
          "next: index extracted files",
        );
        expect(
          projected.some((item) =>
            item.includes(
              "__arbor_open_loop_v1__:",
            ),
          ),
        ).toBe(false);
      },
    );

    it(
      "rejects malformed checkpoint payloads instead of treating them as state",
      () => {
        expect(
          decodeSuspendedOpenLoop(
            "__arbor_open_loop_v1__:%7Bbad-json",
          ),
        ).toBeNull();
      },
    );
  },
);
