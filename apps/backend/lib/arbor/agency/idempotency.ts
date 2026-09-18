import type { SupabaseClient } from "@supabase/supabase-js";

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
    .select("result")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("idempotency_key", input.key)
    .maybeSingle();

  if (readError) throw readError;
  return { acquired: false, result: data?.result ?? null };
}

export async function completeAgencyOperation(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  key: string;
  result: unknown;
}): Promise<void> {
  const { error } = await input.supabase
    .from("arbor_agency_idempotency")
    .update({ result: input.result })
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("idempotency_key", input.key);
  if (error) throw error;
}
