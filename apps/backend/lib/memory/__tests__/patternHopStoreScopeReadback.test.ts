import { describe,expect,it,vi } from "vitest";
import { loadPatternHopRun,loadPatternHopEvidence,loadPatternHopEdges } from "../patternHopStore";

const runId="synthetic-run",userId="synthetic-owner",projectId="synthetic-project";
const scope={runId,userId,projectId};
const evidence=(id:string,override:Record<string,unknown>={})=>({
  id,run_id:runId,user_id:userId,project_id:projectId,source:"archive",
  source_thread_id:"thread",source_message_id:id,source_artifact_id:null,
  speaker:"user",evidence_type:"direct_user_statement",content:"Recovered owned evidence",
  occurred_at:"2026-10-08T12:00:00Z",chronology_rank:1,confidence:.9,
  epistemic_status:"direct",metadata:{client_evidence_id:id},...override,
});
const run=(override:Record<string,unknown>={})=>({
  id:runId,user_id:userId,project_id:projectId,conversation_id:"conversation",
  objective:"Resume the right objective",max_depth:6,frontier:[],visited:[],
  completed_branches:[],exhausted_branches:[],status:"active",blocker:null,
  seed:{clue:"legitimate"},verification_state:{},...override,
});
function mockDB(tableData: Record<string,unknown>){
  const filters: Array<{table:string,key:string,value:unknown}>=[];
  const from=vi.fn((table:string)=>{
    const q:any={};
    q.select=()=>q;
    q.eq=(key:string,value:unknown)=>{filters.push({table,key,value});return q;};
    q.order=()=>q;
    q.maybeSingle=async()=>({data:tableData[table],error:null});
    q.then=(fn:(result:unknown)=>unknown)=>Promise.resolve({
      data:tableData[table],error:null,
    }).then(fn);
    return q;
  });
  return {supabase:{from} as never,filters,from};
}
describe("Pattern Hop saved run and evidence returned-row scope",()=>{
  it("recovers a matching source run and rejects a misrouted foreign run",async()=>{
    const good=mockDB({arbor_pattern_hop_runs:run()});
    expect((await loadPatternHopRun({...scope,supabase:good.supabase}))?.id).toBe(runId);
    expect(good.filters).toContainEqual({table:"arbor_pattern_hop_runs",key:"user_id",value:userId});
    for(const data of [
      run({user_id:"foreign"}),run({project_id:"foreign"}),
      run({id:"another-run"}),null,
    ]){
      const bad=mockDB({arbor_pattern_hop_runs:data});
      expect(await loadPatternHopRun({...scope,supabase:bad.supabase})).toBeNull();
    }
  });
  it("admits only current run/owner/project saved evidence and no foreign text",async()=>{
    const db=mockDB({arbor_pattern_hop_evidence:[
      evidence("own"),
      evidence("foreign-owner",{user_id:"foreign",content:"SECRET-OWNER"}),
      evidence("foreign-project",{project_id:"foreign",content:"SECRET-PROJECT"}),
      evidence("foreign-run",{run_id:"foreign",content:"SECRET-RUN"}),
      evidence("invalid",{epistemic_status:"superverified",content:"SECRET-INVALID"}),
      evidence("unknown",{id:null,content:"SECRET-MALFORMED"}),
    ]});
    const rows=await loadPatternHopEvidence({...scope,supabase:db.supabase});
    expect(rows.map(x=>x.id)).toEqual(["own"]);
    expect(JSON.stringify(rows)).not.toContain("SECRET");
    expect(db.filters).toContainEqual({table:"arbor_pattern_hop_evidence",key:"run_id",value:runId});
  });
  it("returns no history for malformed provider collection",async()=>{
    const db=mockDB({arbor_pattern_hop_evidence:{content:"SECRET"}});
    expect(await loadPatternHopEvidence({...scope,supabase:db.supabase})).toEqual([]);
  });
  it.each([
    ["missing objective", {objective:null}],
    ["invalid depth", {max_depth:"not-a-depth"}],
    ["out of bounds depth", {max_depth:33}],
    ["fractional depth", {max_depth:1.5}],
    ["missing frontier", {frontier:null}],
    ["object frontier", {frontier:{evidenceId:"lost"}}],
    ["null frontier item", {frontier:[null]}],
    ["invalid frontier depth", {frontier:[{evidenceId:"seed",clue:"clue",depth:-1,branch:"direct"}]}],
    ["frontier exceeds budget", {frontier:[{evidenceId:"seed",clue:"clue",depth:7,branch:"direct"}]}],
    ["missing frontier identity", {frontier:[{clue:"clue",depth:0,branch:"direct"}]}],
    ["invalid visited entry", {visited:[{}]}],
    ["lost completed branches", {completed_branches:"direct"}],
    ["invalid exhausted branch", {exhausted_branches:[null]}],
    ["unknown status", {status:"finished"}],
    ["object blocker", {blocker:{message:"blocked"}}],
    ["malformed seed", {seed:[]}],
    ["malformed verification", {verification_state:[]}],
    ["malformed conversation", {conversation_id:{id:"conversation"}}],
  ])("rejects an owned checkpoint with %s before it can resume",async(_label,override)=>{
    const db=mockDB({arbor_pattern_hop_runs:run(override)});
    await expect(loadPatternHopRun({...scope,supabase:db.supabase}))
      .rejects.toThrow("pattern_hop_run_state_invalid");
  });
  it.each(["active","blocked","complete","exhausted"])("preserves a valid %s checkpoint exactly",async(status)=>{
    const frontier=[{evidenceId:"seed",clue:"saved clue",depth:2,branch:"direct>neighbor"}];
    const db=mockDB({arbor_pattern_hop_runs:run({status,frontier,visited:["saved-visit"],
      completed_branches:["completed"],exhausted_branches:["exhausted"],blocker:"saved blocker"})});
    const restored=await loadPatternHopRun({...scope,supabase:db.supabase});
    expect(restored?.state).toEqual({objective:"Resume the right objective",maxDepth:6,
      status,frontier,visited:["saved-visit"],completedBranches:["completed"],
      exhaustedBranches:["exhausted"],blocker:"saved blocker"});
  });

  it.each(["","  "])("uses the same source identity for evidence and links with blank legacy alias %j",async(alias)=>{
    const db=mockDB({arbor_pattern_hop_evidence:[evidence("db-source",{metadata:{client_evidence_id:alias}})],
      arbor_pattern_hop_edges:[{run_id:runId,from_evidence_id:null,to_evidence_id:"db-source",
        originating_clue:"clue",relationship:"direct_match",hop_depth:0,confidence:.9,
        epistemic_status:"direct",rationale:"saved link"}]});
    const sources=await loadPatternHopEvidence({...scope,supabase:db.supabase});
    const links=await loadPatternHopEdges({...scope,supabase:db.supabase});
    expect(sources.map(source=>source.id)).toEqual(["db-source"]);
    expect(links.map(link=>link.toEvidenceId)).toEqual(sources.map(source=>source.id));
  });

  it("stops the real research entry point before retrieval or writes on a damaged checkpoint",async()=>{
    const {runPatternHopResearch}=await import("../patternHopResearch");
    const db=mockDB({arbor_pattern_hop_runs:run({frontier:null})});
    await expect(runPatternHopResearch({...scope,supabase:db.supabase,seed:"legitimate",
      runControl:null})).rejects.toThrow("pattern_hop_run_state_invalid");
    expect(db.from.mock.calls.map(call=>call[0])).toEqual(["arbor_pattern_hop_runs"]);
  });

});
