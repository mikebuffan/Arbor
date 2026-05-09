import type { SupabaseClient } from "@supabase/supabase-js";

export type MemoryTier = "core" | "normal" | "sensitive";
export type MemoryScope = "global" | "project" | "conversation";
export type MemoryStatus = "active" | "pending" | "tombstoned";

export type MemoryItemRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  conversation_id: string | null;
  key: string;
  value: Record<string, any>;
  tier: MemoryTier;
  scope: MemoryScope;
  user_trigger_only: boolean;
  importance: number;
  confidence: number;
  locked: boolean;
  pinned: boolean;
  mention_count: number;
  correction_count: number;
  status: MemoryStatus;
  excluded_from_memory: boolean;
  deleted_at: string | null;
  delete_reason: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  last_reinforced_at: string | null;
};

export type MemoryDeps = {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  userId: string;
  projectId: string | null;
};

type LegacyRevealPolicy = "normal" | "user_trigger_only" | "never";
type LegacyEmotionalWeight = "light" | "neutral" | "heavy";

function safeObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { text: "" };

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      // Keep plain strings as text below.
    }

    return { text: trimmed };
  }

  if (value == null) return {};
  return { value };
}

function valueText(value: unknown): string {
  const obj = safeObject(value);
  if (typeof obj.text === "string" && obj.text.trim()) return obj.text.trim();
  if (typeof obj.display_text === "string" && obj.display_text.trim())
    return obj.display_text.trim();
  if (typeof obj.value === "string" && obj.value.trim())
    return obj.value.trim();
  try {
    return JSON.stringify(obj);
  } catch {
    return String(value ?? "");
  }
}

function normalizeKey(input: unknown): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 180);
}

function normalizeScope(input: unknown, projectId: string | null): MemoryScope {
  const raw = String(input ?? "").toLowerCase();
  if (raw === "global" || raw === "project" || raw === "conversation")
    return raw;
  return projectId ? "project" : "conversation";
}

