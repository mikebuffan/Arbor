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
  beginRuntimeSession: vi.fn(),
}));

vi.mock("@/lib/memory/retrieval", () => ({
  getMemoryContext: mocks.getMemoryContext,
  getAlwaysIncludedMemoryAnchors: mocks.getAlwaysIncludedMemoryAnchors,
  memoryStabilityScore: vi.fn(() => 0),
}));
vi.mock("@/lib/memory/anchors", () => ({ getProjectAnchors: mocks.getProjectAnchors, anchorsToPromptBlock: vi.fn(() => "") }));
vi.mock("@/lib/memory/logger", () => ({ logMemoryEvent: mocks.logMemoryEvent }));
vi.mock("@/lib/arbor/runtime/runtimeSession", () => ({ beginRuntimeSession: mocks.beginRuntimeSession }));
import { buildPromptContext } from "@/lib/prompt/buildPromptContext";
const emptyMemory = { core: [], normal: [], sensitive: [], keysUsed: [] };
function promptClient(){const query:any={select:vi.fn(),eq:vi.fn(),not:vi.fn(),order:vi.fn(),limit:vi.fn(),maybeSingle:mocks.maybeSingle};query.select.mockReturnValue(query);query.eq.mockReturnValue(query);query.not.mockReturnValue(query);query.order.mockReturnValue(query);query.limit.mockReturnValue(query);return{from:vi.fn(()=>query)} as unknown as SupabaseClient;}
describe("buildPromptContext freshness",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.maybeSingle.mockResolvedValue({data:{persona:"Arbor",framework_version:"v1",description:"Grounded"},error:null});mocks.getProjectAnchors.mockResolvedValue([]);mocks.getMemoryContext.mockResolvedValue(emptyMemory);mocks.getAlwaysIncludedMemoryAnchors.mockResolvedValue([]);mocks.logMemoryEvent.mockResolvedValue(undefined);});
 it("uses the current message on every prompt build",async()=>{await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"first current message"});await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"second current message"});expect(mocks.getMemoryContext).toHaveBeenCalledTimes(2);expect(mocks.getMemoryContext).toHaveBeenNthCalledWith(1,expect.objectContaining({latestUserText:"first current message"}));expect(mocks.getMemoryContext).toHaveBeenNthCalledWith(2,expect.objectContaining({latestUserText:"second current message"}));});
 it("never reuses a prior turn's safety addendum",async()=>{const first=await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"first",safety:{systemAddendum:"SAFETY-FIRST-TURN"}});const second=await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:"second",safety:{systemAddendum:"SAFETY-SECOND-TURN"}});expect(first.systemPrompt).toContain("SAFETY-FIRST-TURN");expect(second.systemPrompt).toContain("SAFETY-SECOND-TURN");expect(second.systemPrompt).not.toContain("SAFETY-FIRST-TURN");});
 it("projects a same-turn correction into the prompt before inference",async()=>{const correction={id:"behavior:agency-followthrough",kind:"behavior" as const,value:"Why did you stop? Keep going without making me babysit.",source:"text" as const,observedAt:"2026-09-17T19:00:00.000Z",confidence:1,protected:true,occurrences:1};mocks.beginRuntimeSession.mockResolvedValue({schemaVersion:1,userId:"user-1",projectId:"project-1",conversationId:"conversation-1",channel:"text",activeSubsystem:"arbor",currentGoal:"finish the build",lastMeaningfulUserTurn:correction.value,lastMeaningfulArborTurn:null,agency:null,corrections:[correction],behaviorProof:null,pendingSelfUpdate:null,createdAt:correction.observedAt,updatedAt:correction.observedAt});const result=await buildPromptContext({supabase:promptClient(),authedUserId:"user-1",projectId:"project-1",conversationId:"conversation-1",latestUserText:correction.value,currentGoal:"finish the build",incomingCorrections:[correction],attachRuntimeBeforeProjection:true});expect(mocks.beginRuntimeSession).toHaveBeenCalledWith(expect.objectContaining({corrections:[correction],currentGoal:"finish the build"}));expect(result.systemPrompt).toContain(correction.value);expect(result.runtimeSession?.corrections).toEqual([correction]);});
 it("has no prompt cache state",()=>{const filePath=fileURLToPath(new URL("../buildPromptContext.ts",import.meta.url));const source=fs.readFileSync(filePath,"utf8");expect(source).not.toMatch(/promptCache|cacheExpiry|PROMPT_CACHE_TTL/);});
});
