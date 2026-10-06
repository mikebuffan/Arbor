import { describe, expect, it } from "vitest";
import { capturePdfOriginalBytes } from "./pdfPageProvenance";
import {
  compareOriginalSources,
  isProvenIndependentCorroboration,
  originalSourceIdentity,
  sourceLocationKey,
} from "./sourceVersion";

const original = async (input: {
  url?: string;
  id?: string;
  body?: string;
  pages?: number;
} = {}) =>
  originalSourceIdentity(await capturePdfOriginalBytes({
    sourceUri: input.url ?? "https://example.org/reports/A.pdf?revision=1",
    documentId: input.id ?? "LOCAL-INDEX-1",
    bytes: new TextEncoder().encode(
      "%PDF-1.4\\n" + (input.body ?? "harmless fixture"),
    ),
    declaredPageCount: input.pages ?? 3,
  }));

describe("captured original source versions: no invented independence", () => {
  it("same original bytes and URL are one source version across document aliases", async () => {
    const a = await original();
    const b = await original({ id: "OTHER-PROJECT-LOCAL-NAME" });
    expect(compareOriginalSources(a, b)).toBe("same_source_version");
    expect(a.contentVersionKey).toBe(b.contentVersionKey);
    expect(a.sourceVersionKey).toBe(b.sourceVersionKey);
    expect(a.documentId).not.toBe(b.documentId);
  });

  it("byte-identical mirrors cannot be counted as a second independent source", async () => {
    const a = await original();
    const b = await original({url:"https://mirror.example.net/other-file.pdf"});
    expect(compareOriginalSources(a, b))
      .toBe("identical_bytes_mirrored_location");
    expect(a.contentVersionKey).toBe(b.contentVersionKey);
    expect(a.sourceVersionKey).not.toBe(b.sourceVersionKey);
    expect(isProvenIndependentCorroboration(a, b)).toBe(false);
  });

  it("a changed upstream PDF at the same URL is a separate source version", async () => {
    const a = await original();
    const b = await original({body:"changed harmless fixture"});
    expect(compareOriginalSources(a, b)).toBe("location_changed_content");
    expect(a.sourceVersionKey).not.toBe(b.sourceVersionKey);
    expect(a.sourceLocationKey).toBe(b.sourceLocationKey);
  });

  it("distinct bytes and distinct locations do not establish independence", async () => {
    const a = await original();
    const b = await original({
      url:"https://other.example.org/reports/B.pdf",
      body:"a different harmless fixture",
    });
    expect(compareOriginalSources(a, b))
      .toBe("distinct_content_and_location");
    expect(isProvenIndependentCorroboration(a, b)).toBe(false);
  });

  it("normalizes hostname but preserves path case and query order", () => {
    expect(sourceLocationKey("https://EXAMPLE.ORG:443/Path/A.pdf?x=1&y=2"))
      .toBe("https://example.org/Path/A.pdf?x=1&y=2");
    expect(sourceLocationKey("https://example.org/Path/A.pdf?x=1&y=2"))
      .not.toBe(sourceLocationKey("https://example.org/path/A.pdf?x=1&y=2"));
    expect(sourceLocationKey("https://example.org/a.pdf?b=2&a=1"))
      .not.toBe(sourceLocationKey("https://example.org/a.pdf?a=1&b=2"));
  });

  it("rejects a URL fragment in a file source, credential, and unsafe scheme", () => {
    for (const url of [
      "http://example.org/a.pdf",
      "file:///tmp/a.pdf",
      "https://alice:password@example.org/a.pdf",
      "https://example.org/a.pdf#page=3",
      "broken URL",
    ]) {
      expect(() => sourceLocationKey(url)).toThrow("invalid_source_uri");
    }
  });

  it("fails closed if identical claimed SHA has conflicting bytes or pages", async () => {
    const a = await original();
    expect(() => compareOriginalSources(a, {
      ...a, originalByteLength: a.originalByteLength + 1,
    })).toThrow("source_hash_byte_length_conflict");
    const sameHashDifferentPageCount = {...a, physicalPdfPageCount: 4};
    expect(() => compareOriginalSources(a, sameHashDifferentPageCount))
      .toThrow("source_same_bytes_page_count_conflict");
  });

  it("refuses invented checksum or unsupported page count", async () => {
    const a = await original();
    expect(() => originalSourceIdentity({
      ...a, originalBytesSha256: "made-up-checksum",
      declaredPageCount: a.physicalPdfPageCount,
    })).toThrow("invalid_source_original_bytes_sha256");
    expect(() => originalSourceIdentity({
      ...a, declaredPageCount: 0,
    })).toThrow("invalid_source_physical_page_count");
  });
});
