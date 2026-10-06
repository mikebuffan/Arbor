import type { PdfOriginalCapture } from "./pdfPageProvenance";

/**
 * Source identity is CONTENT-FIRST. A URL is a mutable location, not a file
 * identity; two URLs serving byte-identical material are NOT independent
 * corroboration. Two different versions at one URL are never overwritten.
 *
 * Capture and hash the exact original bytes upstream. This pure module cannot
 * itself attest that a caller-provided digest belongs to a real PDF.
 */
export type OriginalSourceIdentity = {
  documentId: string;
  originalBytesSha256: string;
  originalByteLength: number;
  physicalPdfPageCount: number;
  sourceUri: string;
  sourceLocationKey: string;
  contentVersionKey: string;
  sourceVersionKey: string;
};

export type SourceRelationship =
  | "same_source_version"
  | "identical_bytes_mirrored_location"
  | "location_changed_content"
  | "distinct_content_and_location";

function requireText(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("invalid_source_" + name);
  }
  return value.trim();
}

/** Preserve case-sensitive path and entire query. Fragments are not PDF URLs. */
export function sourceLocationKey(sourceUri: string): string {
  const supplied = requireText(sourceUri, "uri");
  let url: URL;
  try { url = new URL(supplied); }
  catch { throw new Error("invalid_source_uri"); }
  if (url.protocol !== "https:" || !url.hostname ||
      url.username || url.password || url.hash) {
    throw new Error("invalid_source_uri");
  }
  // WHATWG URL serializes hostname and default HTTPS port, but deliberately
  // does not sort query parameters or collapse meaningful path spelling.
  return url.href;
}

export function originalSourceIdentity(
  source: PdfOriginalCapture,
): OriginalSourceIdentity {
  const documentId = requireText(source.documentId, "document_id");
  const sourceUri = requireText(source.sourceUri, "uri");
  const sourceLocation = sourceLocationKey(sourceUri);
  const digest = requireText(
    source.originalBytesSha256, "original_bytes_sha256",
  ).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error("invalid_source_original_bytes_sha256");
  }
  if (!Number.isSafeInteger(source.originalByteLength) ||
      source.originalByteLength < 8 ||
      source.originalByteLength > 25 * 1024 * 1024) {
    throw new Error("invalid_source_byte_length");
  }
  if (!Number.isSafeInteger(source.declaredPageCount) ||
      source.declaredPageCount < 1 ||
      source.declaredPageCount > 10000) {
    throw new Error("invalid_source_physical_page_count");
  }
  // All parts are length-delimited or fixed-length; avoid JSON/display-name
  // identity. Document ID is project-local metadata, NOT file identity.
  const contentVersionKey =
    "sha256:" + digest + ":bytes:" + source.originalByteLength;
  return {
    documentId,
    originalBytesSha256: digest,
    originalByteLength: source.originalByteLength,
    physicalPdfPageCount: source.declaredPageCount,
    sourceUri,
    sourceLocationKey: sourceLocation,
    contentVersionKey,
    sourceVersionKey: JSON.stringify([sourceLocation, contentVersionKey]),
  };
}

export function compareOriginalSources(
  first: OriginalSourceIdentity,
  second: OriginalSourceIdentity,
): SourceRelationship {
  // Independently validate identities rather than trusting mutable callers.
  const a = originalSourceIdentity({
    sourceUri: first.sourceUri,
    documentId: first.documentId,
    originalBytesSha256: first.originalBytesSha256,
    originalByteLength: first.originalByteLength,
    declaredPageCount: first.physicalPdfPageCount,
  });
  const b = originalSourceIdentity({
    sourceUri: second.sourceUri,
    documentId: second.documentId,
    originalBytesSha256: second.originalBytesSha256,
    originalByteLength: second.originalByteLength,
    declaredPageCount: second.physicalPdfPageCount,
  });
  if (a.originalBytesSha256 === b.originalBytesSha256 &&
      a.originalByteLength !== b.originalByteLength) {
    throw new Error("source_hash_byte_length_conflict");
  }
  if (a.contentVersionKey === b.contentVersionKey &&
      a.physicalPdfPageCount !== b.physicalPdfPageCount) {
    throw new Error("source_same_bytes_page_count_conflict");
  }
  if (a.contentVersionKey === b.contentVersionKey) {
    return a.sourceLocationKey === b.sourceLocationKey
      ? "same_source_version"
      : "identical_bytes_mirrored_location";
  }
  if (a.sourceLocationKey === b.sourceLocationKey) {
    return "location_changed_content";
  }
  return "distinct_content_and_location";
}

/** Conservative: distinct bytes and URLs still do NOT prove independence. */
export function isProvenIndependentCorroboration(
  _left: OriginalSourceIdentity,
  _right: OriginalSourceIdentity,
): false {
  return false;
}
