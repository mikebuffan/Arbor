export type InvestigationDocumentVersion = {
  versionId: string;
  documentKey: string;
  releasedAt: string;
  contentSha256: string;
  pageCount: number;
  fields: Record<string, string | null>;
  evidenceRef: string;
};

export type InvestigationVersionDrift = {
  documentKey: string;
  fromVersionId: string;
  toVersionId: string;
  changedFieldKeys: string[];
  pageCountDelta: number;
  contentHashChanged: boolean;
  status: "metadata_only_change" | "content_change";
  evidenceRefs: string[];
  note:
    "A document-version change requires explanation and provenance preservation; it is not proof of tampering.";
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("version_drift_invalid_" + field);
  }
  return value.trim();
}

function iso(value: unknown): string {
  const raw = text(value, "released_at", 100);
  if (!Number.isFinite(Date.parse(raw))) {
    throw new Error("version_drift_invalid_released_at");
  }
  return raw;
}

function sha(value: unknown): string {
  const raw = text(value, "sha256", 64).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    throw new Error("version_drift_invalid_sha256");
  }
  return raw;
}

function fields(value: unknown): Record<string, string | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("version_drift_invalid_fields");
  }
  const out: Record<string, string | null> = {};
  for (const [key, raw] of Object.entries(value)) {
    const cleanKey = text(key, "field_key", 500);
    if (raw !== null && typeof raw !== "string") {
      throw new Error("version_drift_invalid_field_value");
    }
    out[cleanKey] = raw === null ? null : raw.trim();
  }
  return out;
}

function validate(
  version: InvestigationDocumentVersion,
): InvestigationDocumentVersion {
  if (!Number.isSafeInteger(version.pageCount) ||
      version.pageCount < 0 ||
      version.pageCount > 100_000) {
    throw new Error("version_drift_invalid_page_count");
  }
  return {
    versionId: text(version.versionId, "version_id", 300),
    documentKey: text(version.documentKey, "document_key", 1000),
    releasedAt: iso(version.releasedAt),
    contentSha256: sha(version.contentSha256),
    pageCount: version.pageCount,
    fields: fields(version.fields),
    evidenceRef: text(version.evidenceRef, "evidence_ref", 1000),
  };
}

export function analyzeVersionDrift(
  versionsInput: InvestigationDocumentVersion[],
): InvestigationVersionDrift[] {
  if (!Array.isArray(versionsInput) ||
      versionsInput.length < 2 ||
      versionsInput.length > 1000) {
    throw new Error("version_drift_requires_multiple_versions");
  }
  const versions = versionsInput.map(validate);
  if (new Set(versions.map((v) => v.versionId)).size !== versions.length) {
    throw new Error("version_drift_duplicate_version_id");
  }
  const documentKeys = new Set(versions.map((v) => v.documentKey));
  if (documentKeys.size !== 1) {
    throw new Error("version_drift_document_key_mismatch");
  }

  versions.sort((a, b) => Date.parse(a.releasedAt) - Date.parse(b.releasedAt));
  const out: InvestigationVersionDrift[] = [];
  for (let i = 1; i < versions.length; i += 1) {
    const from = versions[i - 1];
    const to = versions[i];
    const keys = new Set([
      ...Object.keys(from.fields),
      ...Object.keys(to.fields),
    ]);
    const changedFieldKeys = [...keys]
      .filter((key) => from.fields[key] !== to.fields[key])
      .sort();
    const contentHashChanged = from.contentSha256 !== to.contentSha256;
    const pageCountDelta = to.pageCount - from.pageCount;
    out.push({
      documentKey: from.documentKey,
      fromVersionId: from.versionId,
      toVersionId: to.versionId,
      changedFieldKeys,
      pageCountDelta,
      contentHashChanged,
      status:
        contentHashChanged || changedFieldKeys.length || pageCountDelta
          ? "content_change"
          : "metadata_only_change",
      evidenceRefs: [from.evidenceRef, to.evidenceRef],
      note:
        "A document-version change requires explanation and provenance preservation; it is not proof of tampering.",
    });
  }
  return out;
}
