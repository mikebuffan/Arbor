import {
  describe,
  expect,
  it,
} from "vitest";

import {
  pushAnnabelleRevision,
  restoreLatestAnnabelleRevision,
} from "./controlState.js";
import type { ArborState } from "./types.js";

const state: ArborState = {
  activeSubsystem: "annabelle",
  goal: "write scene",
  unresolvedWork: [],
  strategyNotes: [],
  acousticCorrections: [],
  voiceId: "cedar",
  annabelle: {
    canon: ["Will notices first."],
    lockedPassages: ["Locked paragraph."],
    sceneState: ["At Hannibal's house."],
    unresolvedDecisions: ["Ending beat."],
    workingDelta: "Old draft.",
  },
};

describe("Annabelle workspace revisions", () => {
  it("restores the exact previous workspace", () => {
    const revisioned = pushAnnabelleRevision(
      state,
      "new draft",
    );

    const changed: ArborState = {
      ...revisioned,
      annabelle: {
        ...revisioned.annabelle!,
        workingDelta: "New draft.",
      },
    };

    const restored =
      restoreLatestAnnabelleRevision(changed);

    expect(restored.annabelle).toEqual(state.annabelle);
    expect(restored.annabelleRevisions).toEqual([]);
  });
});
