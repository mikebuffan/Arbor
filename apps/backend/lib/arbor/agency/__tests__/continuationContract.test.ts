import { describe, expect, it } from "vitest";
import { agencyContinuationDisposition, internalCheckpointResponse } from "../continuationContract";

describe("One Arbor continuation contract", () => {
  it("does not return control for an ordinary checkpoint", () => {
    expect(agencyContinuationDisposition({
      status:"checkpointed", unresolvedWork:["step two"], blocker:null,
    })).toEqual({returnToUser:false,reason:"resume_durable_work"});
  });
  it("does not stop after an intermediate success with unresolved work", () => {
    expect(agencyContinuationDisposition({
      status:"active", unresolvedWork:["verify result","continue parent goal"], blocker:null,
    }).returnToUser).toBe(false);
  });
  it("returns only for verified completion or a real boundary", () => {
    expect(agencyContinuationDisposition({status:"complete",unresolvedWork:[],blocker:null}).returnToUser).toBe(true);
    expect(agencyContinuationDisposition({status:"blocked",unresolvedWork:["approval"],blocker:"irreversible_action"}).returnToUser).toBe(true);
  });
  it("never turns an internal checkpoint into assistant prose", () => {
    expect(internalCheckpointResponse({projectId:"p",conversationId:"c"})).toEqual({
      ok:true, projectId:"p", conversationId:"c", status:"continuing", assistantText:"",
    });
  });

});
