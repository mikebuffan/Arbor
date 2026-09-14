import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  AgencyState,
} from "../engine";
import {
  splitAgencyWork,
} from "../openLoops";
import {
  buildAgencySessionState,
} from "../session";

const prior: AgencyState = {
  goal: "unzip and inspect Arbor export",
  status: "active",
  currentStep: 12,
  unresolvedWork: [
    "index extracted files",
    "pattern-hop recovered code",
  ],
  recurringWeaknesses: [
    "lost open loop after interruption",
  ],
  strategyNotes: [
    "resume safe unfinished work automatically",
  ],
  blocker: null,
};

describe(
  "agency session interruption ownership",
  () => {
    it(
      "treats an unrelated substantive turn as foreground without cancelling prior work",
      () => {
        const next =
          buildAgencySessionState({
            userText: "Am I bossy?",
            prior,
            checkpointId: "interruption-1",
            now: "2026-09-14T20:30:00.000Z",
          });

        expect(next.goal).toBe(
          "Am I bossy?",
        );
        expect(next.currentStep).toBe(0);

        const work =
          splitAgencyWork(
            next.unresolvedWork,
          );

        expect(work.current).toEqual([
          "complete goal: Am I bossy?",
        ]);
        expect(work.suspended).toHaveLength(1);
        expect(
          work.suspended[0].checkpoint.goal,
        ).toBe(prior.goal);
        expect(
          work.suspended[0].checkpoint
            .unresolvedWork,
        ).toEqual(prior.unresolvedWork);
      },
    );

    it(
      "resumes an explicit continuation without creating a duplicate checkpoint",
      () => {
        const next =
          buildAgencySessionState({
            userText: "go",
            prior,
          });

        expect(next.goal).toBe(prior.goal);
        expect(next.currentStep).toBe(
          prior.currentStep,
        );
        expect(next.unresolvedWork).toEqual(
          prior.unresolvedWork,
        );
        expect(
          splitAgencyWork(next.unresolvedWork)
            .suspended,
        ).toHaveLength(0);
      },
    );

    it(
      "honors explicit supersession and does not secretly resurrect dropped work",
      () => {
        const next =
          buildAgencySessionState({
            userText:
              "Drop that. New task: explain the deployment failure",
            prior,
          });

        expect(next.goal).toBe(
          "Drop that. New task: explain the deployment failure",
        );
        expect(
          splitAgencyWork(next.unresolvedWork)
            .suspended,
        ).toHaveLength(0);
      },
    );
  },
);
