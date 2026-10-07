import {describe,expect,it} from "vitest";
import {runBoundedAgencyTorture} from "../tortureAcceptance";
describe("agency torture acceptance model",()=>{
 it("continues through checkpoints and recoverable failure without duplicate side effects",()=>{
  const result=runBoundedAgencyTorture({completedSideEffects:["write:a"],steps:[
   {id:"a-replay",status:"checkpointed",attempt:2,sideEffectKey:"write:a"},
   {id:"b",status:"checkpointed",attempt:2,sideEffectKey:"write:b"},
   {id:"c",status:"failed",attempt:1,sideEffectKey:"write:c"},
   {id:"d",status:"queued",attempt:0,sideEffectKey:"write:d"}]});
  expect(result.complete).toBe(true);
  expect(result.skippedDuplicates).toEqual(["a-replay"]);
  expect(result.recoveredFailures).toEqual(["c"]);
  expect(result.executed).toEqual(["b","c","d"]);
 });
 it("does not spin on a still-running leased task",()=>{
  const result=runBoundedAgencyTorture({steps:[{id:"leased",status:"running",attempt:1,sideEffectKey:"x"}]});
  expect(result.complete).toBe(false); expect(result.nextAction).toBe("leased"); expect(result.executed).toEqual([]);
 });

it("runs a long bounded list across checkpointed, failed, duplicate and queued work without asking for another trigger",()=>{
  const steps=Array.from({length:24},(_,i)=>({
    id:`step-${i}`,
    status:(i===3?"checkpointed":i===8?"failed":"queued") as "queued"|"checkpointed"|"failed",
    attempt:i===8?1:0,
    sideEffectKey:i===12?"effect-2":`effect-${i}`,
  }));
  const result=runBoundedAgencyTorture({steps,completedSideEffects:["effect-2"],maxActions:64});
  expect(result.complete).toBe(true);
  expect(result.recoveredFailures).toContain("step-8");
  expect(result.skippedDuplicates).toContain("step-2");
  expect(result.skippedDuplicates).toContain("step-12");
  expect(result.nextAction).toBeNull();
});

it("never silently calls an exhausted failure complete",()=>{
  const result=runBoundedAgencyTorture({steps:[
    {id:"ok",status:"queued",attempt:0,sideEffectKey:"ok"},
    {id:"dead",status:"failed",attempt:3,sideEffectKey:"dead"},
    {id:"later",status:"queued",attempt:0,sideEffectKey:"later"},
  ]});
  expect(result.complete).toBe(false);
  expect(result.nextAction).toBe("dead");
  expect(result.exhaustedFailures).toEqual(["dead"]);
  expect(result.executed).not.toContain("later");
});

});
