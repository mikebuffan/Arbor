export function isMissingRuntimeTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const record = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };

  const text = `${String(record.message ?? "")} ${String(
    record.details ?? "",
  )}`.toLowerCase();

  return (
    record.code === "42P01" ||
    record.code === "PGRST205" ||
    text.includes("arbor_runtime_state") ||
    text.includes("arbor_conversation_state") ||
    text.includes("arbor_timeline_events") ||
    text.includes("annabelle_workspace_state") ||
    text.includes("annabelle_workspace_revisions") ||
    text.includes("arbor_agency_strategy_candidates")
  );
}
