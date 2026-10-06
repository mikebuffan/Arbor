import{describe,expect,it}from"vitest";
import{runChapterAcceptanceFixture}from"../chapterAcceptance";
import{protectGoldEdits}from"../goldProtection";
import{sceneStateDelta}from"../sceneStateDelta";
describe("Chapter Two acceptance scenarios",()=>{
 it("rejects empty canonical text",()=>{expect(()=>runChapterAcceptanceFixture({chapterNumber:2,text:" ",sourceSha256:"a".repeat(64)})).toThrow();});
 it("does not silently remove Gold prose",()=>{expect(protectGoldEdits({before:"Keep this. New line.",after:"New line.",protectedSpans:[{text:"Keep this.",sourceSha256:"a".repeat(64),kind:"gold"}]}).allowed).toBe(false);});
 it("can prove a scene changed without requiring dialogue",()=>{const before={knowledge:[],relationships:{},body:["guarded"],threats:[],goals:["leave"],objects:{},motifs:[]};const after={...before,body:["guarded","tired"],goals:["stay"]};expect(sceneStateDelta(before,after).changed).toBe(true);});
});
