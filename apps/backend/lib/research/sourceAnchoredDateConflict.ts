import { draftEvidenceComparison, type EvidenceComparisonDraft } from "./evidenceComparison";
import type { PdfPageEvidenceRecord } from "./pdfPageProvenance";

export type DateConflictCandidate = {
  eventKey: string;
  dates: readonly string[];
  comparison: EvidenceComparisonDraft;
  sourceFamilyCount: 1;
  status: "hold_for_original_page_and_instrument_review";
};

const monthNames = "January|February|March|April|May|June|July|August|September|October|November|December";
const datePattern = `(?:${monthNames})\\s+\\d{1,2},?\\s+\\d{4}`;

function canonicalDate(raw: string): string {
  const match = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!match) throw new Error("invalid_date_candidate");
  const month = monthNames.split("|").findIndex(name => name.toLowerCase() === match[1].toLowerCase());
  const day = Number(match[2]), year = Number(match[3]);
  const value = new Date(Date.UTC(year, month, day));
  if (month < 0 || value.getUTCFullYear() !== year ||
      value.getUTCMonth() !== month || value.getUTCDate() !== day) {
    throw new Error("invalid_date_candidate");
  }
  return value.toISOString().slice(0, 10);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bounded candidate scan for a named property/event in an already captured
 * court record. It only matches dates explicitly attached to a transfer or
 * conveyance near the supplied subject. No semantic identity or causation is
 * inferred. The page text remains unreviewed until the original is inspected.
 */
export function findSourceAnchoredTransferDateConflicts(input: {
  eventKey: string;
  subject: string;
  pages: readonly PdfPageEvidenceRecord[];
}): readonly DateConflictCandidate[] {
  const { eventKey, subject, pages } = input;
  if (!eventKey.trim() || !subject.trim() || subject.length > 100) {
    throw new Error("invalid_transfer_subject");
  }
  const escaped = escapeRegex(subject);
  const patterns = [
    new RegExp(`(${datePattern})\\s+.{0,50}?(?:transfer|convey)(?:s|red|ance)?\\s+.{0,70}?${escaped}`, "gi"),
    new RegExp(`${escaped}\\s+.{0,50}?(?:transfer|convey)(?:s|red|ance)?\\s+(?:of\\s+)?(${datePattern})`, "gi"),
  ];
  const hits: { date: string; page: PdfPageEvidenceRecord; excerpt: string }[] = [];
  for (const page of pages) {
    if (page.extractionStatus !== "text_layer" || !page.extractedText) continue;
    const normalized = page.extractedText.replace(/\s+/g, " ");
    for (const pattern of patterns) {
      for (const match of normalized.matchAll(pattern)) {
        const date = canonicalDate(match[1]);
        if (!hits.some(h => h.date === date && h.page.documentId === page.documentId &&
          h.page.locator.physicalPdfPage === page.locator.physicalPdfPage)) {
          hits.push({ date, page, excerpt: match[0].slice(0, 220) });
        }
      }
    }
  }
  const candidates: DateConflictCandidate[] = [];
  for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
    const left = hits[i], right = hits[j];
    if (left.date === right.date) continue;
    if (left.page.documentId === right.page.documentId &&
        left.page.locator.physicalPdfPage === right.page.locator.physicalPdfPage) continue;
    const observation = (hit: typeof left) => ({
      statement: `${subject} transfer dated ${hit.date} in extracted text`,
      source: {
        documentId: hit.page.documentId,
        sourceUrl: hit.page.sourceUri,
        pdfPage: hit.page.locator.physicalPdfPage,
        sha256: hit.page.originalBytesSha256,
        excerpt: hit.excerpt,
      },
    });
    candidates.push({
      eventKey, dates: [left.date, right.date],
      comparison: draftEvidenceComparison({
        id: `${eventKey}:${left.date}:${right.date}`,
        question: `Which instrument and event date govern the ${subject} transfer?`,
        left: observation(left), right: observation(right),
        comparisonType: "apparent_mismatch",
        explanation: "Two date formulations occur near the same transfer subject; they may describe different steps.",
        limitations: "Review both original pages, the referenced earlier opinion, and the recorded instrument. These passages share a court-record lineage and are not independent corroboration.",
      }),
      sourceFamilyCount: 1,
      status: "hold_for_original_page_and_instrument_review",
    });
  }
  return candidates;
}
