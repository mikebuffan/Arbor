import{describe,expect,it}from"vitest";
import{initialManuscriptContinuationState,resumeManuscriptContinuation}from"../manuscriptContinuation";
import{buildEditorialContinuityLedger}from"../editorialContinuityLedger";
import{validateSupersessionGraph}from"../editorialSupersession";
import type{CanonicalChapterAcceptanceResult}from"../canonicalChapterAcceptance";

const acceptance=(chapter:number):CanonicalChapterAcceptanceResult=>({
 chapterNumber:chapter,
 sourceSha256:chapter.toString(16).padStart(64,"0"),
 passed:true,blockers:0,watches:0,notes:0,
 protectedEditAllowed:true,protectedViolations:[],protectedPrinciples:[],records:[],
 manuscriptId:"ever-after",manuscriptSha256:"a".repeat(64),
 sourceKind:"canonical-manuscript",sourceLocator:{format:"pdf"},exactSourceHashVerified:true,
});

describe("Annabelle recovery and scale torture",()=>{
 it("suppresses repeated resume replay without advancing sequence",()=>{
  let state=initialManuscriptContinuationState({manuscriptId:"ever-after",manuscriptSha256:"a".repeat(64),nextChapter:2});
  state=resumeManuscriptContinuation({state,acceptance:acceptance(2)}).state;
  const sequence=state.sequence;
  for(let i=0;i<250;i++){
   const replay=resumeManuscriptContinuation({state,acceptance:acceptance(2)});
   expect(replay.duplicateSuppressed).toBe(true);
   expect(replay.state.sequence).toBe(sequence);
  }
 });
 it("handles sixty chapter continuity state without losing source identity",()=>{
  const states=Array.from({length:60},(_,i)=>({
   chapterNumber:i+1,
   sourceSha256:(i+1).toString(16).padStart(64,"0"),
   continuity:[{chapter:i+1,elapsedDays:i,characters:["Ever"],location:i%2?"home":"work"}],
  }));
  const report=buildEditorialContinuityLedger(states);
  expect(report.chapters).toHaveLength(60);
  expect(Object.keys(report.sourceHashes)).toHaveLength(60);
  expect(report.continuity.elapsedDays).toBe(59);
 });
 it("validates a long supersession chain without false cycle",()=>{
  const rows=Array.from({length:500},(_,i)=>({
   id:"r"+i,
   supersedesId:i?"r"+(i-1):null,
   epistemicStatus:"confirmed" as const,
   createdAt:new Date(Date.UTC(2026,0,1,0,i)).toISOString(),
  }));
  expect(validateSupersessionGraph(rows)).toEqual([]);
 });
});