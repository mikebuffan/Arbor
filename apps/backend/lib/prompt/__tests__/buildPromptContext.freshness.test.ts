import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  getMemoryContext: vi.fn(),
  getAlwaysIncludedMemoryAnchors: vi.fn(),
  getProjectAnchors: vi.fn(),
  logMemoryEvent: vi.fn(),
  maybeSingle: vi.fn(),
  loadRuntimeState: vi.fn(),
  loadDurableBehaviorCorrections: vi.fn(),
}));

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
import { canonicalPersonalityRules, requestedPersonalityRules } from "@/lib/arbor/selfModel/personalityProjection";
const emptyMemory = { core: [], normal: [], sensitive: [], keysUsed: [] };
function promptClient(){const query:any={select:vi.fn(),eq:vi.fn(),not:vi.fn(),order:vi.fn(),limit:vi.fn(),maybeSingle:mocks.maybeSingle};query.select.mockReturnValue(query);query.eq.mockReturnValue(query);query.not.mockReturnValue(query);query.order.mockReturnValue(query);query.limit.mockReturnValue(query);return{from:vi.fn(()=>query)} as unknown as SupabaseClient;}
describe("buildPromptContext freshness",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.loadRuntimeState.mockResolvedValue(null);mocks.loadDurableBehaviorCorrections.mockResolvedValue([]);mocks.maybeSingle.mockResolvedValue({data:{persona:"Arbor",framework_version:"v1",description:"Grounded"},error:null});mocks.getProjectAnchors.mockResolvedValue([]);mocks.getMemoryContext.mockResolvedValue(emptyMemory);mocks.getAlwaysIncludedMemoryAnchors.mockResolvedValue([]);mocks.logMemoryEvent.mockResolvedValue(undefined);});
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
 it("has no prompt cache state",()=>{const filePath=fileURLToPath(new URL("../buildPromptContext.ts",import.meta.url));const source=fs.readFileSync(filePath,"utf8");expect(source).not.toMatch(/promptCache|cacheExpiry|PROMPT_CACHE_TTL/);});
 it.each(["I'm tired", "Sounds good", "Debug the API"])("loads personality for a fresh projectless session: %s", async latestUserText => {
  const results = [];
  for (const interactionMode of ["text", "voice"] as const) {
   results.push(await buildPromptContext({supabase: promptClient(), authedUserId: "user-1", latestUserText, interactionMode}));
  }
  expect(results[0].behaviorProof.coreFingerprint).toBe(results[1].behaviorProof.coreFingerprint);
  for (const result of results) {
   expect(result.injectedMemoryItems).toEqual([]);
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
