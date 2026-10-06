import{describe,expect,it}from"vitest";
import{checkpointPatternHopRun,findingAlreadyEmitted,resumePatternHopRun,type PatternHopCheckpoint}from"../patternHopRunState";

describe("pattern hop run state",()=>{
 it("preserves durable run identity and suppresses duplicate findings",()=>{
  let cp:PatternHopCheckpoint={runId:"r",sequence:0,cursor:"0",visitedEvidenceIds:[],emittedFindingKeys:[],stopped:false};
  cp=checkpointPatternHopRun(cp,{runId:"r",cursor:"1",visitedEvidenceIds:["e1"],emittedFindingKeys:["f1"]});
  expect(resumePatternHopRun(cp,{runId:"r",expectedSequence:1}).cursor).toBe("1");
  expect(findingAlreadyEmitted(cp,"f1")).toBe(true);
  expect(()=>resumePatternHopRun(cp,{runId:"r",expectedSequence:0})).toThrow();
 });
});
