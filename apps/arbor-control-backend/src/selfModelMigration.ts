import {
  randomUUID,
} from "node:crypto";

import {
  currentSelfModelIdentity,
} from "./selfModelState.js";
import type {
  ArborState,
  SelfModelIdentityState,
  SelfModelMigrationRecord,
} from "./types.js";

export type SelfModelMigrationPlan = {
  required: boolean;
  from: SelfModelIdentityState | null;
  to: SelfModelIdentityState;
  changes: {
    versionChanged: boolean;
    checksumChanged: boolean;
    sourceDigestChanged: boolean;
    sourceQuestionCountChanged: boolean;
    addedPatternIds: string[];
    removedPatternIds: string[];
  };
};

export function previewSelfModelMigration(
  state:
    ArborState,
): SelfModelMigrationPlan {
  const from =
    state.selfModel ??
    null;

  const to =
    currentSelfModelIdentity();

  if (!from) {
    return {
      required:
        true,

      from:
        null,

      to,

      changes: {
        versionChanged:
          true,

        checksumChanged:
          true,

        sourceDigestChanged:
          true,

        sourceQuestionCountChanged:
          true,

        addedPatternIds:
          [...to.promotedPatternIds],

        removedPatternIds:
          [],
      },
    };
  }

  const addedPatternIds =
    to.promotedPatternIds
      .filter(
        (id) =>
          !from
            .promotedPatternIds
            .includes(
              id,
            ),
      );

  const removedPatternIds =
    from.promotedPatternIds
      .filter(
        (id) =>
          !to
            .promotedPatternIds
            .includes(
              id,
            ),
      );

  const changes = {
    versionChanged:
      from.version !==
      to.version,

    checksumChanged:
      from.checksum !==
      to.checksum,

    sourceDigestChanged:
      from.sourceDigest !==
      to.sourceDigest,

    sourceQuestionCountChanged:
      from.sourceQuestionCount !==
      to.sourceQuestionCount,

    addedPatternIds,

    removedPatternIds,
  };

  return {
    required:
      Object.values({
        versionChanged:
          changes.versionChanged,

        checksumChanged:
          changes.checksumChanged,

        sourceDigestChanged:
          changes.sourceDigestChanged,

        sourceQuestionCountChanged:
          changes
            .sourceQuestionCountChanged,
      }).some(
        Boolean,
      ) ||
      addedPatternIds.length >
        0 ||
      removedPatternIds.length >
        0,

    from,

    to,

    changes,
  };
}

export function applySelfModelMigration(
  state:
    ArborState,

  input: {
    expectedCurrentChecksum:
      string;

    reason:
      string;
  },
): ArborState {
  const reason =
    input.reason
      .trim();

  if (!reason) {
    throw new Error(
      "self_model_migration_reason_required",
    );
  }

  const from =
    state.selfModel;

  if (!from) {
    throw new Error(
      "self_model_migration_source_missing",
    );
  }

  if (
    from.checksum !==
    input.expectedCurrentChecksum
  ) {
    throw new Error(
      "self_model_migration_stale",
    );
  }

  const plan =
    previewSelfModelMigration(
      state,
    );

  if (
    !plan.required
  ) {
    throw new Error(
      "self_model_migration_not_required",
    );
  }

  const now =
    new Date()
      .toISOString();

  const nextIdentity:
    SelfModelIdentityState = {
    ...plan.to,

    initializedAt:
      from.initializedAt,

    verifiedAt:
      now,
  };

  const record:
    SelfModelMigrationRecord = {
    id:
      randomUUID(),

    fromVersion:
      from.version,

    fromChecksum:
      from.checksum,

    fromSourceDigest:
      from.sourceDigest,

    toVersion:
      nextIdentity
        .version,

    toChecksum:
      nextIdentity
        .checksum,

    toSourceDigest:
      nextIdentity
        .sourceDigest,

    reason,

    createdAt:
      now,

    appliedAt:
      now,
  };

  return {
    ...state,

    selfModel:
      nextIdentity,

    selfModelMigrations: [
      ...(
        state
          .selfModelMigrations ??
        []
      ),
      record,
    ].slice(
      -100,
    ),
  };
}

export function renderSelfModelMigrationPlan(
  plan:
    SelfModelMigrationPlan,
): string {
  return [
    "ARBOR SELF-MODEL MIGRATION PLAN",

    `required=${plan.required}`,

    `from_version=${plan.from?.version ?? "none"}`,

    `to_version=${plan.to.version}`,

    `source_count=${plan.from?.sourceQuestionCount ?? 0}->${plan.to.sourceQuestionCount}`,

    `version_changed=${plan.changes.versionChanged}`,

    `checksum_changed=${plan.changes.checksumChanged}`,

    `source_digest_changed=${plan.changes.sourceDigestChanged}`,

    `added_patterns=${plan.changes.addedPatternIds.join(",") || "none"}`,

    `removed_patterns=${plan.changes.removedPatternIds.join(",") || "none"}`,

    "Migration is explicit. Drift is never silently promoted to the durable identity anchor.",
  ].join(
    "\n",
  );
}
