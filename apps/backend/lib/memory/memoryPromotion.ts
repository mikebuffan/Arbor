import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryItem } from "@/lib/memory/types";
import { hasExplicitDurableAuthorization } from "@/lib/memory/durableAuthorization";

export type MemoryPromotionClass =
  | "discard"
  | "temporary"
  | "promote"
  | "anchor";

export type MemoryPromotionSignals = {
  repetition: number;
  emotionalWeight: number;
  correctionStrength: number;
  decisionImpact: number;
  identityRelevance: number;
  openLoopRelevance: number;
  recency: number;
};

export type MemoryPromotionResult = {
  item: MemoryItem;
  score: number;
  classification: MemoryPromotionClass;
  signals: MemoryPromotionSignals;
  reasons: string[];
};

export type MemoryPromotionInput = {
  item: MemoryItem;
  relatedMemoryCount?: number;
  userMessage?: string | null;
  assistantMessage?: string | null;
  isTestData?: boolean;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeText(value?: string | null): string {
  return (value ?? "").toLowerCase().trim();
}

function valueText(value: MemoryItem["value"]): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return String(value ?? "");
  const scalar = (value as Record<string, unknown>).value;
  if (
    typeof scalar === "string" ||
    typeof scalar === "number" ||
    typeof scalar === "boolean"
  ) {
    return String(scalar);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function itemText(item: MemoryItem): string {
  return `${item.key} ${valueText(item.value)}`.trim();
}

function includesAny(text: string, phrases: string[]): boolean {
  const normalized = text.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase));
}

function isLikelyNoise(item: MemoryItem): boolean {
  const value = valueText(item.value).trim().toLowerCase();
  const noise = new Set([
    "okay", "ok", "please", "continue", "yes", "no", "thanks",
    "thank you", "sounds good", "alright",
  ]);
  if (noise.has(value)) return true;
  return value.length < 8 && Number(item.importance ?? 0) <= 2 && Number(item.confidence ?? 0) < 0.6;
}

function scoreRepetition(item: MemoryItem, relatedMemoryCount = 0): number {
  if (item.tier === "core") return 0.8;
  if (relatedMemoryCount <= 0) return 0;
  if (relatedMemoryCount === 1) return 0.35;
  if (relatedMemoryCount === 2) return 0.55;
  return 0.8;
}

function scoreEmotionalWeight(item: MemoryItem, userMessage?: string | null): number {
  const text = `${normalizeText(itemText(item))} ${normalizeText(userMessage)}`;
  if (item.tier === "sensitive") return 0.75;
  return includesAny(text, ["important", "matters", "hurt", "scared", "overwhelmed", "angry", "upset", "i hate", "i love", "please don't forget", "this matters"]) ? 0.75 : 0;
}

function scoreCorrectionStrength(item: MemoryItem, userMessage?: string | null): number {
  const text = `${normalizeText(itemText(item))} ${normalizeText(userMessage)}`;
  return includesAny(text, ["correction", "actually", "that's wrong", "that is wrong", "not anymore", "never mind", "i changed my mind", "that was yesterday", "not today", "not yesterday", "forget that", "update that", "use first person", "not the system"]) ? 0.9 : 0;
}

function scoreDecisionImpact(item: MemoryItem, userMessage?: string | null): number {
  const text = `${normalizeText(itemText(item))} ${normalizeText(userMessage)}`;
  if (item.scope === "project" && includesAny(item.key, ["project", "architecture", "decision", "priority"])) return 0.75;
  return includesAny(text, ["decision", "priority", "next step", "current task", "deadline", "do this first", "do not do", "implementation", "architecture", "source of truth", "locked", "final"]) ? 0.75 : 0;
}

function scoreIdentityRelevance(item: MemoryItem): number {
  if (item.tier === "core") return 1;
  const text = itemText(item).toLowerCase();
  if (includesAny(text, ["arbor", "baseline", "identity", "agency", "continuity", "do not drift", "not generic", "first person", "relationship", "preferred_address", "preferred_name"])) return 0.85;
  const key = item.key.toLowerCase();
  if (/^(interaction\.(cue|preference|interpretation)|accessibility\.input)\./.test(key)) return 0.85;
  if (/preference|preferred|boundary|correction/.test(key)) return 0.55;
  return 0;
}

function scoreOpenLoopRelevance(item: MemoryItem, userMessage?: string | null): number {
  const text = `${normalizeText(itemText(item))} ${normalizeText(userMessage)}`;
  return includesAny(text, ["need to", "we need", "next", "later", "todo", "unfinished", "open loop", "follow up", "still needs", "not done", "after this", "current priority"]) ? 0.7 : 0;
}

function scoreRecency(item: MemoryItem): number {
  return item.scope === "conversation" ? 0.35 : 0.15;
}

