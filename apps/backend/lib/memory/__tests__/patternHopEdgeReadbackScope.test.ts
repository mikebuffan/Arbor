import { describe,expect,it,vi } from "vitest";
import { loadPatternHopEdges } from "../patternHopStore";

const opts={runId:"owned-run",userId:"owner",projectId:"project"};
const evidence=(id:string,changes:Record<string,unknown>={})=>({
  id,run_id:opts.runId,user_id:opts.userId,project_id:opts.projectId,
  metadata:{client_evidence_id:"source-"+id},...changes,
});
const edge=(to:string,changes:Record<string,unknown>={})=>({
  run_id:opts.runId,from_evidence_id:"a",to_evidence_id:to,
  originating_clue:"follow source",relationship:"cross_reference",
  hop_depth:1,confidence:.8,epistemic_status:"derived",
  rationale:"Synthetic canonical link",...changes,
});
function db(evidenceRows:unknown,edgeRows:unknown){
  const calls:Array<{table:string;filters:Array<[string,unknown]>}>=[];
  const from=vi.fn((table:string)=>{
    const filters:Array<[string,unknown]>=[];
    const q:any={};
    q.select=q.order=()=>q;
    q.eq=(key:string,value:unknown)=>{filters.push([key,value]);return q;};
    q.then=(resolve:(x:unknown)=>unknown)=>{
      calls.push({table,filters});
      return Promise.resolve({
        data:table==="arbor_pattern_hop_evidence"?evidenceRows:edgeRows,error:null,
      }).then(resolve);
    };
    return q;
  });
  return {supabase:{from} as never,calls,from};
}
describe("Pattern Hop restored edges only reference owned-run evidence",()=>{
  it("keeps scoped edges but drops wrong-run and unverified evidence endpoints",async()=>{
    const x=db([
      evidence("a"),evidence("b"),
      evidence("foreign",{user_id:"someone-else",metadata:{client_evidence_id:"SECRET-ID"}}),
      evidence("foreign-project",{project_id:"other"}),
      evidence("foreign-run",{run_id:"other"}),
    ],[
      edge("b"),
      edge("b",{from_evidence_id:null,originating_clue:"root"}),
      edge("b",{run_id:"different",rationale:"SECRET-RUN"}),
      edge("foreign",{rationale:"SECRET-TARGET"}),
      edge("b",{from_evidence_id:"foreign-project",rationale:"SECRET-PARENT"}),
      edge("b",{epistemic_status:"invalid",rationale:"SECRET-STATUS"}),
    ]);
    const result=await loadPatternHopEdges({...opts,supabase:x.supabase});
    expect(result.map(x=>x.toEvidenceId)).toEqual(["source-b","source-b"]);
    expect(result.map(x=>x.fromEvidenceId)).toEqual(["source-a",null]);
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(x.calls[0].filters).toContainEqual(["user_id",opts.userId]);
    expect(x.calls[0].filters).toContainEqual(["project_id",opts.projectId]);
    expect(x.calls[1].filters).toContainEqual(["run_id",opts.runId]);
  });
  it("does not read edges when no owned canonical evidence was found",async()=>{
    const x=db([evidence("foreign",{user_id:"someone-else"})],[edge("foreign")]);
    expect(await loadPatternHopEdges({...opts,supabase:x.supabase})).toEqual([]);
    expect(x.from).toHaveBeenCalledTimes(1);
  });
  it("fails closed on malformed endpoint collections",async()=>{
    const x=db({incorrect:true},[edge("a")]);
    expect(await loadPatternHopEdges({...opts,supabase:x.supabase})).toEqual([]);
  });
});
