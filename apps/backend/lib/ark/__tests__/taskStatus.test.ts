import {describe,expect,it} from "vitest";
import {arkTaskReadbackFlags} from "../taskStatus";
describe("ARK durable readback status distinction",()=>{
 it("never conflates queued running checkpointed or blocked with completion",()=>{
  for(const status of ["queued","running","checkpointed","blocked"])
   expect(arkTaskReadbackFlags(status)).toEqual({terminal:false,completed:false});
 });
 it("marks completed separately from failed and cancelled terminal states",()=>{
  expect(arkTaskReadbackFlags("completed")).toEqual({terminal:true,completed:true});
  expect(arkTaskReadbackFlags("failed")).toEqual({terminal:true,completed:false});
  expect(arkTaskReadbackFlags("cancelled")).toEqual({terminal:true,completed:false});
 });
});
