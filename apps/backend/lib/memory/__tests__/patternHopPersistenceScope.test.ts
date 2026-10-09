import { describe, expect, it, vi } from "vitest";
import { persistPatternHopEvidence, persistPatternHopEdges } from "../patternHopStore";

const scope={runId:"run-1",userId:"owner-1",projectId:"project-1"};
const item={id:"client-1",source:"original_archive",sourceThreadId:"thread",
  sourceMessageId:"message-1",sourceArtifactId:"artifact",speaker:"user",
  evidenceType:"direct_user_statement",content:"Original sourced passage",
  confidence:.9,epistemicStatus:"direct" as const};
const stored={
  id:"db-1",run_id:scope.runId,user_id:scope.userId,project_id:scope.projectId,
  source:item.source,content:item.content,source_message_id:item.sourceMessageId,
};
function evidenceDB(existing: unknown, inserted: unknown=stored) {
  const scopes:Array<[string,unknown]>=[];
  const insert=vi.fn(()=>({select:vi.fn(()=>({single:vi.fn(async()=>({data:inserted,error:null}))}))}));
  const existingQuery:any={};
  existingQuery.select=()=>existingQuery;
  existingQuery.eq=(key:string,value:unknown)=>{scopes.push([key,value]);return existingQuery;};
  existingQuery.is=(key:string,value:unknown)=>{scopes.push([key,value]);return existingQuery;};
  existingQuery.maybeSingle=vi.fn(async()=>({data:existing,error:null}));
  const from=vi.fn(()=>({...existingQuery,insert}));
  return {supabase:{from} as never,insert,scopes};
}
describe("Pattern Hop idempotent persistence stays inside owned run",()=>{
  it("reuses only an independently scoped same-content existing receipt",async()=>{
    const db=evidenceDB(stored);
    const result=await persistPatternHopEvidence({...scope,supabase:db.supabase,evidence:[item]});
    expect([...result.entries()]).toEqual([["client-1","db-1"]]);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.scopes).toContainEqual(["user_id",scope.userId]);
    expect(db.scopes).toContainEqual(["project_id",scope.projectId]);
    expect(db.scopes).toContainEqual(["run_id",scope.runId]);
  });
  it.each([
    {...stored,user_id:"foreign"},
    {...stored,project_id:"foreign"},
    {...stored,run_id:"foreign"},
    {...stored,source:"forged"},
    {...stored,content:"FORGED"},
    {...stored,source_message_id:"foreign"},
    {...stored,id:null},
  ])("refuses mismatched existing evidence instead of reusing its ID",async receipt=>{
    const db=evidenceDB(receipt);
    await expect(persistPatternHopEvidence({...scope,supabase:db.supabase,evidence:[item]}))
      .rejects.toThrow("pattern_hop_evidence_existing_scope_invalid");
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("checks returned inserted identity before acknowledging persistence",async()=>{
    const db=evidenceDB(null,stored);
    const ids=await persistPatternHopEvidence({...scope,supabase:db.supabase,evidence:[item]});
    expect([...ids.values()]).toEqual(["db-1"]);
    expect(db.insert).toHaveBeenCalledTimes(1);
    const foreign=evidenceDB(null,{...stored,project_id:"foreign"});
    await expect(persistPatternHopEvidence({...scope,supabase:foreign.supabase,evidence:[item]}))
      .rejects.toThrow("pattern_hop_evidence_insert_scope_invalid");
  });
  it("rejects unresolved child or parent edges BEFORE any database query",async()=>{
    const from=vi.fn();
    const valid={fromEvidenceId:"client-a",toEvidenceId:"client-b",
      originatingClue:"checkpoint",relationship:"cross_reference",
      hopDepth:1,confidence:.8,epistemicStatus:"derived" as const,rationale:"source"};
    await expect(persistPatternHopEdges({supabase:{from} as never,
      runId:scope.runId,idMap:new Map([["client-a","db-a"]]),edges:[valid]}))
      .rejects.toThrow("pattern_hop_edge_unverified_endpoint");
    await expect(persistPatternHopEdges({supabase:{from} as never,
      runId:scope.runId,idMap:new Map([["client-b","db-b"]]),edges:[valid]}))
      .rejects.toThrow("pattern_hop_edge_unverified_endpoint");
    expect(from).not.toHaveBeenCalled();
  });
});
