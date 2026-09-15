export type MemoryItemForPrompt = {
  deleted_at?: string | null;
  pinned: boolean;
  locked: boolean;
  user_trigger_only: boolean;
  content_text: string;
  key: string;
  tier: "core" | "normal" | "sensitive";
  status: string;
};

function norm(s: string) {
  return (s || "").toLowerCase();
}

export function messageTriggersItem(item: MemoryItemForPrompt, userText: string): boolean {
  const u = norm(userText);
  const key = norm(item.key).replace(/[._]/g, " ");
  const text = norm(item.content_text);

  if (key && u.includes(key)) return true;
  if (text.length >= 12 && u.includes(text.slice(0, 48))) return true;
  return false;
}

export function selectItemsForPrompt<T extends MemoryItemForPrompt>(items: T[], userText: string): T[] {
  return items.filter((i) => {
    if (i.deleted_at) return false;
    if (i.status !== "active") return false;

    // Reveal gating outranks durability. A sensitive/trigger-only memory does
    // not become always-visible merely because it is pinned, locked, or core.
    if (i.user_trigger_only || i.tier === "sensitive") {
      return messageTriggersItem(i, userText);
    }

    if (i.pinned || i.locked || i.tier === "core") return true;
    return true;
  });
}