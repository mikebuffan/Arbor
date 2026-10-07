export type VaultResult = {
  result_kind: string;
  result_id: string;
  result_key: string;
  title: string;
  domain: string;
  summary: string | null;
  status: string;
  rank: number | null;
};

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function score(query: string, values: string[]): number {
  const q = query.toLowerCase();
  let best = 0;
  for (const raw of values) {
    const value = raw.toLowerCase();
    if (!value) continue;
    if (value === q) best = Math.max(best, 1);
    else if (value.startsWith(q)) best = Math.max(best, 0.9);
    else if (value.includes(q)) best = Math.max(best, 0.6);
  }
  return best;
}

function result(
  kind: string,
  row: Row,
  query: string,
  input: {
    id: string;
    key: string;
    title: string;
    domain: string;
    summary?: string;
    status?: string;
    search: string[];
  },
): VaultResult | null {
  const rank = score(query, input.search);
  if (rank <= 0) return null;
  return {
    result_kind: kind,
    result_id: input.id,
    result_key: input.key,
    title: input.title,
    domain: input.domain,
    summary: input.summary || null,
    status: input.status || "unknown",
    rank,
  };
}

export function searchVaultRows(
  input: {
    entries: Row[];
    capabilities: Row[];
    codeArtifacts: Row[];
    observations: Row[];
    dossiers: Row[];
  },
  query: string,
  limit = 40,
): VaultResult[] {
  const q = query.trim();
  if (!q) return [];

  const found: VaultResult[] = [];

  for (const row of input.entries) {
    const item = result("knowledge", row, q, {
      id: text(row.id),
      key: text(row.slug),
      title: text(row.title),
      domain: text(row.domain) || "knowledge",
      summary: text(row.summary),
      status: text(row.status),
      search: [
        text(row.slug),
        text(row.title),
        text(row.domain),
        text(row.summary),
        text(row.status),
      ],
    });
    if (item) found.push(item);
  }

  for (const row of input.capabilities) {
    const item = result("capability", row, q, {
      id: text(row.id),
      key: text(row.capability_key),
      title: text(row.name),
      domain: text(row.category) || "capability",
      summary: text(row.description),
      status: text(row.current_state),
      search: [
        text(row.capability_key),
        text(row.name),
        text(row.category),
        text(row.description),
        text(row.current_state),
      ],
    });
    if (item) found.push(item);
  }

  for (const row of input.codeArtifacts) {
    const summary = [text(row.repository), text(row.path)]
      .filter(Boolean)
      .join(":");
    const item = result("code", row, q, {
      id: text(row.id),
      key: text(row.artifact_key),
      title: text(row.name),
      domain: text(row.subsystem) || "code",
      summary,
      status: text(row.status),
      search: [
        text(row.artifact_key),
        text(row.name),
        text(row.subsystem),
        text(row.repository),
        text(row.path),
        text(row.status),
      ],
    });
    if (item) found.push(item);
  }

  for (const row of input.observations) {
    const observation = text(row.observation);
    const item = result("observation", row, q, {
      id: text(row.id),
      key: text(row.observation_key),
      title: observation.slice(0, 120) || text(row.observation_key),
      domain: "self_observation",
      summary: observation,
      status: text(row.status),
      search: [
        text(row.observation_key),
        observation,
        text(row.status),
      ],
    });
    if (item) found.push(item);
  }

  for (const row of input.dossiers) {
    const item = result("dossier", row, q, {
      id: text(row.id),
      key: text(row.dossier_key),
      title: text(row.title),
      domain: text(row.audience) || "dossier",
      summary: text(row.purpose),
      status: "generated",
      search: [
        text(row.dossier_key),
        text(row.title),
        text(row.audience),
        text(row.purpose),
      ],
    });
    if (item) found.push(item);
  }

  return found
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, Math.min(limit, 100)));
}
