# Harmless-fixture research sandbox only. Not a production worker image.
# Debian bookworm 20260406 slim, linux/amd64 manifest pinned by digest.
FROM debian@sha256:13cb01d584d2c23f475c088c168a48f9a08f033a10460572fbfd10912ec5ba7c

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils=22.12.0-2+deb12u3 ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && test "$(pdftoppm -v 2>&1 | sed -n 's/^pdftoppm version //p')" = "22.12.0"

# Numeric unprivileged identity; no home directory and no shell needed by the runner.
USER 65532:65532
WORKDIR /work

# The host runner supplies the command and mounts only an explicit read-only input.
ENTRYPOINT ["/usr/bin/pdftoppm"]
