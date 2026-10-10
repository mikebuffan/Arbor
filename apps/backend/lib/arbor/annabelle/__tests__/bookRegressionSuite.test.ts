import{describe,expect,it}from"vitest";import{runBookRegressionSuite}from"../bookRegressionSuite";
describe("book regression suite",()=>{it("aggregates local and manuscript-scale checks",()=>{const r=runBookRegressionSuite({text:"She opened the door. She stayed.",physical:[{chapter:1,character:"Ever",injuries:{hip:"chronic"},compensations:["hitch"],scars:["shoulder"]},{chapter:2,character:"Ever",injuries:{},compensations:[],scars:[]} ]});expect(r.physical.length).toBeGreaterThan(0);expect(r.blocking).toBeGreaterThan(0);});});


describe("intimacy sequence in the existing book regression", () => {
  it("is opt-in advisory and never marks manuscript edits or blocks automatically", () => {
    const before = runBookRegressionSuite({ text: "She chose to stay." });
    expect(before.intimacy).toEqual([]);
    const withScene = runBookRegressionSuite({
      text: "She chose to stay.",
      intimacySequences: [{
        relationship: "Ever/Will", stage: "earned trust",
        scenePurpose: "A choice about closeness", focalCharacter: "Ever",
        participants: ["Ever", "Will"],
        beats: [{
          id: "first", initiator: "Will", recipient: "Ever",
          positionBefore: "doorway", positionAfter: "doorway",
          action: "extends his hand", microAction: "waits",
          physicalTrace: "her hand stays still",
          bodilyPropagation: "weight shifts",
          recipientResponse: "she steps away",
          adaptation: "he gives her space", choiceEvidence: [],
        }],
        endChange: "The boundary is clearer",
      }],
    });
    expect(withScene.intimacy.some(x => x.kind === "choice" && x.sequenceIndex === 0))
      .toBe(true);
    expect(withScene.blocking).toBe(before.blocking);
    expect(withScene.intimacy.every(x => x.advisory)).toBe(true);
  });
});
