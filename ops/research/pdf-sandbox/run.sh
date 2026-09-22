#!/usr/bin/env bash
set -euo pipefail

# Disposable renderer wrapper. Accepts only an immutable local image ID/digest and
# one caller-supplied harmless PDF. It never fetches a source.
IMAGE_REF="${PDF_SANDBOX_IMAGE_REF:-}"
INPUT="${1:-}"
OUT_DIR="${2:-}"

[[ "$IMAGE_REF" =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "sandbox_image_must_be_sha256" >&2; exit 64; }
[[ -f "$INPUT" ]] || { echo "sandbox_input_missing" >&2; exit 64; }
[[ -d "$OUT_DIR" ]] || { echo "sandbox_output_dir_missing" >&2; exit 64; }
[[ ! -L "$INPUT" && ! -L "$OUT_DIR" ]] || { echo "sandbox_symlink_refused" >&2; exit 64; }

INPUT_ABS="$(realpath "$INPUT")"
OUT_ABS="$(realpath "$OUT_DIR")"

# No network, no capabilities, no privilege escalation, read-only root, bounded
# RAM/PIDs/CPU, 16 MiB writable tmpfs, explicit read-only input and output-only bind.
# Docker's stop timeout plus GNU timeout prevents a stuck renderer from lingering.
timeout --signal=KILL 20s docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --user 65532:65532 \
  --memory 256m --memory-swap 256m \
  --pids-limit 64 \
  --cpus 1.0 \
  --ulimit nofile=64:64 \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777 \
  --mount "type=bind,src=$INPUT_ABS,dst=/input/source.pdf,readonly" \
  --mount "type=bind,src=$OUT_ABS,dst=/output" \
  --workdir /output \
  "$IMAGE_REF" \
  -f 1 -singlefile -png -r 150 /input/source.pdf /output/page-1

[[ -s "$OUT_ABS/page-1.png" ]] || { echo "sandbox_renderer_no_output" >&2; exit 70; }
BYTES="$(wc -c < "$OUT_ABS/page-1.png")"
(( BYTES <= 12582912 )) || { rm -f "$OUT_ABS/page-1.png"; echo "sandbox_output_budget_exceeded" >&2; exit 70; }
sha256sum "$OUT_ABS/page-1.png"
