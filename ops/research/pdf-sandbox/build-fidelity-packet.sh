#!/usr/bin/env bash
set -euo pipefail

# LOCAL REVIEW HELPER ONLY.
# Builds a human fidelity-review packet from one already-approved local PDF.
# It never fetches a URL, performs OCR, marks fidelity PASS, or publishes data.

IMAGE_REF="${PDF_SANDBOX_IMAGE_REF:-}"
INPUT="${1:-}"
OUT_DIR="${2:-}"
SOURCE_URI="${3:-}"
DOCUMENT_ID="${4:-}"

[[ "$IMAGE_REF" =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "fidelity_image_must_be_sha256" >&2; exit 64; }
[[ -f "$INPUT" && ! -L "$INPUT" ]] || { echo "fidelity_input_missing_or_symlink" >&2; exit 64; }
[[ -d "$OUT_DIR" && ! -L "$OUT_DIR" ]] || { echo "fidelity_output_dir_missing_or_symlink" >&2; exit 64; }
[[ -n "$SOURCE_URI" && -n "$DOCUMENT_ID" ]] || { echo "fidelity_source_identity_required" >&2; exit 64; }

INPUT_ABS="$(realpath "$INPUT")"
OUT_ABS="$(realpath "$OUT_DIR")"
BYTES="$(wc -c < "$INPUT_ABS")"
(( BYTES >= 8 && BYTES <= 26214400 )) || { echo "fidelity_pdf_byte_budget" >&2; exit 64; }
[[ "$(head -c 5 "$INPUT_ABS")" == "%PDF-" ]] || { echo "fidelity_invalid_pdf_signature" >&2; exit 64; }

# Refuse to mix a new review packet with prior artifacts.
if find "$OUT_ABS" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
  echo "fidelity_output_dir_must_be_empty" >&2
  exit 64
fi

TMP_DIR="$(mktemp -d)"
STAGE="$(mktemp -d "$OUT_ABS/.fidelity-stage.XXXXXX")"
cleanup() {
  rm -rf "$TMP_DIR"
  if [[ -n "${STAGE:-}" && -d "$STAGE" ]]; then
    chmod 0700 "$STAGE" 2>/dev/null || true
    rm -rf "$STAGE"
  fi
}
trap cleanup EXIT

cp -- "$INPUT_ABS" "$TMP_DIR/source.pdf"
chmod 0444 "$TMP_DIR/source.pdf"
SOURCE_SHA="$(sha256sum "$TMP_DIR/source.pdf" | awk '{print $1}')"
INPUT_BIND="$(realpath "$TMP_DIR/source.pdf")"

COMMON=(
  run --rm
  --network none
  --read-only
  --cap-drop ALL
  --security-opt no-new-privileges:true
  --user 65532:65532
  --memory 256m --memory-swap 256m
  --pids-limit 64
  --cpus 1.0
  --ulimit nofile=64:64
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777
  --mount "type=bind,src=$INPUT_BIND,dst=/input/source.pdf,readonly"
)

INFO="$(timeout --signal=KILL 20s docker "${COMMON[@]}"   --entrypoint /usr/bin/pdfinfo "$IMAGE_REF" /input/source.pdf)"
PAGES="$(printf '%s\n' "$INFO" | awk '$1=="Pages:" {print $2; exit}')"
[[ "$PAGES" =~ ^[0-9]+$ ]] || { echo "fidelity_page_count_unavailable" >&2; exit 70; }
(( PAGES >= 1 && PAGES <= 128 )) || { echo "fidelity_page_budget_exceeded" >&2; exit 70; }

# Container identity 65532 writes only to this temporary stage. It is returned
# to private host permissions before artifacts leave the stage.
chmod 0777 "$STAGE"
HASH_TSV="$STAGE/page-hashes.tsv"
: > "$HASH_TSV"
chmod 0666 "$HASH_TSV"

for ((page=1; page<=PAGES; page++)); do
  printf -v PAD '%04d' "$page"
  PREFIX="page-$PAD"

  timeout --signal=KILL 20s docker "${COMMON[@]}"     --mount "type=bind,src=$STAGE,dst=/output"     --workdir /output     --entrypoint /usr/bin/pdftoppm     "$IMAGE_REF"     -f "$page" -l "$page" -singlefile -png -r 150     /input/source.pdf "/output/$PREFIX" >/dev/null

  timeout --signal=KILL 20s docker "${COMMON[@]}"     --mount "type=bind,src=$STAGE,dst=/output"     --workdir /output     --entrypoint /usr/bin/pdftotext     "$IMAGE_REF"     -f "$page" -l "$page" -enc UTF-8 -layout -nopgbrk     /input/source.pdf "/output/$PREFIX.txt" >/dev/null

  IMG="$STAGE/$PREFIX.png"
  TXT="$STAGE/$PREFIX.txt"
  [[ -s "$IMG" && -f "$TXT" ]] || { echo "fidelity_page_output_missing" >&2; exit 70; }

  IMG_BYTES="$(wc -c < "$IMG")"
  TXT_BYTES="$(wc -c < "$TXT")"
  (( IMG_BYTES <= 12582912 )) || { echo "fidelity_page_image_budget_exceeded" >&2; exit 70; }
  (( TXT_BYTES <= 600000 )) || { echo "fidelity_page_text_budget_exceeded" >&2; exit 70; }

  IMG_SHA="$(sha256sum "$IMG" | awk '{print $1}')"
  TXT_SHA="$(sha256sum "$TXT" | awk '{print $1}')"
  printf '%s\t%s\t%s\t%s\t%s\n' "$page" "$PREFIX.png" "$IMG_SHA" "$PREFIX.txt" "$TXT_SHA" >> "$HASH_TSV"
done

chmod 0700 "$STAGE"

node - "$SOURCE_URI" "$DOCUMENT_ID" "$SOURCE_SHA" "$BYTES" "$PAGES" "$HASH_TSV" "$STAGE/manifest.json" <<'NODE'
const fs=require("fs");
const [sourceUri,documentId,sourceSha,byteLengthRaw,pagesRaw,tsvPath,outPath]=process.argv.slice(2);
let uri;
try { uri=new URL(sourceUri); } catch { throw new Error("invalid_fidelity_source_uri"); }
if(uri.protocol!=="https:"||!uri.hostname||uri.username||uri.password) throw new Error("invalid_fidelity_source_uri");
const physicalPages=Number(pagesRaw);
const pages=fs.readFileSync(tsvPath,"utf8").trim().split(/\r?\n/).filter(Boolean).map(line=>{
  const [page,imageFile,imageSha256,textFile,textSha256]=line.split("\t");
  return {physicalPdfPage:Number(page),imageFile,imageSha256,textFile,textSha256};
});
if(pages.length!==physicalPages||pages.some((p,i)=>p.physicalPdfPage!==i+1)) throw new Error("incomplete_fidelity_packet");
const manifest={
  schemaVersion:1,
  sourceUri,
  documentId,
  originalBytesSha256:sourceSha,
  originalByteLength:Number(byteLengthRaw),
  physicalPages,
  render:{engine:"poppler-pdftoppm",dpi:150},
  extraction:{engine:"poppler-pdftotext",layout:true,ocr:false},
  reviewStatus:"HOLD_HUMAN_COMPARISON_REQUIRED",
  pages,
};
fs.writeFileSync(outPath,JSON.stringify(manifest,null,2)+"\n",{mode:0o600});
NODE

rm -f "$HASH_TSV"
# Sandbox outputs are owned by numeric uid 65532. Do not weaken the sandbox by
# running it as the host user or attempting host-side chmod/chown. Copy each
# readable artifact into a new host-owned private file, then delete the stage.
for item in "$STAGE"/*; do
  install -m 0600 -- "$item" "$OUT_ABS/$(basename "$item")"
done
rm -rf "$STAGE"
STAGE=""

echo "FIDELITY_PACKET=READY; HUMAN_REVIEW=HOLD; PAGES=$PAGES; SOURCE_SHA256=$SOURCE_SHA"
