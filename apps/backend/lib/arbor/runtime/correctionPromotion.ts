import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryItem } from "@/lib/memory/types";
import { upsertMemoryItems } from "@/lib/memory/store";
import type { ArborCorrection } from "./runtimeState";
import { hasExplicitDurableAuthorization } from "@/lib/memory/durableAuthorization";
import { correctionFamily } from "./corrections";

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
): MemoryItem | null {
  const occurrences = Math.max(
    1,
    Number(correction.occurrences ?? 1),
  );

  const key = promotedCorrectionKey(correction);
  if (!key || occurrences < 2) return null;

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
    .map(correctionPromotionItem)
    .filter((item): item is MemoryItem => item !== null);

  if (!promotable.length) {
    return {
      promoted: [] as string[],
    };
  }

  const result = await upsertMemoryItems(
    params.userId,
    promotable,
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
