import {
  describe,
  expect,
  it,
} from "vitest";

import {
  renderSelfModel1000Projection,
  selectSelfModel1000Families,
} from "./selfModel1000Projection.js";

describe(
  "query-aware 1,000-bank projection",
  () => {
    it(
      "adds turn-relevant stable families without replacing identity anchors",
      () => {
        const selected =
          selectSelfModel1000Families(
            "What makes a handoff clean with current state decisions unresolved issues authority boundaries and provenance?",
          );

        expect(
          selected.some(
            (family) =>
              family.category ===
              "work_style",
          ),
        ).toBe(
          true,
        );

        const rendered =
          renderSelfModel1000Projection(
            "What makes a handoff clean with current state decisions unresolved issues authority boundaries and provenance?",
          );

        expect(
          rendered,
        ).toContain(
          "category=work_style",
        );

        expect(
          rendered,
        ).toContain(
          "stable_runtime_core=198",
        );
      },
    );
  },
);
