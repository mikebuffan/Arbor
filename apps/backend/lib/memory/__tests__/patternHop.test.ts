import {describe,expect,it} from "vitest";
import {addEvidenceUnique,enqueueHop,objectiveComplete,rankEvidence,takeNextHop,type PatternHopEvidence,type PatternHopState} from "@/lib/memory/patternHop";

const base=():PatternHopState=>({objective:"trace",maxDepth:3,frontier:[],visited:[],completedBranches:[],exhaustedBranches:[],status:"active"});

describe("pattern hop",()=>{
 it("deduplicates evidence",()=>{
  const e:PatternHopEvidence={id:"1",source:"chatgpt",sourceMessageId:"m1",evidenceType:"direct_user",content:"keep going",confidence:.9,epistemicStatus:"direct"};
  expect(addEvidenceUnique([e],[{...e,id:"2"}])).toHaveLength(1);
 });
 it("prevents circular hops",()=>{
  let s=enqueueHop(base(),{evidenceId:"1",clue:"agency",depth:1,branch:"behavior"});
  const taken=takeNextHop(s); s=taken.state;
  expect(enqueueHop(s,{evidenceId:"1",clue:"agency",depth:1,branch:"behavior"}).frontier).toHaveLength(0);
 });
 it("bounds depth",()=>expect(enqueueHop(base(),{evidenceId:"1",clue:"x",depth:4,branch:"x"}).frontier).toHaveLength(0));
 it("keeps contemporaneous chronology before retrospective evidence",()=>{
  const rows:PatternHopEvidence[]=[
   {id:"late",source:"chatgpt",evidenceType:"summary",content:"later",occurredAt:"2026-01-01",confidence:1,epistemicStatus:"retrospective"},
   {id:"early",source:"chatgpt",evidenceType:"user",content:"early",occurredAt:"2025-01-01",confidence:.8,epistemicStatus:"direct"}
  ];
  expect(rankEvidence(rows)[0].id).toBe("early");
 });
 it("does not confuse branch exhaustion with nonexistence",()=>{
  const s={...base(),exhaustedBranches:["phrase"]};
  expect(s.status).toBe("active");
  expect(s.exhaustedBranches).toContain("phrase");
 });
 it("requires all branches and empty frontier for parent completion",()=>{
  const s={...base(),completedBranches:["phrase"],exhaustedBranches:["code"]};
  expect(objectiveComplete(s,["phrase","code"])).toBe(true);
  expect(objectiveComplete(s,["phrase","code","chronology"])).toBe(false);
 });
});
