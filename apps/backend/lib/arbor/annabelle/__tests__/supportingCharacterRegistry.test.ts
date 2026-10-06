import{describe,expect,it}from"vitest";import{supportingCharacter}from"../supportingCharacterRegistry";
describe("supporting character registry",()=>{it("does not invent unsupported voice traits",()=>{const mara=supportingCharacter("Mara");expect(mara?.status).toBe("needs-canonical-evidence");expect(mara?.voiceEvidence).toEqual([]);});});
