import {
  createHash,
} from "node:crypto";

import {
  assertSelfModelIdentity,
} from "./selfModelState.js";
import type {
  ArborScopeSnapshot,
} from "./types.js";

export type ArborTransplantBundle = {
  schemaVersion:
    1;

  exportedAt:
    string;

  scope:
    string;

  identityChecksum:
    string;

  snapshot:
    ArborScopeSnapshot;

  checksum:
    string;
};

export function createTransplantBundle(
  snapshot:
    ArborScopeSnapshot,
): ArborTransplantBundle {
  const identity =
    snapshot
      .state
      .selfModel;

  if (!identity) {
    throw new Error(
      "transplant_identity_missing",
    );
  }

  assertSelfModelIdentity(
    identity,
  );

  validateSnapshot(
    snapshot,
  );

  const exportedAt =
    new Date()
      .toISOString();

  const unsigned = {
    schemaVersion:
      1 as const,

    exportedAt,

    scope:
      snapshot.scope,

    identityChecksum:
      identity.checksum,

    snapshot,
  };

  return {
    ...unsigned,

    checksum:
      checksumBundle(
        unsigned,
      ),
  };
}

export function verifyTransplantBundle(
  bundle:
    ArborTransplantBundle,
): void {
  if (
    bundle.schemaVersion !==
    1
  ) {
    throw new Error(
      "transplant_schema_unsupported",
    );
  }

  const identity =
    bundle.snapshot
      .state
      .selfModel;

  if (!identity) {
    throw new Error(
      "transplant_identity_missing",
    );
  }

  if (
    bundle.scope !==
    bundle.snapshot.scope
  ) {
    throw new Error(
      "transplant_scope_mismatch",
    );
  }

  if (
    bundle.identityChecksum !==
    identity.checksum
  ) {
    throw new Error(
      "transplant_identity_checksum_mismatch",
    );
  }

  const expected =
    checksumBundle({
      schemaVersion:
        bundle.schemaVersion,

      exportedAt:
        bundle.exportedAt,

      scope:
        bundle.scope,

      identityChecksum:
        bundle
          .identityChecksum,

      snapshot:
        bundle.snapshot,
    });

  if (
    expected !==
    bundle.checksum
  ) {
    throw new Error(
      "transplant_checksum_mismatch",
    );
  }

  validateSnapshot(
    bundle.snapshot,
  );

  assertSelfModelIdentity(
    identity,
  );
}

export function restoreTransplantSnapshot(
  bundle:
    ArborTransplantBundle,
): ArborScopeSnapshot {
  verifyTransplantBundle(
    bundle,
  );

  return structuredClone(
    bundle.snapshot,
  );
}

function validateSnapshot(
  snapshot:
    ArborScopeSnapshot,
): void {
  if (
    !snapshot.scope
      .trim()
  ) {
    throw new Error(
      "transplant_scope_required",
    );
  }

  const ids =
    new Set<string>();

  for (
    const turn of
    snapshot.turns
  ) {
    if (
      turn.scope !==
      snapshot.scope
    ) {
      throw new Error(
        "transplant_turn_scope_mismatch",
      );
    }

    if (
      ids.has(
        turn.turnId,
      )
    ) {
      throw new Error(
        "transplant_duplicate_turn",
      );
    }

    ids.add(
      turn.turnId,
    );
  }
}

function checksumBundle(
  bundle:
    Omit<
      ArborTransplantBundle,
      "checksum"
    >,
): string {
  return createHash(
    "sha256",
  )
    .update(
      JSON.stringify(
        bundle,
      ),
    )
    .digest(
      "hex",
    );
}
