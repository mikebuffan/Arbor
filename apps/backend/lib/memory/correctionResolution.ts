import type { SupabaseClient } from "@supabase/supabase-js";
import { applyMemoryCorrection } from "@/lib/memory/applyCorrection";
import {
  supersedeMemoryAliases,
  upsertMemoryItems,
} from "@/lib/memory/store";
import { logMemoryEvent } from "@/lib/memory/logger";
import type { MemoryItem, MemoryUpsertResult } from "@/lib/memory/types";

type MemoryScope = "global" | "project" | "conversation";

export type ExplicitMemoryCorrection = {
  subject: string;
  oldValue: string;
  correctedValue: string;
  scopeHint: "current_project" | "global";
};

export type ClassifiedMemoryTurn =
  | {
      kind: "assertion";
      items: MemoryItem[];
    }
  | {
      kind: "correction";
      correction: ExplicitMemoryCorrection;
      extractedReferenceItems: MemoryItem[];
    };

export type CorrectionCandidate = {
  id: string;
  user_id: string;
  project_id: string | null;
  key: string;
  value: unknown;
  tier: string | null;
  scope: MemoryScope;
  importance: number | null;
  confidence: number | null;
  pinned: boolean | null;
  locked: boolean | null;
  correction_count: number | null;
  status: string;
  deleted_at: string | null;
  created_at: string | null;
};

export type CorrectionResolution =
  | {
      status: "resolved";
      canonical: CorrectionCandidate;
      staleAliases: CorrectionCandidate[];
    }
  | {
      status: "not_found" | "not_injected" | "ambiguous";
      canonical: null;
      staleAliases: [];
    };

const KEY_NOISE = new Set([
  "project",
  "global",
  "user",
  "memory",
  "memories",
  "item",
  "fact",
  "fictional",
  "fictionalized",
  "real",
  "current",
  "canonical",
]);

const SUBJECT_NOISE = new Set([
  "a",
  "an",
  "the",
  "this",
  "that",
  "my",
  "our",
  "your",
  "is",
  "was",
]);

function normalizedText(value: string) {
  return value
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/[.!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function tokens(value: string, ignored: Set<string>) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token && !ignored.has(token)),
    ),
  ).sort();
}

export function semanticMemoryKey(key: string) {
  return tokens(key, KEY_NOISE).join(".");
}

function scalarStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(scalarStrings);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(scalarStrings);
}

function normalizedEvidenceText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecallOnlyUserTurn(userText: string) {
  const text = userText.trim();
  return (
    /^(?:what|which|who|where|when|why|how|do|does|did|is|are|was|were|can|could|would|will|have|has|had)\b[\s\S]*\?$/i.test(
      text,
    ) ||
    /^(?:please\s+)?(?:remind|tell|show|repeat|recall)\s+me\b/i.test(text)
  );
}

function memoryValueHasDirectUserEvidence(
  value: unknown,
  userText: string,
) {
  const normalizedUserText = normalizedEvidenceText(userText);
  if (!normalizedUserText) return false;

  const values = scalarStrings(value)
    .map(normalizedEvidenceText)
    .filter((candidate) => candidate.length >= 2);
  if (!values.length) return false;

  const boundedUserText = ` ${normalizedUserText} `;
  return values.every((candidate) =>
    boundedUserText.includes(` ${candidate} `),
  );
}

export function retainUserAuthoredAssertionItems(params: {
  userText: string;
  items: MemoryItem[];
}) {
  if (isRecallOnlyUserTurn(params.userText)) return [];
  return params.items.filter((item) =>
    memoryValueHasDirectUserEvidence(item.value, params.userText),
  );
}

function candidateHasExactValue(
  candidate: CorrectionCandidate,
  value: string,
) {
  const expected = normalizedText(value);
  return scalarStrings(candidate.value).some(
    (candidateValue) => normalizedText(candidateValue) === expected,
  );
}

function candidateMatchesSubject(
  candidate: CorrectionCandidate,
  subject: string,
) {
  const subjectTokens = tokens(subject, SUBJECT_NOISE);
  const keyTokens = new Set(tokens(candidate.key, KEY_NOISE));
  return (
    subjectTokens.length > 0 &&
    subjectTokens.every((token) => keyTokens.has(token))
  );
}