function normalizeTier(input: unknown, pinned?: boolean): MemoryTier {
  const raw = String(input ?? "").toLowerCase();
  if (raw === "core" || raw === "normal" || raw === "sensitive") return raw;
  return pinned ? "core" : "normal";
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function buildValue(input: {
  value?: unknown;
  mem_value?: unknown;
  display_text?: unknown;
  trigger_terms?: unknown;
  emotional_weight?: unknown;
  relational_context?: unknown;
  reveal_policy?: unknown;
}): Record<string, any> {
  const sourceValue =
    input.value ?? input.mem_value ?? input.display_text ?? "";
  const value = safeObject(sourceValue);

  const displayText = String(input.display_text ?? "").trim();
  if (displayText && !value.text) value.text = displayText;

  const triggerTerms = Array.isArray(input.trigger_terms)
    ? input.trigger_terms
    : [];
  if (triggerTerms.length) value.trigger_terms = triggerTerms.filter(Boolean);

  const relationalContext = Array.isArray(input.relational_context)
    ? input.relational_context
    : [];
  if (relationalContext.length)
    value.relational_context = relationalContext.filter(Boolean);

  const emotionalWeight = String(input.emotional_weight ?? "").trim();
  if (emotionalWeight) value.emotional_weight = emotionalWeight;

  const revealPolicy = String(input.reveal_policy ?? "").trim();
  if (revealPolicy) value.reveal_policy = revealPolicy;

  return value;
}

function normalizeRow(row: any): MemoryItemRow {
  return {
    ...row,
    value: safeObject(row?.value),
    tier: normalizeTier(row?.tier, row?.pinned),
    scope: normalizeScope(row?.scope, row?.project_id ?? null),
    user_trigger_only: !!row?.user_trigger_only,
    importance: Number(row?.importance ?? 5),
    confidence: Number(row?.confidence ?? 0.75),
    locked: !!row?.locked,
    pinned: !!row?.pinned,
    mention_count: Number(row?.mention_count ?? 0),
    correction_count: Number(row?.correction_count ?? 0),
    status: (row?.status ?? "active") as MemoryStatus,
    excluded_from_memory: !!row?.excluded_from_memory,
    deleted_at: row?.deleted_at ?? null,
    delete_reason: row?.delete_reason ?? null,
  } as MemoryItemRow;
}

export class MemoryService {
  constructor(private ctx: MemoryDeps) {}

  private baseQuery() {
    let q = this.ctx.admin
      .from("memory_items")
      .select(
        "id,user_id,project_id,conversation_id,key,value,tier,scope,user_trigger_only,importance,confidence,locked,pinned,mention_count,correction_count,status,excluded_from_memory,deleted_at,delete_reason,created_at,updated_at,last_seen_at,last_reinforced_at",
      )
      .eq("user_id", this.ctx.userId);

    if (this.ctx.projectId) {
      q = q.or(`project_id.eq.${this.ctx.projectId},scope.eq.global`);
    } else {
      q = q.or("project_id.is.null,scope.eq.global");
    }

    return q;
  }

  async listItems(opts?: { includeDiscarded?: boolean }) {
    let q = this.baseQuery()
      .order("pinned", { ascending: false })
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false });

    if (!opts?.includeDiscarded) {
      q = q.is("deleted_at", null).eq("status", "active");
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(normalizeRow);
  }

  async upsertItem(input: {
    key?: string;
    value?: Record<string, any> | string;
    tier?: MemoryTier;
    scope?: MemoryScope;
    user_trigger_only?: boolean;
    importance?: number;
    confidence?: number;
    pinned?: boolean;
    locked?: boolean;

    // Legacy op compatibility. These are mapped into v2 fields.
    mem_key?: string;
    mem_value?: string;
    display_text?: string;
    trigger_terms?: string[];
    emotional_weight?: LegacyEmotionalWeight;
    relational_context?: string[];
    reveal_policy?: LegacyRevealPolicy;
    is_locked?: boolean;
  }) {
    const now = new Date().toISOString();
    const key = normalizeKey(input.key ?? input.mem_key);
    if (!key) throw new Error("Memory key is required.");

    const revealPolicy = (input.reveal_policy ??
      "normal") as LegacyRevealPolicy;
    const pinned = !!input.pinned;
    const locked = !!(input.locked ?? input.is_locked ?? false);
    const tier = normalizeTier(input.tier, pinned);
    const scope = normalizeScope(input.scope, this.ctx.projectId);
    const value = buildValue(input);
    const userTriggerOnly =
      !!input.user_trigger_only ||
      revealPolicy === "user_trigger_only" ||
      revealPolicy === "never";
    const excludedFromMemory = revealPolicy === "never";

    const payload = {
      user_id: this.ctx.userId,
      project_id: scope === "global" ? null : this.ctx.projectId,
      key,
      value,
      tier,
      scope,
      user_trigger_only: userTriggerOnly,
      importance: clampNumber(
        input.importance,
        1,
        10,
        pinned || tier === "core" ? 10 : 5,
      ),
      confidence: clampNumber(input.confidence, 0, 1, 0.75),
      locked,
      pinned: pinned || tier === "core",
      status: excludedFromMemory ? "pending" : "active",
      excluded_from_memory: excludedFromMemory,
      deleted_at: null,
      delete_reason: null,
      last_seen_at: now,
      last_reinforced_at: now,
      updated_at: now,
    };

    const { data: existing, error: findError } = await this.ctx.admin
      .from("memory_items")
      .select("id,mention_count,importance,confidence,pinned,locked,tier")
      .eq("user_id", this.ctx.userId)
      .eq("key", key)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      const { data, error } = await this.ctx.admin
        .from("memory_items")
        .update({
          ...payload,
          importance: Math.max(
            Number(existing.importance ?? 5),
            payload.importance,
          ),
          confidence: Math.max(
            Number(existing.confidence ?? 0.75),
            payload.confidence,
          ),
          pinned: payload.pinned || !!existing.pinned,
          locked: payload.locked || !!existing.locked,
          tier:
            payload.tier === "core" || existing.tier === "core"
              ? "core"
              : payload.tier,
          mention_count: Number(existing.mention_count ?? 0) + 1,
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw error;
      return normalizeRow(data);
    }

    const { data, error } = await this.ctx.admin
      .from("memory_items")
      .insert({
        ...payload,
        mention_count: 1,
        correction_count: 0,
      })
      .select("*")
      .single();

    if (error) throw error;
    return normalizeRow(data);
  }

  async applyOps(ops: any[]): Promise<string[]> {
    const appliedIds: string[] = [];

    for (const o of ops ?? []) {
      const op = String(o?.op ?? "").toUpperCase();
      if (op === "NO_STORE") continue;

      const key = normalizeKey(o.key ?? o.mem_key ?? o.memKey);
      const value =
        o.value ??
        o.mem_value ??
        o.memValue ??
        o.correctedValue ??
        o.display_text ??
        o.display;
      const id = o.id ?? o.memory_id ?? o.memoryId;

      if ((op === "CORRECT" || op === "UPSERT") && !key && !id) continue;

      if (op === "CORRECT" && id) {
        const now = new Date().toISOString();
        const nextValue = buildValue({
          value,
          display_text: o.display_text ?? o.displayText ?? o.display,
          trigger_terms: o.trigger_terms ?? o.triggerTerms ?? [],
          emotional_weight: o.emotional_weight ?? o.emotionalWeight,
          relational_context: o.relational_context ?? o.relationalContext ?? [],
          reveal_policy: o.reveal_policy ?? o.revealPolicy,
        });

        const { data: existing, error: readError } = await this.ctx.admin
          .from("memory_items")
          .select("id,correction_count,mention_count")
          .eq("id", id)
          .eq("user_id", this.ctx.userId)
          .maybeSingle();

        if (readError) throw readError;
        if (!existing?.id) continue;

        const { data, error } = await this.ctx.admin
          .from("memory_items")
          .update({
            key: key || undefined,
            value: nextValue,
            confidence: clampNumber(o.confidence, 0, 1, 1),
            correction_count: Number(existing.correction_count ?? 0) + 1,
            mention_count: Number(existing.mention_count ?? 0) + 1,
            tier: normalizeTier(o.tier, o.pinned ?? true),
            scope: normalizeScope(o.scope, this.ctx.projectId),
            pinned: !!(o.pinned ?? true),
            locked: !!(o.locked ?? o.is_locked ?? o.isLocked ?? false),
            status: "active",
            deleted_at: null,
            delete_reason: null,
            last_seen_at: now,
            last_reinforced_at: now,
            updated_at: now,
          })
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;
        if (data?.id) appliedIds.push(data.id);
        continue;
      }

      if (op === "CORRECT" || op === "UPSERT") {
        const row = await this.upsertItem({
          key,
          value,
          tier: o.tier,
          scope: o.scope,
          user_trigger_only: o.user_trigger_only ?? o.userTriggerOnly,
          importance: o.importance,
          confidence: o.confidence ?? (op === "CORRECT" ? 1 : undefined),
          pinned: o.pinned ?? op === "CORRECT",
          locked: o.locked ?? o.is_locked ?? o.isLocked,
          display_text: o.display_text ?? o.displayText ?? o.display,
          trigger_terms: o.trigger_terms ?? o.triggerTerms ?? [],
          emotional_weight: o.emotional_weight ?? o.emotionalWeight,
          relational_context: o.relational_context ?? o.relationalContext ?? [],
          reveal_policy: o.reveal_policy ?? o.revealPolicy,
        });

        appliedIds.push(row.id);
        continue;
      }

      if (op === "PIN" && id) {
        const row = await this.pin(id, Boolean(o.pinned ?? true));
        appliedIds.push(row.id);
        continue;
      }

      if ((op === "DISCARD" || op === "DELETE") && id) {
        const row = await this.discard(id, o.reason ?? "memory op discard");
        appliedIds.push(row.id);
        continue;
      }

      if (op === "CONFIRM" && id) {
        const row = await this.confirmFact(id);
        appliedIds.push(row.id);
        continue;
      }
    }

    return Array.from(new Set(appliedIds));
  }

  async pin(id: string, pinned: boolean) {
    const { data, error } = await this.ctx.admin
      .from("memory_items")
      .update({
        pinned,
        tier: pinned ? "core" : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", this.ctx.userId)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeRow(data);
  }

  async discard(id: string, reason = "discarded by user") {
    const now = new Date().toISOString();
    const { data, error } = await this.ctx.admin
      .from("memory_items")
      .update({
        deleted_at: now,
        delete_reason: reason,
        status: "tombstoned",
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", this.ctx.userId)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeRow(data);
  }

  async confirmFact(id: string) {
    const now = new Date().toISOString();
    const { data, error } = await this.ctx.admin
      .from("memory_items")
      .update({
        status: "active",
        deleted_at: null,
        delete_reason: null,
        confidence: 1,
        last_seen_at: now,
        last_reinforced_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", this.ctx.userId)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeRow(data);
  }
}

export function memoryRowToMarkdown(row: MemoryItemRow): string {
  const flags: string[] = [
    row.tier,
    row.scope,
    row.status,
    ...(row.pinned ? ["pinned"] : []),
    ...(row.locked ? ["locked"] : []),
  ].filter(Boolean);

  return `- (${flags}) ${row.key}: ${valueText(row.value)}`;
}
