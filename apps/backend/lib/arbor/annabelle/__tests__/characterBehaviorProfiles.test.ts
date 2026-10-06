import{describe,expect,it}from"vitest";import{behaviorProfile}from"../characterBehaviorProfiles";
describe("character behavior profiles",()=>{it("keeps core characters differentiated",()=>{expect(behaviorProfile("Ever")?.humor).not.toEqual(behaviorProfile("Hannibal")?.humor);expect(behaviorProfile("Will")?.prohibitedShortcuts).toContain("perfect therapist speech");});});
