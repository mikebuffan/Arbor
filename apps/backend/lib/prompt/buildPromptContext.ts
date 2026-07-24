import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getMemoryContext,
  type RetrievedMemoryItem,
} from "@/lib/memory/retrieval";
import { assembleMemoryBlock } from "@/lib/memory/assembleMemoryBlock";
import { logMemoryEvent } from "@/lib/memory/logger";
import {
  getProjectAnchors,
  anchorsToPromptBlock,
  type AnchorRow,
} from "@/lib/memory/anchors";
import type { SafetyAddendum } from "@/lib/governance/realWorldSafetyAddendum";

export function invalidatePromptCache(params: {
  authedUserId: string;
  projectId?: string | null;
  conversationId?: string | null;
}) {
  // Compatibility hook for existing callers. Prompt caching is disabled so
  // current-turn text and safety context are always assembled fresh.
  void params;
}

type BuildPromptParams = {
  authedUserId: string;
  projectId?: string | null;
  conversationId?: string | null;
  latestUserText: string;
  safety?: SafetyAddendum | null;
};

export type BuiltPromptContext = {
  systemPrompt: string;
  injectedMemoryItems: RetrievedMemoryItem[];
};

function isTruthyAnchor(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function getAnchorValue(anchors: AnchorRow[], key: string): string | null {
  const found = anchors.find((anchor) => anchor.key === key);
  const v = found?.value ?? null;
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v.text === "string") return v.text;
  return String(v);
}

function devLogNegativeAnchors(params: {
  authedUserId: string;
  projectId: string | null | undefined;
  conversationId: string | null | undefined;
  anchors: AnchorRow[];
}) {
  if (process.env.NODE_ENV === "production") return;

  const { authedUserId, projectId, conversationId, anchors } = params;

  const doNotUseName = isTruthyAnchor(getAnchorValue(anchors, "user.do_not_use_name"));
  const doNotUseRealName = isTruthyAnchor(getAnchorValue(anchors, "user.do_not_use_real_name"));
  const doNotCallRaw = getAnchorValue(anchors, "user.do_not_call");
  const doNotCallCount = (doNotCallRaw ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean).length;

  const preferredAddress = getAnchorValue(anchors, "user.preferred_address");
  const hasPreferredAddress = Boolean(preferredAddress && preferredAddress.trim().length > 0);

  console.log("[ANCHOR_SANITY]", {
    userId: authedUserId,
    projectId,
    conversationId,
    doNotUseName,
    doNotUseRealName,
    doNotCallCount,
    hasPreferredAddress,
  });
}

function buildNegativePrefsGuardFromAnchors(anchors: AnchorRow[]): string {
  const doNotUseName = isTruthyAnchor(getAnchorValue(anchors, "user.do_not_use_name"));
  const doNotUseRealName = isTruthyAnchor(getAnchorValue(anchors, "user.do_not_use_real_name"));
  const doNotCallRaw = getAnchorValue(anchors, "user.do_not_call");

  const doNotCallList = (doNotCallRaw ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const lines: string[] = [];

  if (doNotUseName) {
    lines.push("- Do NOT address the user by name unless they explicitly ask you to.");
  }
  if (doNotUseRealName) {
    lines.push("- Do NOT use the user’s legal/real name.");
  }
  if (doNotCallList.length) {
    lines.push(`- Never call the user any of these: ${doNotCallList.join(", ")}.`);
  }

  if (!lines.length) return "";

  return `
NEGATIVE PREFERENCES (ENFORCE STRICTLY):
${lines.join("\n")}
`.trim();
}

export async function buildPromptContext({
  authedUserId,
  projectId = null,
  conversationId = null,
  latestUserText,
  safety = null,
}: BuildPromptParams): Promise<BuiltPromptContext> {
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
  const NEGATIVE_PREFS_GUARD = `
    If an anchor says "Do not call user" or "Do not use user's name", obey it strictly.
    Never use forbidden names/titles even if older messages contain them.
    `.trim();
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
    
  devLogNegativeAnchors({
    authedUserId,
    projectId: projectId ?? null,
    conversationId: conversationId ?? null,
    anchors,
  });

  const negativePrefsFromAnchors = buildNegativePrefsGuardFromAnchors(anchors);

  const memContext = await getMemoryContext({
    authedUserId,
    projectId,
    latestUserText,
    useVectorSearch: true,
  });

  const allItems = [...memContext.core, ...memContext.normal, ...memContext.sensitive];
  const decayMs = 1000 * 60 * 60 * 24 * 30; 

  const { context, selectedItems, fallbackPrompt } = assembleMemoryBlock({
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

    ${NEGATIVE_PREFS_GUARD}
    ${negativePrefsFromAnchors ? "\n" + negativePrefsFromAnchors + "\n" : ""}

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

  await logMemoryEvent("prompt_built", { authedUserId, projectId, tokenLength: systemPrompt.length });
  return {
    systemPrompt,
    injectedMemoryItems: selectedItems,
  };
}

