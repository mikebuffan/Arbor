import{describe,expect,it}from"vitest";
import{acquirePatternHopLease,checkpointPatternHop,stopPatternHop,type PatternHopLease}from"../patternHopLease";

describe("pattern hop lease",()=>{
 it("prevents concurrent runs and honors durable stop",()=>{
  let l:PatternHopLease={runId:"a",holder:"w1",leaseUntil:100,stopped:false,checkpoint:null};
  expect(acquirePatternHopLease(l,{runId:"b",holder:"w2",now:50,ttlMs:100}).allowed).toBe(false);
  l=stopPatternHop(l);
  expect(acquirePatternHopLease(l,{runId:"b",holder:"w2",now:150,ttlMs:100}).reason).toBe("stopped");
  expect(()=>checkpointPatternHop(l,"x")).toThrow();
 });
 it("allows a new holder only after the prior lease expires",()=>{
  const l:PatternHopLease={runId:"a",holder:"w1",leaseUntil:100,stopped:false,checkpoint:null};
  const r=acquirePatternHopLease(l,{runId:"b",holder:"w2",now:101,ttlMs:50});
  expect(r.allowed).toBe(true);
  expect(r.reason).toBe("acquired");
  expect(r.lease.holder).toBe("w2");
 });
});
