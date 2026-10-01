export type InvestigationRoleProfile = {
  subjectId: string;
  roleKey: string;
  expectedActionTags: string[];
  basisEvidenceRefs: string[];
};

export type InvestigationRoleAction = {
  subjectId: string;
  actionTag: string;
  occurredAt: string;
  evidenceRef: string;
  lineageKey: string;
};

export type InvestigationRoleMismatch = {
  subjectId: string;
  roleKey: string;
  actionTag: string;
  occurrenceCount: number;
  independentLineages: string[];
  evidenceRefs: string[];
  status: "within_documented_role" | "role_action_mismatch_lead";
  note:
    "An action outside the documented role baseline is a question about function, not evidence of misconduct.";
};

function text(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("role_mismatch_invalid_" + field);
  }
  return value.trim();
}

function strings(value: unknown, field: string, min = 1, max = 100): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new Error("role_mismatch_invalid_" + field);
  }
  return [...new Set(value.map((item) => text(item, field, 1000)))];
}

export function detectRoleActionMismatches(input: {
  profiles: InvestigationRoleProfile[];
  actions: InvestigationRoleAction[];
  minIndependentLineages?: number;
}): InvestigationRoleMismatch[] {
  if (!Array.isArray(input.profiles) || input.profiles.length > 1000) {
    throw new Error("role_mismatch_invalid_profiles");
  }
  if (!Array.isArray(input.actions) || input.actions.length > 10_000) {
    throw new Error("role_mismatch_invalid_actions");
  }
  const minLineages = Math.max(
    1,
    Math.min(input.minIndependentLineages ?? 2, 10),
  );

  const profiles = new Map<string, InvestigationRoleProfile>();
  for (const profile of input.profiles) {
    const subjectId = text(profile.subjectId, "subject_id", 300);
    if (profiles.has(subjectId)) {
      throw new Error("role_mismatch_duplicate_profile");
    }
    profiles.set(subjectId, {
      subjectId,
      roleKey: text(profile.roleKey, "role_key", 1000),
      expectedActionTags: strings(
        profile.expectedActionTags,
        "expected_action_tags",
        1,
        100,
      ),
      basisEvidenceRefs: strings(
        profile.basisEvidenceRefs,
        "basis_evidence_refs",
        1,
        100,
      ),
    });
  }

  const grouped = new Map<string, InvestigationRoleAction[]>();
  for (const raw of input.actions) {
    const action: InvestigationRoleAction = {
      subjectId: text(raw.subjectId, "subject_id", 300),
      actionTag: text(raw.actionTag, "action_tag", 500),
      occurredAt: text(raw.occurredAt, "occurred_at", 100),
      evidenceRef: text(raw.evidenceRef, "evidence_ref", 1000),
      lineageKey: text(raw.lineageKey, "lineage_key", 1000),
    };
    if (!Number.isFinite(Date.parse(action.occurredAt))) {
      throw new Error("role_mismatch_invalid_occurred_at");
    }
    const key = action.subjectId + "::" + action.actionTag;
    grouped.set(key, [...(grouped.get(key) ?? []), action]);
  }

  const out: InvestigationRoleMismatch[] = [];
  for (const [key, actions] of grouped.entries()) {
    const [subjectId, actionTag] = key.split("::");
    const profile = profiles.get(subjectId);
    if (!profile) continue;
    const lineages = [
      ...new Set(actions.map((action) => action.lineageKey)),
    ].sort();
    const within = profile.expectedActionTags.includes(actionTag);
    const status =
      within || lineages.length < minLineages
        ? "within_documented_role"
        : "role_action_mismatch_lead";
    out.push({
      subjectId,
      roleKey: profile.roleKey,
      actionTag,
      occurrenceCount: actions.length,
      independentLineages: lineages,
      evidenceRefs: [
        ...new Set([
          ...profile.basisEvidenceRefs,
          ...actions.map((action) => action.evidenceRef),
        ]),
      ].sort(),
      status,
      note:
        "An action outside the documented role baseline is a question about function, not evidence of misconduct.",
    });
  }
  return out;
}
