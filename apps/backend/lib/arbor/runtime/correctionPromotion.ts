import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryItem } from "@/lib/memory/types";
import { upsertMemoryItems } from "@/lib/memory/store";
import type { ArborCorrection } from "./runtimeState";
import { hasExplicitDurableAuthorization } from "@/lib/memory/durableAuthorization";
import { correctionFamily, correctionId } from "./corrections";

export function promotedCorrectionKey(
  correction: ArborCorrection,
): string | null {
  if (correction.kind !== "behavior") return null;

  const family = correctionFamily(
    correction.kind,
    correction.value,
  );

  if (!family) return null;
  return `behavior.correction.${family}`;
}

export function correctionPromotionItem(
  correction: ArborCorrection,
  explicitlyAuthorized = false,
): MemoryItem | null {
  const occurrences = Math.max(
    1,
    Number(correction.occurrences ?? 1),
  );

  const key = promotedCorrectionKey(correction);
  if (!key || (!explicitlyAuthorized && occurrences < 2)) return null;

  return {
    key,
    value: {
      text: correction.value,
      family: key.replace("behavior.correction.", ""),
      occurrences,
      last_observed_at: correction.observedAt,
      source: correction.source,
    },
    tier: "core",
    scope: "global",
    user_trigger_only: false,
    importance: 10,
    confidence: Math.max(0.95, correction.confidence),
    memory_kind: "correction",
    salience: 1,
    pinned: true,
    locked: false,
  };
}

export async function promoteRepeatedBehaviorCorrections(params: {
  supabase: SupabaseClient;
  userId: string;
  corrections: ArborCorrection[];
  currentUserText?: string | null;
}) {
  if (!hasExplicitDurableAuthorization(params.currentUserText)) {
    return { promoted: [] as string[] };
  }

  const promotable = params.corrections
    .map(correction => correctionPromotionItem(correction, true))
    .filter((item): item is MemoryItem => item !== null);

  if (!promotable.length) {
    return {
      promoted: [] as string[],
    };
  }

  // An older thread must not replace a newer permanent calibration.
  const existing = await loadDurableBehaviorCorrections({ supabase: params.supabase, userId: params.userId });
  const currentByKey = new Map(existing.map(correction => [promotedCorrectionKey(correction), correction]));
  const fresh = promotable.filter(item => {
    const prior = currentByKey.get(item.key);
    const value = typeof item.value === "string" ? {} : item.value;
    return !prior || Date.parse(String(value.last_observed_at)) > Date.parse(prior.observedAt);
  });
  if (!fresh.length) return { promoted: [] as string[] };

  const result = await upsertMemoryItems(
    params.userId,
    fresh,
    null,
    params.supabase,
    null,
  );

  return {
    promoted: Array.from(
      new Set([
        ...result.created,
        ...result.updated,
      ]),
    ),
  };
}


const DURABLE_BEHAVIOR_KEYS = [
  "behavior.correction.agency-followthrough",
  "behavior.correction.identity-drift",
  "behavior.correction.continuity",
];

/** Read existing authorized permanent corrections independently of conversation
 * recall and general memory ranking. Acoustic calibration stays separate. */
export async function loadDurableBehaviorCorrections(input: {
  supabase: SupabaseClient; userId: string;
}): Promise<ArborCorrection[]> {
  const { data, error } = await input.supabase.from("memory_items")
    .select("id,user_id,project_id,conversation_id,key,value,scope,status,deleted_at,confidence")
    .eq("user_id", input.userId).eq("scope", "global")
    .is("project_id", null).is("conversation_id", null)
    .eq("status", "active").is("deleted_at", null)
    .in("key", DURABLE_BEHAVIOR_KEYS).limit(DURABLE_BEHAVIOR_KEYS.length + 1);
  if (error) throw error;
  const rows = data ?? [];
  const seen = new Set<string>();
  return rows.map(row => {
    if (row.user_id !== input.userId || row.scope !== "global" || row.project_id !== null ||
        row.conversation_id !== null || row.status !== "active" || row.deleted_at !== null ||
        !DURABLE_BEHAVIOR_KEYS.includes(row.key) || seen.has(row.key))
      throw new Error("durable_behavior_correction_scope_or_duplicate");
    seen.add(row.key);
    const value = row.value as Record<string, unknown>;
    const text = typeof value?.text === "string" ? value.text.trim() : "";
    const observedAt = typeof value?.last_observed_at === "string" ? value.last_observed_at : "";
    const family = correctionFamily("behavior", text);
    const occurrences = Number(value?.occurrences ?? 1);
    if (!text || row.key !== `behavior.correction.${family}` || !Number.isFinite(Date.parse(observedAt)) ||
        !Number.isSafeInteger(occurrences) || occurrences < 1)
      throw new Error("durable_behavior_correction_invalid_payload");
    return { id: correctionId("behavior", text), kind: "behavior" as const, value: text,
      source: value.source === "voice" || value.source === "annabelle" ? value.source : "text" as const,
      observedAt, confidence: Number(row.confidence ?? 1), protected: true, occurrences };
  });
}
