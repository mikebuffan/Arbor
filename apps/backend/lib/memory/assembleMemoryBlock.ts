import type { RetrievedMemoryItem } from "@/lib/memory/retrieval";
import { selectItemsForPrompt } from "@/lib/memory/selectForPrompt";

function inferCategory(item: RetrievedMemoryItem) {
  const key = item.key.toLowerCase();

  if (item.tier === "sensitive") return "sensitive";
  if (
    item.pinned ||
    item.tier === "core" ||
    key.startsWith("user.") ||
    key.includes("identity")
  ) {
    return "identity";
  }
  if (
    key.includes("prefer") ||
    key.includes("avoid") ||
    key.includes("style") ||
    key.includes("tone")
  ) {
    return "preferences";
  }
  if (
    key.includes("project") ||
    key.includes("ongoing") ||
    key.includes("current") ||
    key.includes("legal") ||
    key.includes("health")
  ) {
    return "ongoing";
  }

  return "notes";
}

export function assembleMemoryBlock(args: {
  allItems: RetrievedMemoryItem[];
  userText: string;
  decayMs: number;
}) {
  const { allItems, userText, decayMs } = args;
  const now = Date.now();

  const decayed = allItems.filter((i) => {
    if (i.deleted_at || i.status !== "active") return false;
    if (i.pinned || i.locked || i.tier === "core") return true;

    const stamp = i.last_reinforced_at ?? i.last_seen_at ?? i.updated_at;
    if (!stamp) return true;

    const t = new Date(stamp).getTime();
    if (!Number.isFinite(t)) return true;

    return now - t <= decayMs;
  });

  const allowed = selectItemsForPrompt(decayed, userText);

  const by = (cat: string) => allowed.filter((i) => inferCategory(i) === cat);

  const context = {
    identity: by("identity").map((i) => i.content_text),
    preferences: by("preferences").map((i) => i.content_text),
    ongoing: by("ongoing").map((i) => i.content_text),
    sensitive: by("sensitive").map((i) => i.content_text),
    notes: by("notes").map((i) => i.content_text),
  };

  const lowSignal = Object.values(context).every((arr) => arr.length === 0);

  return {
    context,
    fallbackPrompt: lowSignal
      ? "I’m tracking the conversation, but I do not have a strong memory signal to lean on yet. Stay grounded in the user’s latest message."
      : null,
  };
}