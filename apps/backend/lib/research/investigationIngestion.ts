export type DocumentTypology =
  | "legal_deposition" | "interview_transcript" | "flight_manifest"
  | "calendar" | "address_book" | "financial_record" | "email_or_message"
  | "legal_filing" | "handwritten_note" | "photograph_or_exhibit"
  | "other_or_unknown";

export type StructuralEntityKind =
  | "phone" | "email" | "tail_number" | "passport_or_document"
  | "bank_routing_code" | "money" | "date" | "coordinate";

export type StructuralEntity = {
  kind: StructuralEntityKind;
  value: string;
  startUtf16: number;
  endUtf16: number;
};

export type PageFingerprint = {
  exactSha256: string;
  normalizedTextSha256: string;
  tokenSignature: readonly string[];
};

export type EvidenceMention = {
  mentionId: string;
  pageHash: string;
  documentId: string;
  physicalPage: number;
  lineStart: number | null;
  lineEnd: number | null;
  startUtf16: number;
  endUtf16: number;
  rawText: string;
  normalizedText: string;
  extractionMethod: "regex" | "text_layer" | "ocr" | "human";
  extractionConfidence: number | null;
  entityCandidateId: string | null;
};

const required = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error("invalid_" + field);
  return value.trim();
};

export function normalizeResearchText(value: string): string {
  if (typeof value !== "string") throw new Error("invalid_research_text");
  return value.normalize("NFKC").replace(/\r\n?/g, "\n").replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n").trim();
}

export function classifyDocumentTypology(input: {
  filename?: string;
  textSample: string;
}): DocumentTypology {
  const haystack = ((input.filename ?? "") + "\n" + input.textSample).toLowerCase();
  const rules: readonly [DocumentTypology, RegExp[]][] = [
    ["legal_deposition", [/deposition/, /deponent/, /court reporter/, /q\s*[:.]\s+.*a\s*[:.]/s]],
    ["interview_transcript", [/interview/, /interviewer/, /transcript/, /question\s*:/]],
    ["flight_manifest", [/manifest/, /tail\s*(number|no\.?)/, /departure/, /arrival/, /passenger/]],
    ["calendar", [/calendar/, /appointment/, /schedule/, /\b(am|pm)\b/]],
    ["address_book", [/address book/, /telephone/, /phone/, /contact/]],
    ["financial_record", [/statement/, /routing/, /account/, /debit/, /credit/, /wire/, /balance/]],
    ["email_or_message", [/from\s*:/, /to\s*:/, /subject\s*:/, /sent\s*:/]],
    ["legal_filing", [/plaintiff/, /defendant/, /case no\.?/, /motion/, /court/]],
    ["handwritten_note", [/handwritten/, /written note/, /annotation/]],
    ["photograph_or_exhibit", [/photograph/, /photo exhibit/, /exhibit\s+[a-z0-9]+/]],
  ];
  let best: { type: DocumentTypology; score: number } = { type: "other_or_unknown", score: 0 };
  for (const [type, patterns] of rules) {
    const score = patterns.reduce((n, pattern) => n + (pattern.test(haystack) ? 1 : 0), 0);
    if (score > best.score) best = { type, score };
  }
  return best.score === 0 ? "other_or_unknown" : best.type;
}

function collectMatches(text: string, kind: StructuralEntityKind, regex: RegExp): StructuralEntity[] {
  const out: StructuralEntity[] = [];
  for (const match of text.matchAll(regex)) {
    if (match.index === undefined || !match[0]) continue;
    out.push({ kind, value: match[0], startUtf16: match.index, endUtf16: match.index + match[0].length });
  }
  return out;
}

/** Deterministic extraction only. Names, organizations and addresses are not
 * guessed here; those require a separate candidate-producing resolver.
 */
