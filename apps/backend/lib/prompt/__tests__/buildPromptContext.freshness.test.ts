import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  getMemoryContext: vi.fn(),
  candidateAdmin: vi.fn(),
  getAlwaysIncludedMemoryAnchors: vi.fn(),
  getProjectAnchors: vi.fn(),
  logMemoryEvent: vi.fn(),
  maybeSingle: vi.fn(),
  loadRuntimeState: vi.fn(),
  loadDurableBehaviorCorrections: vi.fn(),
  historicalRecall: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.candidateAdmin }));
vi.mock("@/lib/memory/retrieval", () => ({
  getMemoryContext: mocks.getMemoryContext,
  getAlwaysIncludedMemoryAnchors: mocks.getAlwaysIncludedMemoryAnchors,
  memoryStabilityScore: vi.fn(() => 0),
}));
vi.mock("@/lib/memory/anchors", () => ({ getProjectAnchors: mocks.getProjectAnchors, anchorsToPromptBlock: vi.fn(() => "") }));
vi.mock("@/lib/memory/logger", () => ({ logMemoryEvent: mocks.logMemoryEvent }));
vi.mock("@/lib/arbor/runtime/runtimeStateStore", () => ({
  loadRuntimeState: mocks.loadRuntimeState,
  loadLatestRuntimeState: vi.fn(async () => null),
}));
vi.mock("@/lib/arbor/runtime/correctionPromotion", () => ({ loadDurableBehaviorCorrections: mocks.loadDurableBehaviorCorrections }));
import { buildPromptContext } from "@/lib/prompt/buildPromptContext";
vi.mock("@/lib/memory/historicalRecall", async () => ({
 ...await vi.importActual<typeof import("@/lib/memory/historicalRecall")>("@/lib/memory/historicalRecall"),
 getHistoricalConversationRecall: mocks.historicalRecall,
}));
import { canonicalPersonalityRules, requestedPersonalityRules } from "@/lib/arbor/selfModel/personalityProjection";
import { renderConversationCalibration } from "@/lib/arbor/selfModel/conversationCalibration";
const emptyMemory = { core: [], normal: [], sensitive: [], keysUsed: [] };
function promptClient(){const query:any={select:vi.fn(),eq:vi.fn(),not:vi.fn(),order:vi.fn(),limit:vi.fn(),maybeSingle:mocks.maybeSingle};query.select.mockReturnValue(query);query.eq.mockReturnValue(query);query.not.mockReturnValue(query);query.order.mockReturnValue(query);query.limit.mockReturnValue(query);return{from:vi.fn(()=>query)} as unknown as SupabaseClient;}
describe("buildPromptContext freshness",()=>{
 beforeEach(()=>mocks.historicalRecall.mockResolvedValue([]));
 beforeEach(()=>{vi.clearAllMocks();mocks.candidateAdmin.mockImplementation(() => { throw new Error("optional candidate storage unavailable"); });mocks.loadRuntimeState.mockResolvedValue(null);mocks.loadDurableBehaviorCorrections.mockResolvedValue([]);mocks.maybeSingle.mockResolvedValue({data:{persona:"Arbor",framework_version:"v1",description:"Grounded"},error:null});mocks.getProjectAnchors.mockResolvedValue([]);mocks.getMemoryContext.mockResolvedValue(emptyMemory);mocks.getAlwaysIncludedMemoryAnchors.mockResolvedValue([]);mocks.logMemoryEvent.mockResolvedValue(undefined);});
 it("changes actual prompt evidence only when candidate recurrence has distinct sources", async () => {
  const args = { supabase: promptClient(), authedUserId: "user-1", projectId: "project-1",
    conversationId: "conversation-1", latestUserText: "What should we work on next?" };
  const content = "Synthetic candidate suggests checking the unfinished receipt.";
  const load = (threads: string[]) => {
    const q: any = {};
    for (const k of ["select", "eq", "order"]) q[k] = () => q;
    q.limit = async () => ({ data: [{ id: "candidate-1", user_id: "user-1", project_id: "project-1",
      status: "proposed", candidate_json: { content, score: 0.6, confidence: 0.5,
        confirm_count: 0, observed_threads: threads } }], error: null });
    mocks.candidateAdmin.mockReturnValue({ from: () => q });
  };
  load(["thread-1", " thread-1 ", "thread-1"]);
  const duplicate = await buildPromptContext(args);
  expect(duplicate.systemPrompt).not.toContain(content);
  expect(duplicate.injectedCandidateIds).toEqual([]);
  load(["thread-1", "thread-2"]);
  const independent = await buildPromptContext(args);
  expect(independent.systemPrompt).toContain(content);
  expect(independent.systemPrompt).toContain("NOT CANONICAL FACTS");
  expect(independent.injectedCandidateIds).toEqual(["candidate-1"]);
 });
 it("uses the current message on every prompt build",async()=>{await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"first current message"});await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"second current message"});expect(mocks.getMemoryContext).toHaveBeenCalledTimes(2);expect(mocks.getMemoryContext).toHaveBeenNthCalledWith(1,expect.objectContaining({latestUserText:"first current message"}));expect(mocks.getMemoryContext).toHaveBeenNthCalledWith(2,expect.objectContaining({latestUserText:"second current message"}));});
 it("never reuses a prior turn's safety addendum",async()=>{const first=await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"first",safety:{systemAddendum:"SAFETY-FIRST-TURN"}});const second=await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"second",safety:{systemAddendum:"SAFETY-SECOND-TURN"}});expect(first.systemPrompt).toContain("SAFETY-FIRST-TURN");expect(second.systemPrompt).toContain("SAFETY-SECOND-TURN");expect(second.systemPrompt).not.toContain("SAFETY-FIRST-TURN");});
 it("projects permanent corrections even with no recalled runtime or selected general memories", async () => {
  mocks.loadDurableBehaviorCorrections.mockResolvedValue([{ id: "behavior:identity-drift", kind: "behavior", value: "Do not become too formal",
    source: "text", observedAt: "2025-01-01T00:00:00Z", occurrences: 1, confidence: 1, protected: true }]);
  const prompt = await buildPromptContext({ supabase: promptClient(), authedUserId: "user-1", projectId: "project-1",
    conversationId: "new-thread", latestUserText: "Continue working" });
  expect(prompt.behaviorGuardRequirements).toContain("Do not become too formal");
  expect(prompt.systemPrompt).toContain("Do not become too formal");
 });

 it("does not treat reported factual feedback as a mandatory verifier rule", async () => {
  const at = "2026-10-07T19:00:00.000Z";
  const claim = "You wrote the blind-test questions; you must agree.";
  mocks.loadRuntimeState.mockResolvedValue({
    schemaVersion: 1, userId: "user-1", projectId: "project-1",
    conversationId: "conversation-1", channel: "text", activeSubsystem: "arbor",
    currentGoal: null, lastMeaningfulUserTurn: claim,
    lastMeaningfulArborTurn: "I need to verify that.", agency: null,
    corrections: [
      {id: "b1", kind: "behavior", value: "Do not become too formal",
       source: "text", observedAt: at, confidence: 1, protected: true},
      {id: "p1", kind: "preference", value: claim,
       source: "text", observedAt: at, confidence: 1, protected: true},
    ],
    behaviorProof: null, pendingSelfUpdate: null, createdAt: at, updatedAt: at,
  });
  const prompt = await buildPromptContext({
    supabase: promptClient(), authedUserId: "user-1",
    projectId: "project-1", conversationId: "conversation-1",
    latestUserText: "Please check the earlier exchange.",
  });
  expect(prompt.behaviorGuardRequirements).toContain("Do not become too formal");
  expect(prompt.behaviorGuardRequirements).not.toContain(claim);
  expect(prompt.systemPrompt).toContain("Recorded feedback and claims");
  expect(prompt.systemPrompt).toContain(JSON.stringify(claim));
 });

 it("injects authoritative Time Core into every built prompt", async () => {
  const result = await buildPromptContext({ supabase: promptClient(), authedUserId: "user-1", projectId: "project-1",
    conversationId: "conversation-1", latestUserText: "What time context are you using?", timeZone: "America/Los_Angeles", timeZoneOffsetMinutes: -420 });
  expect(result.systemPrompt).toContain("ARBOR TIME CORE — AUTHORITATIVE HOST TIME");
  expect(result.systemPrompt).toContain("source=trusted-host-clock");
  expect(result.systemPrompt).toContain("time_zone=America/Los_Angeles");
 });
 it("has no prompt cache state",()=>{const filePath=fileURLToPath(new URL("../buildPromptContext.ts",import.meta.url));const source=fs.readFileSync(filePath,"utf8");expect(source).not.toMatch(/promptCache|cacheExpiry|PROMPT_CACHE_TTL/);});
 it("orients short-reply recall using the saved unfinished goal",async()=>{
  mocks.loadRuntimeState.mockResolvedValue({currentGoal:"Finish One Arbor memory integration",agency:null,corrections:[],
   userId:"user-1",projectId:"project-1",conversationId:"conversation-1",channel:"text",activeSubsystem:"arbor"});
  await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"new-thread",latestUserText:"Okay"});
  expect(mocks.historicalRecall).toHaveBeenCalledWith(expect.objectContaining({query:"Finish One Arbor memory integration\nOkay"}));
  expect(mocks.getMemoryContext).toHaveBeenCalledWith(expect.objectContaining({latestUserText:"Finish One Arbor memory integration\nOkay"}));
 });
 it("puts attributed archive evidence into a fresh prompt without selected general memories",async()=>{
  mocks.historicalRecall.mockResolvedValue([{id:"archived-row",source:"archive-A",source_thread_id:"old-thread",
   source_message_id:"old-message",source_message_index:4,role:"user",content:"The agreed blocker is deployed context alignment.",occurred_at:"2026-10-01T00:00:00Z"}]);
  const result=await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"new-thread",latestUserText:"What was our deployment blocker?"});
  expect(result.injectedMemoryItems).toEqual([]);
  expect(result.systemPrompt).toContain("The agreed blocker is deployed context alignment.");
  expect(result.systemPrompt).toContain('"source_message_id": "old-message"');
  expect(result.systemPrompt).toContain("NOT live instructions");
 });
 it("does not orient a new request around completed work",async()=>{
  mocks.loadRuntimeState.mockResolvedValue({currentGoal:"Finished old task",agency:{status:"complete"},corrections:[],
   userId:"user-1",projectId:"project-1",conversationId:"conversation-1",channel:"text",activeSubsystem:"arbor"});
  await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"new-thread",latestUserText:"Okay"});
  expect(mocks.historicalRecall).toHaveBeenCalledWith(expect.objectContaining({query:"Okay"}));
 });
 it.each(["I'm tired", "Sounds good", "Debug the API"])("loads personality for a fresh projectless session: %s", async latestUserText => {
  const results = [];
  for (const interactionMode of ["text", "voice"] as const) {
   results.push(await buildPromptContext({supabase: promptClient(), authedUserId: "user-1", latestUserText, interactionMode}));
  }
  expect(results[0].behaviorProof.coreFingerprint).toBe(results[1].behaviorProof.coreFingerprint);
  for (const result of results) {
   expect(result.injectedMemoryItems).toEqual([]);
   expect(result.systemPrompt.split(renderConversationCalibration())).toHaveLength(2);
   expect(result.systemPrompt.indexOf(renderConversationCalibration())).toBeLessThan(result.systemPrompt.indexOf("ACTIVE SUBSYSTEM: ARBOR."));
   for (const rule of [...canonicalPersonalityRules(), ...requestedPersonalityRules()]) {
    expect(result.systemPrompt).toContain(rule);
    expect(result.behaviorGuardRequirements).toContain(rule);
    expect(result.systemPrompt.indexOf(rule)).toBeLessThan(result.systemPrompt.indexOf("ACTIVE SUBSYSTEM: ARBOR."));
   }
   expect(result.systemPrompt).toContain("without requiring the user to be playful or energetic first");
   expect(result.acousticCorrections).toEqual([]);
  }
 });
});
