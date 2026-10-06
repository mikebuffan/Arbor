import { describe, expect, it } from "vitest";
import { reviewExplicitPrivacyRedactions } from "./privacyRedactionReview";
import { recordPrivacyReview } from "./privacyReviewLedger";
import { publicationPreflight } from "./publicationPreflight";

/** Cross-module contract test: synthetic text only; no real identifiers or release. */
describe("reconciled research privacy contracts", () => {
  const redaction = () => reviewExplicitPrivacyRedactions({
    candidate: {
      sourceRecordId: "synthetic-source",
      text: "Synthetic passage [PRIVATE] and public context.",
      spans: [{ startUtf16: 18, endUtf16: 27, reason: "other_sensitive_identifier" }],
    },
    reviewerRef: "synthetic-reviewer",
    reviewedAtUtc: "2026-09-22T01:00:00.000Z",
    reviewerConfirmedAllVisibleTextReviewed: true,
  });

  it("keeps both the redaction and metadata-only ledger on independent release HOLD", () => {
    const reviewed = redaction();
    expect(reviewed.redactedText).toBe("Synthetic passage [REDACTED] and public context.");
    expect(reviewed.status).toBe("hold_for_independent_privacy_and_release_review");
    const ledger = recordPrivacyReview({
      reviewerRef: reviewed.reviewerRef,
      reviewedAtUtc: reviewed.reviewedAtUtc,
      originalPageReviewIds: ["synthetic-page-review"],
      flags: [{
        flagId: "synthetic-flag",
        sourceRecordId: reviewed.sourceRecordId,
        pageRef: "synthetic-page-review",
        decision: "redact",
        redactionArtifactRef: "synthetic-artifact-reference-not-proof",
      }],
    });
    expect(ledger.unresolvedFlagIds).toEqual([]);
    expect(ledger.status).toBe("hold_for_publication_review_and_release_authorization");
    const preflight = publicationPreflight({
      sourceRecordIds: [reviewed.sourceRecordId],
      reviewedOriginalPageIds: ledger.reviewedOriginalPageIds,
      privacyReviewReceiptId: ledger.reviewReceiptRef,
      publicationReviewReceiptId: "synthetic-publication-review-receipt",
      unresolvedPrivacyFlags: ledger.unresolvedFlagIds,
      unresolvedSourceFlags: [],
    });
    expect(preflight.readyForHumanReleaseDecision).toBe(true);
    expect(preflight.sharingStatus).toBe("hold_for_explicit_release_authorization");
  });

  it("propagates withheld and missing-redaction flags to preflight HOLD", () => {
    const ledger = recordPrivacyReview({
      reviewerRef: "synthetic-reviewer",
      reviewedAtUtc: "2026-09-22T01:00:00.000Z",
      originalPageReviewIds: ["synthetic-page-review"],
      flags: [
        { flagId: "withheld", sourceRecordId: "synthetic-source", pageRef: "synthetic-page-review", decision: "withhold", redactionArtifactRef: null },
        { flagId: "missing-artifact", sourceRecordId: "synthetic-source", pageRef: "synthetic-page-review", decision: "redact", redactionArtifactRef: null },
      ],
    });
    const preflight = publicationPreflight({
      sourceRecordIds: ["synthetic-source"],
      reviewedOriginalPageIds: ledger.reviewedOriginalPageIds,
      privacyReviewReceiptId: ledger.reviewReceiptRef,
      publicationReviewReceiptId: "synthetic-publication-review-receipt",
      unresolvedPrivacyFlags: ledger.unresolvedFlagIds,
      unresolvedSourceFlags: [],
    });
    expect(ledger.unresolvedFlagIds).toEqual(["missing-artifact", "withheld"]);
    expect(preflight.readyForHumanReleaseDecision).toBe(false);
    expect(preflight.holdReasons).toContain("unresolved_privacy_flags");
    expect(preflight.sharingStatus).toBe("hold_for_explicit_release_authorization");
  });

  it("a clean declared ledger cannot substitute for independent release review", () => {
    const ledger = recordPrivacyReview({
      reviewerRef: "synthetic-reviewer",
      reviewedAtUtc: "2026-09-22T01:00:00.000Z",
      originalPageReviewIds: ["synthetic-page-review"],
      flags: [],
    });
    const preflight = publicationPreflight({
      sourceRecordIds: ["synthetic-source"],
      reviewedOriginalPageIds: ledger.reviewedOriginalPageIds,
      privacyReviewReceiptId: ledger.reviewReceiptRef,
      publicationReviewReceiptId: null,
      unresolvedPrivacyFlags: ledger.unresolvedFlagIds,
      unresolvedSourceFlags: [],
    });
    expect(preflight.readyForHumanReleaseDecision).toBe(false);
    expect(preflight.holdReasons).toContain("publication_review_required");
    expect(preflight.sharingStatus).toBe("hold_for_explicit_release_authorization");
  });
});
