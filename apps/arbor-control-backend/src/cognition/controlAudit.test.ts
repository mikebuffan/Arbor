import {
  describe,
  expect,
  it,
} from "vitest";

import {
  auditControlState,
  reviseControlStateOnce,
} from "./controlAudit.js";
import type {
  AgencyResult,
} from "../agency.js";
import type {
  ArborState,
} from "../types.js";

function state(
  unresolvedWork:
    string[] = [],
): ArborState {
  return {
    activeSubsystem:
      "arbor",
    goal:
      "restore Arbor",
    unresolvedWork,
    strategyNotes: [],
    behavioralCorrections: [],
    acousticCorrections: [],
    voiceId:
      "cedar",
  };
}

describe(
  "pre-response control audit",
  () => {
    it(
      "catches false completion while work remains",
      () => {
        const current =
          state([
            "verify integration",
          ]);

        const agency:
          AgencyResult = {
          status:
            "complete",
          text:
            "done",
          state:
            current,
          rounds:
            1,
          toolCalls:
            0,
          researchCalls:
            0,
        };

        const audit =
          auditControlState({
            state:
              current,
            agency,
          });

        expect(
          audit.approved,
        ).toBe(
          false,
        );

        expect(
          audit.issues,
        ).toContain(
          "false_completion_with_unresolved_work",
        );

        expect(
          reviseControlStateOnce({
            state:
              current,
            agency,
            audit,
          }).unresolvedWork,
        ).toEqual([
          "verify integration",
        ]);
      },
    );

    it(
      "passes truthful completion",
      () => {
        const current =
          state([]);

        const agency:
          AgencyResult = {
          status:
            "complete",
          text:
            "done",
          state:
            current,
          rounds:
            1,
          toolCalls:
            0,
          researchCalls:
            0,
        };

        expect(
          auditControlState({
            state:
              current,
            agency,
          }).approved,
        ).toBe(
          true,
        );
      },
    );
  },
);
