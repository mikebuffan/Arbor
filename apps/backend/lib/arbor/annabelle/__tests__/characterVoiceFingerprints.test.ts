import{describe,expect,it}from"vitest";
import{EVER_FINGERPRINT,HANNIBAL_FINGERPRINT,inspectCharacterVoice}from"../characterVoiceFingerprints";
describe("character voice fingerprints",()=>{it("detects cross-character bleed",()=>{const r=inspectCharacterVoice({text:"Perhaps you should consider it.",fingerprint:EVER_FINGERPRINT,otherFingerprints:[HANNIBAL_FINGERPRINT]});expect(r.some(x=>x.kind==="bleed")).toBe(true);});});
