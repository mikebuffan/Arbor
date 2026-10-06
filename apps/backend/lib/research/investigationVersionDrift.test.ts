import { describe, expect, it } from "vitest";
import { analyzeVersionDrift } from "./investigationVersionDrift";

const A = "a".repeat(64);
const B = "b".repeat(64);

describe("document version drift", () => {
  it("records field/page/hash changes without calling them tampering", () => {
    const [drift] = analyzeVersionDrift([
      {
        versionId: "v1",
        documentKey: "doc:1",
        releasedAt: "2026-01-01T00:00:00Z",
        contentSha256: A,
        pageCount: 10,
        fields: { redaction: "present", name: "visible" },
        evidenceRef: "release:v1",
      },
      {
        versionId: "v2",
        documentKey: "doc:1",
        releasedAt: "2026-02-01T00:00:00Z",
        contentSha256: B,
        pageCount: 11,
        fields: { redaction: "removed", name: "visible" },
        evidenceRef: "release:v2",
      },
    ]);

    expect(drift).toMatchObject({
      fromVersionId: "v1",
      toVersionId: "v2",
      changedFieldKeys: ["redaction"],
      pageCountDelta: 1,
      contentHashChanged: true,
      status: "content_change",
    });
    expect(drift.note).toContain("not proof of tampering");
  });

  it("rejects comparisons across different document identities", () => {
    expect(() => analyzeVersionDrift([
      {
        versionId: "v1",
        documentKey: "doc:1",
        releasedAt: "2026-01-01T00:00:00Z",
        contentSha256: A,
        pageCount: 1,
        fields: {},
        evidenceRef: "e1",
      },
      {
        versionId: "v2",
        documentKey: "doc:2",
        releasedAt: "2026-02-01T00:00:00Z",
        contentSha256: B,
        pageCount: 1,
        fields: {},
        evidenceRef: "e2",
      },
    ])).toThrow("version_drift_document_key_mismatch");
  });
});
