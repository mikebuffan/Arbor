import{describe,expect,it}from"vitest";import{relationshipProfile}from"../relationshipProfiles";
describe("relationship profiles",()=>{it("keeps coercion and consent distinct",()=>{expect(relationshipProfile("Ever/Rhys")?.forbiddenShortcuts).toContain("coercion reframed as consent");expect(relationshipProfile("Ever/Will")?.mustEarn).toContain("repair after rupture");});});
