/**
 * Synthetic, owner/project-scoped RELATION experiment alongside the learned router.
 * Speaker and addressee IDs and all receipts MUST come from a trusted host.
 * This is a symbolic graph, NOT inferred pronoun semantics, memory truth or an LLM.
 */
export type RelationRef = "speaker" | "addressee" | "named";
export type NicknameEdge = {
  id: string;
  subjectId: string;
  nicknameId: string;
  relation: "has_nickname";
  status: "asserted" | "contested";
  evidenceRefs: string[];
  /** Routing salience, never a probability the nickname belongs to someone. */
  strength: number;
};
export type RelationGraph = {
  userId: string;
  projectId: string;
  edges: NicknameEdge[];
  receipts: { id: string; payload: string }[];
};
export type NicknameAssertion = {
  userId: string;
  projectId: string;
  speakerId: string;
  addresseeId: string;
  subjectRef: RelationRef;
  namedSubjectId?: string;
  nicknameId: string;
  evidenceRef: string;
};
export type NicknameQueryResult = {
  matches: NicknameEdge[];
  grantsExecution: false;
  /** User assertion, not independent proof of nickname ownership. */
  sourceKind: "source_assertions_only";
};
function required(value: string | undefined, error: string): string {
  if (!value?.trim()) throw new Error(error);
  return value.trim();
}
function checkScope(state: RelationGraph, userId: string, projectId: string): void {
  if (!userId.trim() || !projectId.trim() || state.userId !== userId || state.projectId !== projectId)
    throw new Error("relation_scope_mismatch");
}
export function newRelationGraph(userId: string, projectId: string): RelationGraph {
  required(userId, "relation_scope_required");
  required(projectId, "relation_scope_required");
  return { userId, projectId, edges: [], receipts: [] };
}
/** Deictic reference is resolved from authenticated host-supplied roles, not text. */
export function resolveRelationSubject(assertion: NicknameAssertion): string {
  if (assertion.subjectRef === "speaker") return required(assertion.speakerId, "relation_speaker_required");
  if (assertion.subjectRef === "addressee") return required(assertion.addresseeId, "relation_addressee_required");
  if (assertion.subjectRef === "named") return required(assertion.namedSubjectId, "relation_named_subject_required");
  throw new Error("relation_reference_invalid");
}
function edgeId(subjectId: string, nicknameId: string): string {
  return JSON.stringify([subjectId, "has_nickname", nicknameId]);
}
/** Records that an assertion was observed; no silent exclusive-alias rule. */
export function assertNicknameRelation(state: RelationGraph, assertion: NicknameAssertion): RelationGraph {
  checkScope(state, assertion.userId, assertion.projectId);
  const subjectId = resolveRelationSubject(assertion);
  const nicknameId = required(assertion.nicknameId, "relation_nickname_required");
  const receiptId = required(assertion.evidenceRef, "relation_evidence_required");
  const payload = edgeId(subjectId, nicknameId);
  const used = state.receipts.find(receipt => receipt.id === receiptId);
  if (used) {
    if (used.payload !== payload) throw new Error("relation_receipt_conflict");
    return state;
  }
  const existing = state.edges.find(edge => edge.id === payload);
  if (existing?.status === "contested") throw new Error("relation_contested_requires_review");
  const edges = existing
    ? state.edges.map(edge => edge.id === payload ? { ...edge,
        evidenceRefs: [...edge.evidenceRefs, receiptId], strength: Math.min(1, edge.strength + 0.05),
      } : edge)
    : [...state.edges, {
        id: payload, subjectId, nicknameId, relation: "has_nickname" as const,
        status: "asserted" as const, strength: 0.5, evidenceRefs: [receiptId],
      }];
  return { ...state, edges, receipts: [...state.receipts, { id: receiptId, payload }] };
}
/** Contradiction preserves original provenance and marks edge for explicit review. */
export function contestNicknameRelation(state: RelationGraph, input: {
  userId: string; projectId: string; subjectId: string; nicknameId: string; evidenceRef: string;
}): RelationGraph {
  checkScope(state, input.userId, input.projectId);
  const id = edgeId(required(input.subjectId, "relation_subject_required"),
    required(input.nicknameId, "relation_nickname_required"));
  const receiptId = required(input.evidenceRef, "relation_evidence_required");
  const payload = `contest:${id}`;
  const used = state.receipts.find(receipt => receipt.id === receiptId);
  if (used) {
    if (used.payload !== payload) throw new Error("relation_receipt_conflict");
    return state;
  }
  if (!state.edges.some(edge => edge.id === id)) throw new Error("relation_edge_not_found");
  return {
    ...state,
    edges: state.edges.map(edge => edge.id === id
      ? { ...edge, status: "contested" as const, evidenceRefs: [...edge.evidenceRefs, receiptId] }
      : edge),
    receipts: [...state.receipts, { id: receiptId, payload }],
  };
}
/** Non-exclusive lookup; a name may legitimately be used by multiple subjects. */
export function nicknameOwners(state: RelationGraph, input: {
  userId: string; projectId: string; nicknameId: string;
}): NicknameQueryResult {
  checkScope(state, input.userId, input.projectId);
  const nicknameId = required(input.nicknameId, "relation_nickname_required");
  return { matches: state.edges.filter(edge => edge.nicknameId === nicknameId && edge.status === "asserted")
    .map(edge => ({ ...edge, evidenceRefs: [...edge.evidenceRefs] })),
    grantsExecution: false, sourceKind: "source_assertions_only" };
}
export function subjectNicknames(state: RelationGraph, input: {
  userId: string; projectId: string; subjectId: string;
}): NicknameQueryResult {
  checkScope(state, input.userId, input.projectId);
  const subjectId = required(input.subjectId, "relation_subject_required");
  return { matches: state.edges.filter(edge => edge.subjectId === subjectId && edge.status === "asserted")
    .map(edge => ({ ...edge, evidenceRefs: [...edge.evidenceRefs] })),
    grantsExecution: false, sourceKind: "source_assertions_only" };
}