function candidateIsInScope(params: {
  candidate: CorrectionCandidate;
  userId: string;
  projectId: string | null;
  correction: ExplicitMemoryCorrection;
}) {
  const { candidate, userId, projectId, correction } = params;
  if (
    candidate.user_id !== userId ||
    candidate.status !== "active" ||
    candidate.deleted_at !== null
  ) {
    return false;
  }

  if (correction.scopeHint === "global") {
    return candidate.scope === "global" && candidate.project_id === null;
  }

  return (
    projectId !== null &&
    candidate.scope !== "global" &&
    candidate.project_id === projectId
  );
}

function rankCanonical(
  left: CorrectionCandidate,
  right: CorrectionCandidate,
) {
  const leftRank = [
    left.locked ? 1 : 0,
    left.pinned || left.tier === "core" ? 1 : 0,
    Number(left.correction_count ?? 0),
    Number(left.importance ?? 0),
    Number(left.confidence ?? 0),
  ];
  const rightRank = [
    right.locked ? 1 : 0,
    right.pinned || right.tier === "core" ? 1 : 0,
    Number(right.correction_count ?? 0),
    Number(right.importance ?? 0),
    Number(right.confidence ?? 0),
  ];

  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] !== rightRank[index]) {
      return rightRank[index] - leftRank[index];
    }
  }

  const created = String(left.created_at ?? "").localeCompare(
    String(right.created_at ?? ""),
  );
  if (created !== 0) return created;
  return left.id.localeCompare(right.id);
}

export function parseExplicitMemoryCorrection(
  userText: string,
): ExplicitMemoryCorrection | null {
  const marker =
    /^\s*(?:correction|actually|i\s+meant|let\s+me\s+clarify)\s*:?\s*/i;
  if (!marker.test(userText)) return null;

  const body = userText.replace(marker, "").trim();
  const match = body.match(
    /^(?:the\s+)?(.{2,80}?)\s+(?:is|should\s+be|was\s+meant\s+to\s+be)\s+(.{1,120}?)\s*,?\s+(?:not|instead\s+of|rather\s+than)\s+(.{1,120}?)\s*[.!?]?$/i,
  );
  if (!match) return null;

  const subject = match[1].trim();
  const correctedValue = match[2].trim();
  const oldValue = match[3].trim().replace(/[.!?]+$/g, "");
  if (!subject || !correctedValue || !oldValue) return null;

  return {
    subject,
    oldValue,
    correctedValue,
    scopeHint: /\b(?:globally|all\s+projects|every\s+project|everywhere)\b/i.test(
      userText,
    )
      ? "global"
      : "current_project",
  };
}

export function classifyMemoryTurn(params: {
  userText: string;
  extractedItems: MemoryItem[];
}): ClassifiedMemoryTurn {
  const correction = parseExplicitMemoryCorrection(params.userText);
  if (!correction) {
    return {
      kind: "assertion",
      items: retainUserAuthoredAssertionItems({
        userText: params.userText,
        items: params.extractedItems,
      }),
    };
  }

  return {
    kind: "correction",
    correction,
    extractedReferenceItems: params.extractedItems,
  };
}

export function resolveExplicitCorrection(params: {
  userId: string;
  projectId: string | null;
  correction: ExplicitMemoryCorrection;
  candidates: CorrectionCandidate[];
  injectedMemoryIds: string[];
}): CorrectionResolution {
  const scoped = params.candidates.filter(
    (candidate) =>
      candidateIsInScope({
        candidate,
        userId: params.userId,
        projectId: params.projectId,
        correction: params.correction,
      }) &&
      candidateHasExactValue(candidate, params.correction.oldValue) &&
      candidateMatchesSubject(candidate, params.correction.subject),
  );
  if (!scoped.length) {
    return { status: "not_found", canonical: null, staleAliases: [] };
  }

  const injected = new Set(params.injectedMemoryIds);
  if (!scoped.some((candidate) => injected.has(candidate.id))) {
    return { status: "not_injected", canonical: null, staleAliases: [] };
  }

  const groups = new Map<string, CorrectionCandidate[]>();
  for (const candidate of scoped) {
    const signature = semanticMemoryKey(candidate.key);
    const group = groups.get(signature) ?? [];
    group.push(candidate);
    groups.set(signature, group);
  }
  if (groups.size !== 1) {
    return { status: "ambiguous", canonical: null, staleAliases: [] };
  }

  const equivalent = [...groups.values()][0];
  const locked = equivalent.filter((candidate) => candidate.locked);
  if (locked.length > 1) {
    return { status: "ambiguous", canonical: null, staleAliases: [] };
  }

  const canonical = [...equivalent].sort(rankCanonical)[0];
  return {
    status: "resolved",
    canonical,
    staleAliases: equivalent.filter(
      (candidate) => candidate.id !== canonical.id,
    ),
  };
}

