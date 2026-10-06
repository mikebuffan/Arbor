/**
 * Source-first research comparison. Neither text extraction nor a language
 * model narrative is sufficient to certify a discrepancy. This module
 * prepares REVIEW CANDIDATES, never autonomous "confirmed" findings.
 *
 * Public-release-only contract: callers must separately screen for victim,
 * witness, and other private-person identifying information before sharing.
 */
export type PublicSourceLocator = {
  documentId: string;
  sourceUrl: string;
  pdfPage: number; // 1-based physical PDF page, NOT the printed report folio.
  printedPage?: string;
  excerpt: string;
  sha256?: string; // SHA-256 of original bytes, if genuinely captured.
};

export type DocumentObservation = {
  statement: string;
  source: PublicSourceLocator;
};

export type ComparisonType =
  | "apparent_mismatch"
  | "missing_context"
  | "corroboration"
  | "already_documented";

export type EvidenceComparisonDraft = {
  id: string;
  question: string;
  left: DocumentObservation;
  right: DocumentObservation;
  comparisonType: ComparisonType;
  explanation: string;
  limitations: string;
  reviewStatus: "needs_independent_verification";
  sharingStatus: "hold_for_privacy_and_source_review";
};

function nonempty(value: string, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("invalid_research_" + label);
  }
  return value.trim();
}

export function validatePublicSourceLocator(source: PublicSourceLocator): void {
  nonempty(source.documentId, "document_id");
  nonempty(source.excerpt, "source_excerpt");
  if (!Number.isSafeInteger(source.pdfPage) || source.pdfPage < 1) {
    throw new Error("invalid_research_pdf_page");
  }
  if (source.printedPage !== undefined) nonempty(source.printedPage, "printed_page");
  if (source.sha256 !== undefined && !/^[a-fA-F0-9]{64}$/.test(source.sha256)) {
    throw new Error("invalid_research_source_sha256");
  }
  let url: URL;
  try {
    url = new URL(source.sourceUrl);
  } catch {
    throw new Error("invalid_research_source_url");
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new Error("invalid_research_source_url");
  }
}

/**
 * Both pages must have distinguishable locators. Missing search hits
 * must NEVER be encoded as an observation that an underlying fact is absent.
 */
export function draftEvidenceComparison(input: {
  id: string;
  question: string;
  left: DocumentObservation;
  right: DocumentObservation;
  comparisonType: ComparisonType;
  explanation: string;
  limitations: string;
}): EvidenceComparisonDraft {
  const id = nonempty(input.id, "comparison_id");
  const question = nonempty(input.question, "comparison_question");
  const explanation = nonempty(input.explanation, "comparison_explanation");
  const limitations = nonempty(input.limitations, "comparison_limitations");
  for (const item of [input.left, input.right]) {
    nonempty(item.statement, "observation");
    validatePublicSourceLocator(item.source);
  }
  if (input.left.source.documentId === input.right.source.documentId &&
      input.left.source.sourceUrl === input.right.source.sourceUrl &&
      input.left.source.pdfPage === input.right.source.pdfPage) {
    throw new Error("research_comparison_same_source_page");
  }
  if (!([
    "apparent_mismatch", "missing_context", "corroboration", "already_documented",
  ] as string[]).includes(input.comparisonType)) {
    throw new Error("invalid_research_comparison_type");
  }
  return {
    id, question, left: input.left, right: input.right,
    comparisonType: input.comparisonType, explanation, limitations,
    reviewStatus: "needs_independent_verification",
    sharingStatus: "hold_for_privacy_and_source_review",
  };
}

/**
 * Render a small source-checkable preview. Not a published evidence packet.
 * A human must verify original PDF pages, context, privacy and claims
 * before switching from HOLD to a shareable document in another workflow.
 */
export function formatEvidenceComparisonDraft(draft: EvidenceComparisonDraft): string {
  const cite = (o: DocumentObservation) =>
    o.statement + "\n" + o.source.documentId + " • PDF page " + o.source.pdfPage +
    (o.source.printedPage ? " • printed page " + o.source.printedPage : "") +
    "\n" + o.source.sourceUrl + "\nExcerpt: " + o.source.excerpt;
  return [
    "RESEARCH COMPARISON — " + draft.id,
    "Question: " + draft.question,
    "Type: " + draft.comparisonType + " (NOT an independently verified finding)",
    "Observation A:\n" + cite(draft.left),
    "Observation B:\n" + cite(draft.right),
    "Why compare: " + draft.explanation,
    "Limits / next verification: " + draft.limitations,
    "STATUS: HOLD — independently check both original PDF pages, context and privacy.",
  ].join("\n\n");
}
