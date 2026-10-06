import {describe,expect,it,vi} from "vitest";
import {
  claimPatternHopRun, heartbeatPatternHopRun, releasePatternHopRun,
  requestPatternHopStop, resumePatternHopRun,
} from "../patternHopRunControl";

function client(responses: Record<string, unknown>) {
  return {
    rpc: vi.fn(async (name:string) => ({
      data: responses[name] ?? null,
      error: null,
    })),
  } as any;
}
const base={runId:"11111111-1111-4111-8111-111111111111",
  userId:"22222222-2222-4222-8222-222222222222",
  projectId:"33333333-3333-4333-8333-333333333333"};

describe("Pattern Hop durable run control client",()=>{
  it("claims one bounded lease and preserves its DB-issued token",async()=>{
    const db=client({arbor_pattern_hop_claim_run:{status:"claimed",leaseToken:"44444444-4444-4444-8444-444444444444"}});
    const result=await claimPatternHopRun({...base,supabase:db,workerId:"worker-1",leaseMs:90000});
    expect(result).toEqual({status:"claimed",lease:{workerId:"worker-1",
      leaseToken:"44444444-4444-4444-8444-444444444444",leaseMs:90000}});
    expect(db.rpc).toHaveBeenCalledWith("arbor_pattern_hop_claim_run",expect.objectContaining({
      p_run_id:base.runId,p_user_id:base.userId,p_project_id:base.projectId,p_worker_id:"worker-1",p_lease_ms:90000,
    }));
  });
  it.each(["stopped","in_progress"] as const)("preserves claim status %s",async status=>{
    const db=client({arbor_pattern_hop_claim_run:{status}});
    expect(await claimPatternHopRun({...base,supabase:db,workerId:"worker"})).toEqual({status});
  });
  it("turns stale heartbeat into a lease-lost error",async()=>{
    const db=client({arbor_pattern_hop_heartbeat_run:{status:"stale"}});
    await expect(heartbeatPatternHopRun({...base,supabase:db,lease:{
      workerId:"worker",leaseToken:"44444444-4444-4444-8444-444444444444",leaseMs:90000,
    }})).rejects.toThrow("lease_lost");
  });
  it("accepts stop, resume and idempotent terminal control replies",async()=>{
    const stopDb=client({arbor_pattern_hop_request_stop:"already_stopped"});
    expect(await requestPatternHopStop({...base,supabase:stopDb})).toBe("already_stopped");
    const resumeDb=client({arbor_pattern_hop_resume_run:"resumed"});
    expect(await resumePatternHopRun({...base,supabase:resumeDb})).toBe("resumed");
    const releaseDb=client({arbor_pattern_hop_release_run:"stale"});
    await expect(releasePatternHopRun({...base,supabase:releaseDb,lease:{
      workerId:"worker",leaseToken:"44444444-4444-4444-8444-444444444444",leaseMs:90000,
    }})).resolves.toBeUndefined();
  });
  it("refuses resume while a current traversal lease is active",async()=>{
    const db=client({arbor_pattern_hop_resume_run:"in_progress"});
    await expect(resumePatternHopRun({...base,supabase:db})).rejects.toThrow("run_in_progress");
  });
});
