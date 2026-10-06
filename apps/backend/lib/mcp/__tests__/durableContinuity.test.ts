import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({context:vi.fn(),project:vi.fn(),conversation:vi.fn(),runtime:vi.fn(),durable:vi.fn()}));
vi.mock("@/lib/mcp/context",()=>({arkMcpUserContext:mocks.context}));
vi.mock("@/lib/auth/ownership",()=>({assertProjectOwnedByUser:mocks.project,assertConversationOwnedByUser:mocks.conversation}));
vi.mock("@/lib/arbor/runtime/runtimeStateStore",()=>({loadLatestRuntimeState:mocks.runtime,loadRuntimeState:mocks.runtime}));
vi.mock("@/lib/arbor/runtime/correctionPromotion",()=>({loadDurableBehaviorCorrections:mocks.durable}));
import { registerArkReadTools } from "../registerArkReadTools";
import { createCorrection } from "@/lib/arbor/runtime/corrections";
import { renderCanonicalIdentityAnchor } from "@/lib/arbor/selfModel/canonicalIdentityAnchor";

const userId="owner",projectId="project",supabase={};
const correction=(hour:string,text="Do not become too formal")=>createCorrection({kind:"behavior",source:"text",
 observedAt:"2026-10-02T"+hour+":00:00Z",value:text});
function callback() {
 const registerTool=vi.fn();registerArkReadTools({registerTool} as never);
 return registerTool.mock.calls.find(c=>c[0]==="get_arbor_continuity")![2];
}
beforeEach(()=>{
 vi.clearAllMocks();mocks.context.mockReturnValue({userId,supabase});
 mocks.project.mockResolvedValue(undefined);mocks.conversation.mockResolvedValue(undefined);
 mocks.runtime.mockResolvedValue(null);mocks.durable.mockResolvedValue([correction("12")]);
});
describe("canonical permanent corrections in ARK continuity",()=>{
 it("returns permanent guards without manufacturing a missing conversation",async()=>{
  const result=await callback()({projectId},{});
  expect(result.structuredContent).toMatchObject({available:false,conversationId:null,surface:null,authority:null,
   currentGoal:null,updatedAt:null,behavioralCorrections:["Do not become too formal"],acousticCorrections:[]});
  expect(result.structuredContent.continuityPrompt).toContain("Do not become too formal");
  expect(result.structuredContent.identityAnchor).toBe(renderCanonicalIdentityAnchor());
  expect(mocks.durable).toHaveBeenCalledWith({supabase,userId});
 });
 it("merges durable and recent observations chronologically using the shared host projection",async()=>{
  mocks.runtime.mockResolvedValue({
   schemaVersion:1,userId,projectId,conversationId:"conversation",channel:"text",activeSubsystem:"arbor",
   currentGoal:"Continue One Arbor",lastMeaningfulUserTurn:"continue",lastMeaningfulArborTurn:"Working",
   agency:null,corrections:[correction("11","You have drifted; come back")],
   behaviorProof:null,pendingSelfUpdate:null,createdAt:"2026-10-02T10:00:00Z",updatedAt:"2026-10-02T11:00:00Z",
  });
  const result=await callback()({projectId},{});
  expect(result.structuredContent.available).toBe(true);
  expect(result.structuredContent.identityAnchor).toBe(renderCanonicalIdentityAnchor());
  expect(result.structuredContent.behavioralCorrections).toEqual(["Do not become too formal"]);
  expect(result.structuredContent.continuityPrompt).toContain("Do not become too formal");
  expect(result.structuredContent.continuityPrompt).not.toContain("You have drifted");
 });
 it("keeps newer runtime corrections and acoustic rendering separate",async()=>{
  mocks.runtime.mockResolvedValue({
   schemaVersion:1,userId,projectId,conversationId:"conversation",channel:"voice",activeSubsystem:"arbor",
   currentGoal:null,lastMeaningfulUserTurn:"continue",lastMeaningfulArborTurn:"Working",agency:null,
   corrections:[correction("13","You have drifted; come back"),createCorrection({kind:"acoustic",source:"voice",
    value:"Your accent sounds British",observedAt:"2026-10-02T13:00:00Z"})],
   behaviorProof:null,pendingSelfUpdate:null,createdAt:"2026-10-02T10:00:00Z",updatedAt:"2026-10-02T13:00:00Z",
  });
  const result=await callback()({projectId},{});
  expect(result.structuredContent.behavioralCorrections).toEqual(["You have drifted; come back"]);
  expect(result.structuredContent.acousticCorrections).toEqual(["Your accent sounds British"]);
  expect(result.structuredContent.identityAnchor).toBe(renderCanonicalIdentityAnchor());
  expect(result.structuredContent.identityAnchor).not.toContain("Your accent sounds British");
 });
 it("retains owner/conversation denial before attempting permanent recall",async()=>{
  mocks.conversation.mockRejectedValue(new Error("foreign_conversation"));
  await expect(callback()({projectId,conversationId:"foreign"},{})).rejects.toThrow("foreign_conversation");
  expect(mocks.durable).not.toHaveBeenCalled();
 });
 it("propagates failed durable recall rather than reporting empty rules",async()=>{
  mocks.durable.mockRejectedValue({code:"42501"});
  await expect(callback()({projectId},{})).rejects.toEqual({code:"42501"});
 });
 it("returns the personality baseline even with no history or permanent corrections",async()=>{
  mocks.durable.mockResolvedValue([]);
  const result=await callback()({projectId},{});
  expect(result.structuredContent).toMatchObject({available:false,continuityPrompt:null,currentGoal:null,
   behavioralCorrections:[],acousticCorrections:[],identityAnchor:renderCanonicalIdentityAnchor()});
  expect(result.structuredContent.identityAnchor).toContain("dry, situational, callback-heavy");
 });
});
