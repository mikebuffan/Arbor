import type { SupabaseClient } from "@supabase/supabase-js";

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function agencyOperationKey(input: {
  turnId: string;
  toolName: string;
  args: Record<string, unknown>;
}): string {
  return [input.turnId, input.toolName, stableJson(input.args)].join(":");
}

export type IdempotencyClaim =
  | { acquired: true; result: null }
  | { acquired: false; result: unknown };

export async function claimAgencyOperation(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  key: string;
  operation: string;
}): Promise<IdempotencyClaim> {
  const row = {
    user_id: input.userId,
    project_id: input.projectId,
    idempotency_key: input.key,
    operation: input.operation,
  };

  const { error } = await input.supabase
    .from("arbor_agency_idempotency")
    .insert(row);

  if (!error) return { acquired: true, result: null };

  // Postgres unique violation: another execution already owns this key.
  if ((error as { code?: string }).code !== "23505") throw error;

  const { data, error: readError } = await input.supabase
    .from("arbor_agency_idempotency")
    .select("operation,result")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("idempotency_key", input.key)
    .maybeSingle();

  if (readError) throw readError;
  if (!data || data.operation !== input.operation) throw new Error("agency_idempotency_operation_mismatch");
  return { acquired: false, result: data.result ?? null };
}

export async function completeAgencyOperation(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  key: string;
  operation: string;
  result: unknown;
}): Promise<void> {
  const { data, error } = await input.supabase
    .from("arbor_agency_idempotency")
    .update({ result: input.result })
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("idempotency_key", input.key).eq("operation", input.operation).is("result", null).select("id");
  if (error) throw error;
  if (data?.length !== 1) throw new Error("agency_idempotency_completion_conflict");
}
