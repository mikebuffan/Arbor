import {describe,expect,it} from "vitest";
import {assertArkObjectiveTransition,assertArkTaskTransition} from "../stateMachine";

describe("ARK STOP transition semantics",()=>{
 it("allows every unfinished objective to enter terminal cancelled state",()=>{
  for(const status of ["queued","running","checkpointed","blocked","awaiting_verification","failed"] as const)
   expect(()=>assertArkObjectiveTransition(status,"cancelled")).not.toThrow();
 });
 it("allows every unfinished task to enter terminal cancelled state",()=>{
  for(const status of ["queued","running","checkpointed","blocked","failed"] as const)
   expect(()=>assertArkTaskTransition(status,"cancelled")).not.toThrow();
 });
 it("never resumes cancelled work or rewrites completed work as cancelled",()=>{
  expect(()=>assertArkObjectiveTransition("cancelled","running")).toThrow("invalid_objective_transition");
  expect(()=>assertArkTaskTransition("cancelled","queued")).toThrow("invalid_task_transition");
  expect(()=>assertArkObjectiveTransition("completed","cancelled")).toThrow("invalid_objective_transition");
  expect(()=>assertArkTaskTransition("completed","cancelled")).toThrow("invalid_task_transition");
 });
});