export function extractStructuralEntities(text: string): StructuralEntity[] {
  if (typeof text !== "string" || text.length > 500_000) throw new Error("invalid_structural_text");
  const entities = [
    ...collectMatches(text, "email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi),
    ...collectMatches(text, "phone", /(?<!\d)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\d)/g),
    ...collectMatches(text, "tail_number", /\bN\d{1,5}[A-Z]{0,2}\b/g),
    ...collectMatches(text, "passport_or_document", /\b(?:passport|document)\s*(?:no\.?|number)?\s*[:#-]?\s*[A-Z0-9]{5,20}\b/gi),
    ...collectMatches(text, "bank_routing_code", /\b(?:routing|aba)\s*(?:no\.?|number)?\s*[:#-]?\s*\d{9}\b/gi),
    ...collectMatches(text, "money", /(?<!\w)\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g),
    ...collectMatches(text, "date", /\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi),
    ...collectMatches(text, "coordinate", /(?<!\d)-?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)[,\s]+-?(?:(?:1[0-7]\d|\d?\d)(?:\.\d+)?|180(?:\.0+)?)(?!\d)/g),
  ];
  return entities.sort((a, b) => a.startUtf16 - b.startUtf16 || a.endUtf16 - b.endUtf16 || a.kind.localeCompare(b.kind));
}

async function sha256(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function tokenSignature(text: string): string[] {
  const tokens = normalizeResearchText(text).toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  return [...new Set(tokens)].sort().slice(0, 4096);
}

export async function fingerprintPage(input: {
  bytes: Uint8Array;
  extractedText: string;
}): Promise<PageFingerprint> {
  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength === 0) {
    throw new Error("invalid_page_bytes");
  }
  const normalized = normalizeResearchText(input.extractedText);
  return {
    exactSha256: await sha256(input.bytes),
    normalizedTextSha256: await sha256(new TextEncoder().encode(normalized)),
    tokenSignature: tokenSignature(normalized),
  };
}

export function nearDuplicateSimilarity(
  left: Pick<PageFingerprint, "tokenSignature">,
  right: Pick<PageFingerprint, "tokenSignature">,
): number {
  const a = new Set(left.tokenSignature), b = new Set(right.tokenSignature);
  if (!a.size && !b.size) return 1;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

export function missingIntegerSequence(values: readonly number[]): number[] {
  const clean = [...new Set(values.filter(v => Number.isSafeInteger(v) && v > 0))].sort((a,b) => a-b);
  if (clean.length < 2) return [];
  const out: number[] = [];
  for (let value = clean[0] + 1; value < clean[clean.length - 1]; value++) {
    if (!clean.includes(value)) out.push(value);
  }
  return out;
}

export function createEvidenceMention(input: Omit<EvidenceMention, "normalizedText">): EvidenceMention {
  const mentionId = required(input.mentionId, "mention_id");
  const pageHash = required(input.pageHash, "page_hash").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(pageHash)) throw new Error("invalid_page_hash");
  required(input.documentId, "document_id");
  if (!Number.isSafeInteger(input.physicalPage) || input.physicalPage < 1) throw new Error("invalid_physical_page");
  if (!Number.isSafeInteger(input.startUtf16) || !Number.isSafeInteger(input.endUtf16) ||
      input.startUtf16 < 0 || input.endUtf16 <= input.startUtf16) throw new Error("invalid_mention_span");
  const rawText = required(input.rawText, "mention_text");
  if (!["regex","text_layer","ocr","human"].includes(input.extractionMethod)) throw new Error("invalid_extraction_method");
  if (input.extractionConfidence !== null &&
      (!Number.isFinite(input.extractionConfidence) || input.extractionConfidence < 0 || input.extractionConfidence > 1)) {
    throw new Error("invalid_extraction_confidence");
  }
  for (const line of [input.lineStart, input.lineEnd]) {
    if (line !== null && (!Number.isSafeInteger(line) || line < 1)) throw new Error("invalid_mention_line");
  }
  if (input.lineStart !== null && input.lineEnd !== null && input.lineEnd < input.lineStart) {
    throw new Error("invalid_mention_line");
  }
  return { ...input, mentionId, pageHash, rawText, normalizedText: normalizeResearchText(rawText) };
}

export type BatchPlan = {
  batchId: string;
  startPhysicalPage: number;
  endPhysicalPage: number;
  pageCount: number;
  idempotencyKey: string;
};

export function planPageBatches(input: {
  documentId: string;
  pageHashes: readonly string[];
  maxPagesPerBatch: number;
}): BatchPlan[] {
  const documentId = required(input.documentId, "document_id");
  if (!Number.isSafeInteger(input.maxPagesPerBatch) || input.maxPagesPerBatch < 1 || input.maxPagesPerBatch > 500) {
    throw new Error("invalid_batch_size");
  }
  const hashes = input.pageHashes.map((hash, index) => {
    const value = required(hash, "page_hash").toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("invalid_page_hash_" + (index + 1));
    return value;
  });
  const out: BatchPlan[] = [];
  for (let start = 0; start < hashes.length; start += input.maxPagesPerBatch) {
    const end = Math.min(hashes.length, start + input.maxPagesPerBatch);
    const joined = hashes.slice(start, end).join(":");
    out.push({
      batchId: documentId + ":pages:" + (start + 1) + "-" + end,
      startPhysicalPage: start + 1,
      endPhysicalPage: end,
      pageCount: end - start,
      idempotencyKey: JSON.stringify([documentId, start + 1, end, joined]),
    });
  }
  return out;
}
