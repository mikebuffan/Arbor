import { supabaseAdmin } from "@/lib/supabase/admin";
import { logMemoryEvent } from "@/lib/memory/logger";

function decayConfidence(currentConfidence: number): number {
  return Math.max(0.25, Math.min(1, currentConfidence * 0.98));
}

export async function runMemoryDecay(userId: string) {
  const client = supabaseAdmin();

  const { data: memories, error } = await client
    .from("memory_items")
    .select("id, tier, locked, pinned, confidence, last_reinforced_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(500);

  if (error) throw error;
  if (!memories?.length) return;

  const decayOps = (memories ?? [])
    .filter((m: any) => !m.locked && !m.pinned && m.tier !== "core")
    .map((m: any) => ({
      id: m.id,
      nextConfidence: decayConfidence(Number(m.confidence ?? 0.75)),
    }));

  for (const op of decayOps) {
    await client
      .from("memory_items")
      .update({
        confidence: op.nextConfidence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", op.id);
  }

  await logMemoryEvent("decay_cycle", { userId, decayed: decayOps.length });
}