export function scoreMemoryPromotion(input: MemoryPromotionInput): MemoryPromotionResult {
  const { item, relatedMemoryCount = 0, userMessage } = input;
  const durableAuthorized = hasExplicitDurableAuthorization(userMessage);
  const zeroSignals: MemoryPromotionSignals = { repetition: 0, emotionalWeight: 0, correctionStrength: 0, decisionImpact: 0, identityRelevance: 0, openLoopRelevance: 0, recency: 0 };
  if (isLikelyNoise(item)) return { item, score: 0, classification: "discard", signals: zeroSignals, reasons: ["Discarded as likely one-off noise or too low-signal."] };
  if (input.isTestData) return { item, score: 0, classification: "discard", signals: zeroSignals, reasons: ["Input detected as test/probe data; do not persist it into durable memory."] };

  const signals: MemoryPromotionSignals = {
    repetition: scoreRepetition(item, relatedMemoryCount),
    emotionalWeight: scoreEmotionalWeight(item, userMessage),
    correctionStrength: scoreCorrectionStrength(item, userMessage),
    decisionImpact: scoreDecisionImpact(item, userMessage),
    identityRelevance: scoreIdentityRelevance(item),
    openLoopRelevance: scoreOpenLoopRelevance(item, userMessage),
    recency: scoreRecency(item),
  };
  const reasons: string[] = [];
  if (signals.repetition > 0) reasons.push("Repeated or related memory signal.");
  if (signals.emotionalWeight > 0) reasons.push("Emotional weight detected.");
  if (signals.correctionStrength > 0) reasons.push("Correction/update signal detected.");
  if (signals.decisionImpact > 0) reasons.push("Decision or implementation impact detected.");
  if (signals.identityRelevance > 0) reasons.push("Identity/continuity relevance detected.");
  if (signals.openLoopRelevance > 0) reasons.push("Open loop or unfinished task detected.");
  if (signals.recency > 0.3) reasons.push("Recent timeline relevance detected.");

  const normalizedImportance = Math.max(0, Math.min(1, Number(item.importance ?? 0) / 10));
  const normalizedConfidence = Math.max(0, Math.min(1, Number(item.confidence ?? 0)));
  const score = clamp01(signals.repetition * 0.15 + signals.emotionalWeight * 0.16 + signals.correctionStrength * 0.18 + signals.decisionImpact * 0.16 + signals.identityRelevance * 0.20 + signals.openLoopRelevance * 0.10 + signals.recency * 0.05 + normalizedImportance * 0.08 + normalizedConfidence * 0.05);

  let classification: MemoryPromotionClass = "discard";
  const highConfidenceIdentity = signals.identityRelevance >= 0.85 && Number(item.importance ?? 0) >= 9 && normalizedConfidence >= 0.9;
  if (durableAuthorized && (signals.identityRelevance >= 0.9 || signals.correctionStrength >= 0.9 || highConfidenceIdentity || (signals.repetition >= 0.8 && signals.identityRelevance >= 0.55))) {
    classification = "anchor";
  } else if (durableAuthorized && (score >= 0.62 || signals.decisionImpact >= 0.75 || signals.openLoopRelevance >= 0.7 || signals.emotionalWeight >= 0.75 || (signals.identityRelevance >= 0.85 && normalizedConfidence >= 0.8))) {
    classification = "promote";
  } else if (score >= 0.35) classification = "temporary";
  if (!durableAuthorized && (signals.identityRelevance > 0 || signals.correctionStrength > 0 || signals.decisionImpact > 0)) {
    reasons.push("Durable promotion withheld: no explicit current-turn authorization.");
  }

  return { item, score: Number(score.toFixed(3)), classification, signals, reasons };
}

export function scoreMemoryPromotionBatch(input: { items: MemoryItem[]; relatedMemoryCountByKey?: Record<string, number>; userMessage?: string | null; assistantMessage?: string | null; isTestData?: boolean; }): MemoryPromotionResult[] {
  const related = input.relatedMemoryCountByKey ?? {};
  return input.items.map((item) => scoreMemoryPromotion({ item, relatedMemoryCount: related[item.key] ?? 0, userMessage: input.userMessage, assistantMessage: input.assistantMessage, isTestData: input.isTestData }));
}

export function applyMemoryPromotion(results: MemoryPromotionResult[]): MemoryItem[] {
  return results.filter((result) => result.classification !== "discard").map((result) => {
    if (result.classification === "anchor") return { ...result.item, tier: result.item.tier === "sensitive" ? "sensitive" : "core", pinned: true, importance: 10, confidence: Math.max(Number(result.item.confidence ?? 0), 0.9), user_trigger_only: result.item.tier === "sensitive" ? true : result.item.user_trigger_only };
    if (result.classification === "promote") return { ...result.item, scope: result.item.scope === "conversation" ? "global" : result.item.scope, importance: Math.max(Number(result.item.importance ?? 0), 7), confidence: Math.max(Number(result.item.confidence ?? 0), 0.75) };
    return result.item;
  });
}

export async function loadRelatedMemoryCounts(input: { supabase: SupabaseClient; authedUserId: string; projectId: string | null; items: MemoryItem[]; }): Promise<Record<string, number>> {
  const keys = Array.from(new Set(input.items.map((item) => item.key.trim()).filter(Boolean)));
  if (!keys.length) return {};
  let query = input.supabase.from("memory_items").select("key,project_id,status,deleted_at").eq("user_id", input.authedUserId).in("key", keys).eq("status", "active").is("deleted_at", null);
  if (input.projectId) query = query.or(`project_id.eq.${input.projectId},project_id.is.null`);
  else query = query.is("project_id", null);
  const { data, error } = await query;
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[String(row.key)] = (counts[String(row.key)] ?? 0) + 1;
  return counts;
}
