import { beforeEach, describe, expect, it, vi } from "vitest";
import { readVerifiedCognitiveHost } from "../cognitiveHostRead";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertProjectOwnedByUser, assertConversationOwnedByUser } from "../../auth/ownership";
import { readArkProjectSnapshot } from "../../ark/readModel";
import { loadRuntimeState } from "../../arbor/runtime/runtimeStateStore";
vi.mock("../../auth/ownership",()=>({
  assertProjectOwnedByUser:vi.fn(),assertConversationOwnedByUser:vi.fn(),
}));
vi.mock("../../ark/readModel",()=>({readArkProjectSnapshot:vi.fn()}));
vi.mock("../../arbor/runtime/runtimeStateStore",()=>({loadRuntimeState:vi.fn()}));
const scope={authenticatedUserId:"owner-a",projectId:"project-a",conversationId:"conversation-a",turnId:"turn-a"};
const supabase={} as SupabaseClient;
const runtime=(overrides:Record<string,unknown>={})=>({
  schemaVersion:1,userId:scope.authenticatedUserId,projectId:scope.projectId,
  conversationId:scope.conversationId,channel:"text",activeSubsystem:"arbor",
  currentGoal:"Finish",lastMeaningfulUserTurn:"Continue",lastMeaningfulArborTurn:"Working",
  agency:{goal:"Finish",unresolvedWork:["Build tests"]},corrections:[{kind:"behavior",value:"Continue safely"}],
  ...overrides,
});
const args=()=>({...scope,supabase,mode:"text" as const});
beforeEach(()=>{
 vi.resetAllMocks();
 vi.mocked(readArkProjectSnapshot).mockResolvedValue({available:true,objectives:[{id:"obj"}],tasks:[{id:"task"}],checkpoints:[],events:[],capturedAt:"2026-09-23T00:00:00Z"});
 vi.mocked(loadRuntimeState).mockResolvedValue(runtime() as never);
});
describe("auth-scoped Firefly cognitive host read (no Grove token, no action)",()=>{
 it("requires all IDs before ownership query and does not invent a user",async()=>{
  await expect(readVerifiedCognitiveHost({...args(),conversationId:" "}))
   .rejects.toThrow("cognitive_host_read_scope_required");
  expect(assertProjectOwnedByUser).not.toHaveBeenCalled();
  expect(readArkProjectSnapshot).not.toHaveBeenCalled();
 });
 it("asserts project AND conversation ownership before any ARK or continuity read",async()=>{
  vi.mocked(assertConversationOwnedByUser).mockRejectedValueOnce(new Error("not permitted"));
  await expect(readVerifiedCognitiveHost(args())).rejects.toThrow("not permitted");
  expect(assertProjectOwnedByUser).toHaveBeenCalledWith(supabase,scope.authenticatedUserId,scope.projectId);
  expect(assertConversationOwnedByUser).toHaveBeenCalledWith({supabase,
   userId:scope.authenticatedUserId,projectId:scope.projectId,conversationId:scope.conversationId});
  expect(loadRuntimeState).not.toHaveBeenCalled();
  expect(readArkProjectSnapshot).not.toHaveBeenCalled();
 });
 it("projects owner-scoped current conversation continuity with advisory ARK counts",async()=>{
  const view=await readVerifiedCognitiveHost(args());
  expect(view.host).toEqual({userId:scope.authenticatedUserId,projectId:scope.projectId,
   conversationId:scope.conversationId,turnId:scope.turnId});
  expect(view.continuity?.state.currentGoal).toBe("Finish");
  expect(view.continuity?.state.unresolvedWork).toEqual(["Build tests"]);
  expect(view.continuity?.state.activeCorrections).toContain("Continue safely");
  expect(view.ark.objectiveCountInWindow).toBe(1);
  expect(view.ark.completionVerified).toBe(false);
  expect(view.grantsExecution).toBe(false);
 });
 it("preserves a legacy runtime goal when agency JSON is absent",async()=>{
  vi.mocked(loadRuntimeState).mockResolvedValue(runtime({agency:null,currentGoal:"Legacy existing goal"}) as never);
  const view=await readVerifiedCognitiveHost(args());
  expect(view.continuity?.state.currentGoal).toBe("Legacy existing goal");
  expect(view.continuity?.state.unresolvedWork).toEqual([]);
 });
 it("does not silently treat loadRuntimeState's OTHER-conversation fallback as current",async()=>{
  vi.mocked(loadRuntimeState).mockResolvedValue(runtime({conversationId:"other-conversation",currentGoal:"Someone else's conversation"}) as never);
  const view=await readVerifiedCognitiveHost(args());
  expect(view.continuity).toBeNull();
  expect(view.ark.available).toBe(true);
 });
 it("rejects corrupt foreign runtime scope despite prior successful owner check",async()=>{
  vi.mocked(loadRuntimeState).mockResolvedValue(runtime({userId:"another-user"}) as never);
  await expect(readVerifiedCognitiveHost(args()))
   .rejects.toThrow("cognitive_host_continuity_scope_invalid");
 });
 it("missing ARK remains explicitly unavailable and voice changes channel only",async()=>{
  vi.mocked(readArkProjectSnapshot).mockResolvedValue({available:false,objectives:[],tasks:[],checkpoints:[],events:[],capturedAt:"2026-09-23T00:00:00Z"});
  const view=await readVerifiedCognitiveHost({...args(),mode:"voice"});
  expect(view.continuity?.state.channel).toBe("voice");
  expect(view.ark.available).toBe(false);
  expect(view.ark.liveExecutionVerified).toBe(false);
  expect(view.ark.completionVerified).toBe(false);
 });
});