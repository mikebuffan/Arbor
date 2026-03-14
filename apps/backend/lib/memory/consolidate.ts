import type { MemoryItem } from "@/lib/memory/types";

function stableValueString(v: MemoryItem["value"]): string {
  if (v == null) return "null";
  if (typeof v === "string") return v.trim();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function mergeTier(a: MemoryItem["tier"], b: MemoryItem["tier"]): MemoryItem["tier"] {
  if (a === "sensitive" || b === "sensitive") return "sensitive";
  if (a === "core" || b === "core") return "core";
  return "normal";
}

function mergeScope(
  a?: MemoryItem["scope"],
  b?: MemoryItem["scope"]
): MemoryItem["scope"] {
  const rank: Record<string, number> = {
    conversation: 1,
    project: 2,
    global: 3,
  };

  const aa = a ?? "conversation";
  const bb = b ?? "conversation";
  return rank[bb] > rank[aa] ? bb : aa;
}

function pickBetterValue(existing: MemoryItem, incoming: MemoryItem): MemoryItem["value"] {
  const existingScore = (existing.confidence ?? 0) * 100 + (existing.importance ?? 0);
  const incomingScore = (incoming.confidence ?? 0) * 100 + (incoming.importance ?? 0);
  return incomingScore > existingScore ? incoming.value : existing.value;
}

function mergeEvidence(a?: string, b?: string): string | undefined {
  const parts = [a, b].map((x) => x?.trim()).filter(Boolean) as string[];
  if (!parts.length) return undefined;
  return Array.from(new Set(parts)).join(" | ").slice(0, 1500);
}

export function consolidateMemoryItems(
  items: MemoryItem[],
  options?: {
    minConfidence?: number;
    minImportance?: number;
    maxItems?: number;
  }
): MemoryItem[] {
  const minConfidence = options?.minConfidence ?? 0.55;
  const minImportance = options?.minImportance ?? 3;
  const maxItems = options?.maxItems ?? 20;

  const filtered = items.filter((item) => {
    if (!item?.key?.trim()) return false;
    if ((item.confidence ?? 0) < minConfidence) return false;
    if ((item.importance ?? 0) < minImportance) return false;
    return true;
  });

  const byKey = new Map<string, MemoryItem>();

  for (const item of filtered) {
    const key = item.key.trim();
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        ...item,
        key,
      });
      continue;
    }

    const merged: MemoryItem = {
      ...existing,
      key,
      value: pickBetterValue(existing, item),
      tier: mergeTier(existing.tier, item.tier),
      user_trigger_only: existing.user_trigger_only || item.user_trigger_only,
      importance: Math.max(existing.importance ?? 0, item.importance ?? 0),
      confidence: Math.max(existing.confidence ?? 0, item.confidence ?? 0),
      scope: mergeScope(existing.scope, item.scope),
      folder_slug: existing.folder_slug ?? item.folder_slug ?? null,
      pinned: !!existing.pinned || !!item.pinned,
      locked: !!existing.locked || !!item.locked,
      evidence: mergeEvidence(existing.evidence, item.evidence),
    };

    const ev = mergeEvidence(
      merged.evidence,
      stableValueString(existing.value) !== stableValueString(item.value)
        ? `variants: ${stableValueString(existing.value)} || ${stableValueString(item.value)}`
        : undefined
    );

    merged.evidence = ev;
    byKey.set(key, merged);
  }

  return Array.from(byKey.values())
    .sort((a, b) => {
      const scoreA = (a.importance ?? 0) * 10 + (a.confidence ?? 0);
      const scoreB = (b.importance ?? 0) * 10 + (b.confidence ?? 0);
      return scoreB - scoreA;
    })
    .slice(0, maxItems);
}