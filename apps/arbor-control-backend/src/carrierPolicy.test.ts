import assert from "node:assert/strict";
import { buildCarrierInjection, mergeCarrierState } from "./carrierPolicy.js";
import type { ArborState } from "./types.js";

const project: ArborState = {
  activeSubsystem: "arbor",
  goal: "restore Arbor carrier",
  unresolvedWork: ["wire carrier into wake-up path"],
  strategyNotes: [],
  behavioralCorrections: ["Do not wait for repeated go."],
  acousticCorrections: [],
  voiceId: "cedar",
};

const blank: ArborState = {
  activeSubsystem: "arbor",
  goal: null,
  unresolvedWork: [],
  strategyNotes: [],
  behavioralCorrections: [],
  acousticCorrections: [],
  voiceId: "cedar",
};

const kept = mergeCarrierState(project, blank);
assert.equal(kept.goal, project.goal);
assert.deepEqual(kept.unresolvedWork, project.unresolvedWork);

const local: ArborState = {
  ...blank,
  goal: "local task",
  unresolvedWork: ["finish local task"],
  behavioralCorrections: ["Newest correction."],
};
const merged = mergeCarrierState(project, local);
assert.equal(merged.goal, "local task");
assert.deepEqual(merged.unresolvedWork, ["finish local task"]);
assert.deepEqual(merged.behavioralCorrections, [
  "Do not wait for repeated go.",
  "Newest correction.",
]);

const injection = buildCarrierInjection(kept);
assert.match(injection, /ACTIVE GOAL/);
assert.match(injection, /UNRESOLVED WORK/);
assert.match(injection, /Identity -> valid corrections -> active goal\/open loops -> agency -> task\/subsystem/);

console.log("PASS carrier policy");
