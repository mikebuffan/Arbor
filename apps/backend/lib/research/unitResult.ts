/** Bounded, lossless JSON only: receipts must survive a process restart. */
export function validateResearchUnitResult(value: unknown): asserts value is Record<string, unknown> {
  const seen = new Set<object>();
  let nodes = 0;
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > 10000 || depth > 20) throw new Error("research_result_limit");
    if (v === null || typeof v === "string" || typeof v === "boolean") return;
    if (typeof v === "number" && Number.isFinite(v)) return;
    if (typeof v !== "object" || seen.has(v)) throw new Error("invalid_research_result_json");
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) throw new Error("invalid_research_result_json");
    seen.add(v);
    for (const item of Object.values(v)) visit(item, depth + 1);
    seen.delete(v);
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_research_result_json");
  visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 262144) throw new Error("research_result_limit");
}
