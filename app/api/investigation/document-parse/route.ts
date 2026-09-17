import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const expected = process.env.ARBOR_DOCUMENT_PARSER_KEY;
  const supplied = req.headers.get("x-arbor-parser-key");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as null | { source_uri?: string; source_document_id?: string };
  const sourceUri = body?.source_uri?.trim();
  if (!sourceUri || !/^https:\/\//i.test(sourceUri)) return NextResponse.json({ ok: false, error: "source_uri must be https" }, { status: 400 });

  const response = await fetch(sourceUri, { redirect: "follow", signal: AbortSignal.timeout(30000), headers: { "user-agent": "ArborDocumentParser/1.0" } });
  if (!response.ok) return NextResponse.json({ ok: false, error: `source fetch HTTP ${response.status}` }, { status: 502 });
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length > 25 * 1024 * 1024) return NextResponse.json({ ok: false, error: "document exceeds 25MB parser limit", sha256 }, { status: 413 });

  if (contentType.includes("text/") || contentType.includes("json")) {
    return NextResponse.json({ ok: true, parser: "native-text", content_type: contentType, sha256, source_document_id: body?.source_document_id ?? null, pages: [{ page: 1, text: bytes.toString("utf8") }] });
  }
  return NextResponse.json({ ok: false, error: "pdf_parser_not_installed", content_type: contentType, sha256, source_document_id: body?.source_document_id ?? null, pages: [] }, { status: 422 });
}
