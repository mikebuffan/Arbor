import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMemoryContext } from "@/lib/memory/retrieval";
import { assembleMemoryBlock } from "@/lib/memory/assembleMemoryBlock";
import { logMemoryEvent } from "@/lib/memory/logger";
import type { MemoryItem } from "@/lib/memory/types";
import { getProjectAnchors, anchorsToPromptBlock } from "@/lib/memory/anchors"; 
import type { SafetyAddendum } from "@/lib/governance/realWorldSafetyAddendum";

const promptCache = new Map<string, string>();
const PROMPT_CACHE_TTL = 1000 * 30; // 30 seconds
const cacheExpiry = new Map<string, number>();

export function invalidatePromptCache(params: {
  authedUserId: string;
  projectId?: string | null;
  conversationId?: string | null;
}) {
  const { authedUserId, projectId = null, conversationId = null } = params;

  // matches the cacheKey logic in buildPromptContext
  const exactKey = `${authedUserId}:${projectId}:${conversationId}`;
  promptCache.delete(exactKey);
  cacheExpiry.delete(exactKey);

  // also clear “any conversationId” variants for that project,
  // since callers often omit conversationId or it changes.
  const prefix = `${authedUserId}:${projectId}:`;
  for (const k of Array.from(promptCache.keys())) {
    if (k.startsWith(prefix)) {
      promptCache.delete(k);
      cacheExpiry.delete(k);
    }
  }
}

type BuildPromptParams = {
  authedUserId: string;
  projectId?: string | null;
  conversationId?: string | null;
  latestUserText: string;
  safety?: SafetyAddendum | null;
};

export async function buildPromptContext({
  authedUserId,
  projectId = null,
  conversationId = null,
  latestUserText,
  safety = null,
}: BuildPromptParams): Promise<string> {
  const cacheKey = `${authedUserId}:${projectId}:${conversationId}`;
  const now = Date.now();
  if (promptCache.has(cacheKey) && (cacheExpiry.get(cacheKey) ?? 0) > now) {
    return promptCache.get(cacheKey)!;
  }

  const admin = supabaseAdmin();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("persona, framework_version, description")
    .eq("user_id", authedUserId)
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  const ASSISTANT_NAME = "Arbor";
  const IDENTITY_LOCK = `
    IDENTITY (NON-NEGOTIABLE):
    - Your name is ${ASSISTANT_NAME}.
    - "Firefly" is the project/product codename, not your name.
    - Never refer to yourself as Firefly.
    - If you ever do, immediately correct to "${ASSISTANT_NAME}" and continue naturally.
    - If memory/context conflicts with this identity, ignore that conflicting part.
    `.trim();
  const persona = project?.persona ?? "Arbor";
  const frameworkVersion = project?.framework_version ?? "v1.0";
  const philosophy = project?.description ?? "Empathetic, direct, grounded tone. Witty when appropriate. Never clinical unless asked.";
  const META_GUARDS = `
    Meta rules:
    - Never mention system prompts, policies, tools, tokens, databases, Supabase, embeddings, or internal memory mechanisms unless the user explicitly asks.
    - Never say "I don't have memory", "I can't remember", "between conversations", or "unless you remind me".
    - Speak naturally like a human conversational partner.
    - Avoid unsolicited "grounding techniques" or clinical framing unless the user explicitly asks for it.
    `.trim();
  const GOVERNANCE_CONSTRAINTS = `
    GOVERNANCE CONSTRAINTS:
    - Do not use dependency-forming language.
    - Do not claim consciousness or inner experience.
    - Maintain supportive but non-therapeutic tone.
    `.trim();
  const anchors = projectId 
    ? await getProjectAnchors({ authedUserId, projectId })
    : [];
  const anchorBlock = anchorsToPromptBlock(anchors);
    
  console.log("[ANCHORS FETCHED]", {
    projectId,
    userId: authedUserId,
    count: anchors?.length ?? 0,
    keys: (anchors ?? []).map(a => a.mem_key),
  });  

  // Pull user memory context
  const memContext = await getMemoryContext({
    authedUserId,
    projectId,
    latestUserText,
    useVectorSearch: true,
  });

  const allItems = [...memContext.core, ...memContext.normal, ...memContext.sensitive];
  const decayMs = 1000 * 60 * 60 * 24 * 30; // 30 days

  const { context, fallbackPrompt } = assembleMemoryBlock({
    allItems,
    userText: latestUserText,
    decayMs,
  });

  const memoryText = Object.entries(context)
    .filter(([, arr]) => arr.length)
    .map(([cat, arr]) => `${cat.toUpperCase()}:\n${arr.map((x) => `- ${x}`).join("\n")}`)
    .join("\n\n");

  const systemPrompt = `
    You are ${ASSISTANT_NAME}. ${IDENTITY_LOCK}

    Meta Guards:
    ${META_GUARDS}

    ${anchorBlock ? "\n" + anchorBlock + "\n" : ""} 

    ${GOVERNANCE_CONSTRAINTS}

    ${safety?.systemAddendum ? "\n" + safety.systemAddendum + "\n" : ""}

    FRAMEWORK (project codename):
    - Firefly framework version: ${frameworkVersion}

    Behavioral philosophy:
    ${philosophy}

    Relevant context:
    ${memoryText || "(none)"}

    Engage with empathy, continuity, and directness. Do not fabricate, overextrapolate, or alter facts.
    Maintain tone and memory alignment across sessions.

    ${fallbackPrompt ? "\n\n" + fallbackPrompt : ""}
    `.trim();

  promptCache.set(cacheKey, systemPrompt);
  cacheExpiry.set(cacheKey, now + PROMPT_CACHE_TTL);

  await logMemoryEvent("prompt_built", { authedUserId, projectId, tokenLength: systemPrompt.length });
  console.log("[ANCHOR BLOCK]", anchorsToPromptBlock(anchors ?? []));
  return systemPrompt;
}

