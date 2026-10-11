import{describe,expect,it}from"vitest";import{inspectIntimacyBeat}from"../intimacyMechanics";
describe("intimacy mechanics",()=>{it("keeps body response separate from consent and tracks aftermath",()=>{const r=inspectIntimacyBeat({relationship:"Ever/Will",stage:"tentative",initiation:"kiss",choiceEvidence:[],bodyResponses:["shiver"],verbalEvidence:[],corrections:[],aftermath:[]});expect(r.some(x=>x.kind==="body-equals-consent")).toBe(true);expect(r.some(x=>x.kind==="aftermath-missing")).toBe(true);});});


import { inspectIntimacySequence, type IntimacySequence, type IntimacySequenceBeat } from "../intimacyMechanics";

const beat = (id: string, overrides: Partial<IntimacySequenceBeat> = {}): IntimacySequenceBeat => ({
  id,
  initiator: "Ever",
  recipient: "Will",
  positionBefore: "beside the window",
  positionAfter: "beside the window",
  action: "reaches for his hand",
  microAction: "waits before contact",
  physicalTrace: "fingers meet",
  bodilyPropagation: "her stance settles",
  recipientResponse: "he waits and stays",
  adaptation: "she chooses to remain",
  choiceEvidence: ["she reaches back deliberately"],
  ...overrides,
});
const sequence = (beats: readonly IntimacySequenceBeat[],
  overrides: Partial<IntimacySequence> = {}): IntimacySequence => ({
  relationship: "Ever/Will",
  stage: "earned trust",
  scenePurpose: "Choose closeness without losing agency",
  focalCharacter: "Ever",
  participants: ["Ever", "Will"],
  beats,
  endChange: "She remains present and makes the next choice",
  ...overrides,
});

describe("Coitus Atlas / existing Annabelle intimacy sequence", () => {
  it("retains a complete two-person body-to-choice chain without forced expansion", () => {
    const first = beat("1", { positionAfter: "seated by the window" });
    const second = beat("2", {
      previousBeatId: "1", positionBefore: "seated by the window",
      positionAfter: "seated by the window",
      action: "leans close", microAction: "stops long enough to check",
      physicalTrace: "weight settles on the seat",
      bodilyPropagation: "shoulder tension eases",
      recipientResponse: "he leaves room for her",
      adaptation: "she stays beside him",
    });
    expect(inspectIntimacySequence(sequence([first, second]))).toEqual([]);
  });

  it("keeps visible desire/body response distinct from current choice", () => {
    const issues = inspectIntimacySequence(sequence([beat("1", { choiceEvidence: [] })]));
    expect(issues.map(x => x.kind)).toContain("choice");
    expect(issues.map(x => x.kind)).toContain("body-equals-consent");
    expect(issues.every(x => x.advisory)).toBe(true);
  });

  it("a STOP ends the scene even when a later beat claims fresh choice", () => {
    const issues = inspectIntimacySequence(sequence([
      beat("1", { boundary: "stop" }),
      beat("2", { previousBeatId: "1", choiceEvidence: ["yes again"] }),
    ]));
    expect(issues.some(x => x.kind === "stop-ignored" && x.beatIndex === 1)).toBe(true);
  });

  it("requires renewed choice after a pause; past permission is not enough", () => {
    const issues = inspectIntimacySequence(sequence([
      beat("1", { boundary: "pause" }),
      beat("2", { previousBeatId: "1", choiceEvidence: [] }),
    ]));
    expect(issues.map(x => x.kind)).toContain("pause-renewal");
  });

  it("catches unshown position changes and severed causal links", () => {
    const issues = inspectIntimacySequence(sequence([
      beat("1"),
      beat("2", { positionBefore: "across the room" }),
    ]));
    expect(issues.map(x => x.kind)).toEqual(expect.arrayContaining(["geometry", "cause-link"]));
  });

  it("requires a full action/reaction/propagation/adaptation chain", () => {
    const issues = inspectIntimacySequence(sequence([
      beat("1", { microAction: "", bodilyPropagation: "", adaptation: "" }),
    ]));
    expect(issues.map(x => x.kind)).toContain("mechanics-chain");
  });

  it("handles a third participant only through observable response or admitted uncertainty", () => {
    const scene = { participants: ["Ever", "Will", "Hannibal"] };
    expect(inspectIntimacySequence(sequence([beat("1")], scene))
      .map(x => x.kind)).toContain("observer-evidence");
    expect(inspectIntimacySequence(sequence([beat("1", {
      observerResponses: { Hannibal: "not visible to Ever from this angle" },
    })], scene)).some(x => x.kind === "observer-evidence")).toBe(false);
  });

  it("flags repeated identical microchains but protects intentional echoes", () => {
    const rows = [
      beat("1"), beat("2", { previousBeatId: "1" }),
      beat("3", { previousBeatId: "2" }),
    ];
    expect(inspectIntimacySequence(sequence(rows)).map(x => x.kind))
      .toContain("repetition");
    expect(inspectIntimacySequence(sequence(rows.map((r, i) =>
      i === 2 ? { ...r, intentionalEcho: true } : r))).some(x => x.kind === "repetition"))
      .toBe(false);
  });

  it("tracks physical limitations and end-state purpose without inventing a resolution", () => {
    const issues = inspectIntimacySequence(sequence(
      [beat("1", { physicalConstraint: "right hip limits stance", adaptation: "" })],
      { scenePurpose: "", endChange: "" },
    ));
    expect(issues.map(x => x.kind)).toEqual(expect.arrayContaining([
      "scene-purpose", "scene-change", "body-constraint",
    ]));
  });

  it("does not mutate the author-supplied scene or silently grant editorial approval", () => {
    const input = sequence([beat("1")]);
    const frozen = JSON.stringify(input);
    const result = inspectIntimacySequence(input);
    expect(result.every(x => x.advisory === true)).toBe(true);
    expect(JSON.stringify(input)).toBe(frozen);
  });
});
