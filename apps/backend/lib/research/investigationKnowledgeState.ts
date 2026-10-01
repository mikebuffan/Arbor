export type InvestigationKnowledgeRecord = {
  subjectId: string;
  factKey: string;
  learnedAt: string;
  evidenceRef: string;
  lineageKey: string;
  mode: "explicit_receipt" | "explicit_statement" | "documented_access" | "inferred_access";
};

export type InvestigationActionRecord = {
  subjectId: string;
  actionKey: string;
  actionAt: string;
  evidenceRef: string;
  requiredFactKeys: string[];
};

export type InvestigationKnowledgeGap = {
  subjectId: string;
  actionKey: string;
  factKey: string;
  actionAt: string;
  earliestDocumentedKnowledgeAt: string | null;
  status:
    | "knowledge_documented_before_action"
    | "action_precedes_documented_knowledge"
    | "knowledge_not_documented";
  actionEvidenceRef: string;
  knowledgeEvidenceRefs: string[];
  note:
    "A documentation gap is not proof the subject lacked knowledge or obtained it improperly.";
};

function text(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("knowledge_state_invalid_" + field);
  }
  return value.trim();
}

function iso(value: unknown, field: string): string {
  const raw = text(value, field, 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("knowledge_state_invalid_" + field);
  }
  return raw;
}

function strings(value: unknown, field: string, maxItems = 100): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > maxItems) {
    throw new Error("knowledge_state_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("knowledge_state_duplicate_" + field);
  }
  return out;
}

function validateKnowledge(
  value: InvestigationKnowledgeRecord,
): InvestigationKnowledgeRecord {
  const modes = [
    "explicit_receipt",
    "explicit_statement",
    "documented_access",
    "inferred_access",
  ];
  if (!modes.includes(value.mode)) {
    throw new Error("knowledge_state_invalid_mode");
  }
  return {
    subjectId: text(value.subjectId, "subject_id", 300),
    factKey: text(value.factKey, "fact_key", 1000),
    learnedAt: iso(value.learnedAt, "learned_at"),
    evidenceRef: text(value.evidenceRef, "evidence_ref", 1000),
    lineageKey: text(value.lineageKey, "lineage_key", 1000),
    mode: value.mode,
  };
}

function validateAction(
  value: InvestigationActionRecord,
): InvestigationActionRecord {
  return {
    subjectId: text(value.subjectId, "subject_id", 300),
    actionKey: text(value.actionKey, "action_key", 1000),
    actionAt: iso(value.actionAt, "action_at"),
    evidenceRef: text(value.evidenceRef, "evidence_ref", 1000),
    requiredFactKeys: strings(
      value.requiredFactKeys,
      "required_fact_keys",
      50,
    ),
  };
}

export function analyzeKnowledgeState(input: {
  knowledge: InvestigationKnowledgeRecord[];
  actions: InvestigationActionRecord[];
}): InvestigationKnowledgeGap[] {
  if (!Array.isArray(input.knowledge) || input.knowledge.length > 10_000) {
    throw new Error("knowledge_state_invalid_knowledge");
  }
  if (!Array.isArray(input.actions) || input.actions.length > 10_000) {
    throw new Error("knowledge_state_invalid_actions");
  }

  const knowledge = input.knowledge.map(validateKnowledge);
  const actions = input.actions.map(validateAction);

  const bySubjectFact = new Map<string, InvestigationKnowledgeRecord[]>();
  for (const record of knowledge) {
    const key = record.subjectId + "::" + record.factKey;
    bySubjectFact.set(key, [
      ...(bySubjectFact.get(key) ?? []),
      record,
    ]);
  }
  for (const records of bySubjectFact.values()) {
    records.sort((a, b) => Date.parse(a.learnedAt) - Date.parse(b.learnedAt));
  }

  const gaps: InvestigationKnowledgeGap[] = [];
  for (const action of actions) {
    for (const factKey of action.requiredFactKeys) {
      const records = bySubjectFact.get(
        action.subjectId + "::" + factKey,
      ) ?? [];
      const earliest = records[0] ?? null;
      let status: InvestigationKnowledgeGap["status"];
      if (!earliest) {
        status = "knowledge_not_documented";
      } else if (Date.parse(earliest.learnedAt) <= Date.parse(action.actionAt)) {
        status = "knowledge_documented_before_action";
      } else {
        status = "action_precedes_documented_knowledge";
      }
      gaps.push({
        subjectId: action.subjectId,
        actionKey: action.actionKey,
        factKey,
        actionAt: action.actionAt,
        earliestDocumentedKnowledgeAt: earliest?.learnedAt ?? null,
        status,
        actionEvidenceRef: action.evidenceRef,
        knowledgeEvidenceRefs: records.map((record) => record.evidenceRef),
        note:
          "A documentation gap is not proof the subject lacked knowledge or obtained it improperly.",
      });
    }
  }
  return gaps;
}
