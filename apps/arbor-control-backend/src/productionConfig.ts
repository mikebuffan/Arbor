import {
  isAbsolute,
} from "node:path";

export type ProductionPersistenceStatus = {
  production: boolean;
  stateFileConfigured: boolean;
  auditFileConfigured: boolean;
  stateFileAbsolute: boolean;
  auditFileAbsolute: boolean;
  durableConfigurationReady: boolean;
};

export function productionPersistenceStatus(
  env:
    NodeJS.ProcessEnv =
    process.env,
):
  ProductionPersistenceStatus {
  const production =
    env.NODE_ENV ===
    "production";

  const stateFile =
    env.ARBOR_STATE_FILE ??
    "";

  const auditFile =
    env.ARBOR_AUDIT_FILE ??
    "";

  const stateFileConfigured =
    Boolean(
      stateFile.trim(),
    );

  const auditFileConfigured =
    Boolean(
      auditFile.trim(),
    );

  const stateFileAbsolute =
    stateFileConfigured &&
    isAbsolute(
      stateFile,
    );

  const auditFileAbsolute =
    auditFileConfigured &&
    isAbsolute(
      auditFile,
    );

  return {
    production,

    stateFileConfigured,

    auditFileConfigured,

    stateFileAbsolute,

    auditFileAbsolute,

    durableConfigurationReady:
      !production ||
      (
        stateFileConfigured &&
        auditFileConfigured &&
        stateFileAbsolute &&
        auditFileAbsolute
      ),
  };
}

export function assertProductionPersistenceConfigured(
  env:
    NodeJS.ProcessEnv =
    process.env,
): void {
  const status =
    productionPersistenceStatus(
      env,
    );

  if (
    !status
      .production
  ) {
    return;
  }

  if (
    !status
      .stateFileConfigured
  ) {
    throw new Error(
      "production_state_file_required",
    );
  }

  if (
    !status
      .auditFileConfigured
  ) {
    throw new Error(
      "production_audit_file_required",
    );
  }

  if (
    !status
      .stateFileAbsolute
  ) {
    throw new Error(
      "production_state_file_must_be_absolute",
    );
  }

  if (
    !status
      .auditFileAbsolute
  ) {
    throw new Error(
      "production_audit_file_must_be_absolute",
    );
  }
}