export async function loadActiveCorrectionCandidates(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string | null;
  scopeHint: ExplicitMemoryCorrection["scopeHint"];
}) {
  let query = params.supabase
    .from("memory_items")
    .select(
      "id,user_id,project_id,key,value,tier,scope,importance,confidence,pinned,locked,correction_count,status,deleted_at,created_at",
    )
    .eq("user_id", params.userId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (params.scopeHint === "global" || params.projectId === null) {
    query = query.is("project_id", null).eq("scope", "global");
  } else {
    query = query.eq("project_id", params.projectId).neq("scope", "global");
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CorrectionCandidate[];
}

const emptyUpsertResult = (): MemoryUpsertResult => ({
  created: [],
  updated: [],
  locked: [],
  ignored: [],
});

type PersistenceDependencies = {
  loadCandidates: typeof loadActiveCorrectionCandidates;
  applyCorrection: typeof applyMemoryCorrection;
  supersedeAliases: typeof supersedeMemoryAliases;
  upsertItems: typeof upsertMemoryItems;
};

const defaultDependencies: PersistenceDependencies = {
  loadCandidates: loadActiveCorrectionCandidates,
  applyCorrection: applyMemoryCorrection,
  supersedeAliases: supersedeMemoryAliases,
  upsertItems: upsertMemoryItems,
};

export async function persistClassifiedMemoryTurn(
  params: {
    supabase: SupabaseClient;
    userId: string;
    projectId: string | null;
    classified: ClassifiedMemoryTurn;
    injectedMemoryIds: string[];
  },
  dependencyOverrides: Partial<PersistenceDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  if (params.classified.kind === "assertion") {
    return {
      kind: "assertion" as const,
      upsert: await dependencies.upsertItems(
        params.userId,
        params.classified.items,
        params.projectId,
        params.supabase,
      ),
    };
  }

  const candidates = await dependencies.loadCandidates({
    supabase: params.supabase,
    userId: params.userId,
    projectId: params.projectId,
    scopeHint: params.classified.correction.scopeHint,
  });
  const resolution = resolveExplicitCorrection({
    userId: params.userId,
    projectId: params.projectId,
    correction: params.classified.correction,
    candidates,
    injectedMemoryIds: params.injectedMemoryIds,
  });

  if (resolution.status !== "resolved") {
    await logMemoryEvent("correction_unresolved", {
      userId: params.userId,
      projectId: params.projectId,
      status: resolution.status,
    });
    return {
      kind: "correction" as const,
      resolution,
      corrected: null,
      supersededIds: [],
      upsert: emptyUpsertResult(),
    };
  }

  const correctionProjectId =
    params.classified.correction.scopeHint === "global"
      ? null
      : params.projectId;
  const corrected = await dependencies.applyCorrection({
    supabase: params.supabase,
    userId: params.userId,
    projectId: correctionProjectId,
    key: resolution.canonical.key,
    correctedValue: params.classified.correction.correctedValue,
  });
  const supersededIds = await dependencies.supersedeAliases({
    supabase: params.supabase,
    authedUserId: params.userId,
    projectId: correctionProjectId,
    canonicalId: resolution.canonical.id,
    aliases: resolution.staleAliases.map((candidate) => ({
      id: candidate.id,
      key: candidate.key,
    })),
  });
  await logMemoryEvent("correction_converged", {
    userId: params.userId,
    projectId: correctionProjectId,
    status: "applied",
    supersededCount: supersededIds.length,
  });

  return {
    kind: "correction" as const,
    resolution,
    corrected,
    supersededIds,
    upsert: emptyUpsertResult(),
  };
}
