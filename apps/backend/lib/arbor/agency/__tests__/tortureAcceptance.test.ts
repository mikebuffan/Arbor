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
});
