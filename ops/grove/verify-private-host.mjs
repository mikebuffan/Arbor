#!/usr/bin/env node
/** Read-only, no-credential preflight for an OWNER-CONFIRMED, ISOLATED
 * private Grove HTTPS backend. Does not create conversations, send a model
 * request, authenticate, mutate Supabase, or cause Vercel deployment.
 *
 * From the repository ROOT:
 *   node ops/grove/verify-private-host.mjs --origin=https://<APPROVED-GROVE-HOST> --acknowledge-private-host
 * Never use the synthetic .invalid CI origin as a live deployment receipt.
 */
import { pathToFileURL } from "node:url";

// A metadata-only readiness audit for the *existing* Grove host. This reads
// environment VARIABLE NAMES and target stages, never values or credentials.
// Presence is necessary but cannot prove values, ownership or a running LM.
export const PRIVATE_GROVE_TALK_KEY_GROUPS = Object.freeze({
  privateRealm: Object.freeze([
    "GROVE_API_ENABLED", "GROVE_SUPABASE_URL",
    "GROVE_SUPABASE_PUBLISHABLE_KEY", "GROVE_SERVICE_ROLE_KEY",
    "GROVE_FIREFLY_SUPABASE_URL", "GROVE_FIREFLY_SERVICE_ROLE_KEY",
    "GROVE_PUBLIC_API_ORIGIN",
  ]),
  conversationFlags: Object.freeze([
    "GROVE_PRIVATE_CHAT_PREVIEW_ENABLED",
    "GROVE_PRIVATE_MODEL_TURN_ENABLED",
  ]),
  independentModel: Object.freeze([
    "ARBOR_LM_PRIVATE_URL", "ARBOR_GROVE_API_KEY",
    "ARBOR_GROVE_BROKER_HMAC_KEY",
  ]),
  durableConversation: Object.freeze([
    "GROVE_PRIVATE_TRANSCRIPT_ENABLED",
    "GROVE_PRIVATE_CLAIM_ENABLED",
  ]),
});

export function inspectPrivateGroveTalkKeyMetadata(records) {
  if (!Array.isArray(records) || records.length > 500)
    throw Error("grove_host_key_metadata_invalid");
  const present = new Set();
  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record) ||
        typeof record.key !== "string" ||
        !/^[A-Z][A-Z0-9_]{0,119}$/.test(record.key)) {
      throw Error("grove_host_key_metadata_invalid");
    }
    const targets = Array.isArray(record.target)
      ? record.target : typeof record.target === "string" ? [record.target] : [];
    if (targets.includes("production")) present.add(record.key);
  }
  const missing = {};
  for (const [group, required] of Object.entries(PRIVATE_GROVE_TALK_KEY_GROUPS)) {
    missing[group] = required.filter(key => !present.has(key));
  }
  const missingCount = Object.values(missing).reduce((n, part) => n + part.length, 0);
  return {
    scope: "production_environment_key_names_only",
    status: missingCount > 0
      ? "HOLD_MISSING_KEY_NAMES" : "HOLD_RUNTIME_NOT_VERIFIED",
    missing,
    missingCount,
    keyNamesOnly: true,
    readyForDeployment: false,
    requiresSeparateApproval: true,
    // Even complete key names do not prove secret values, grants, the LM
    // receiver, Vercel budget, a valid owner session or Android build.
    unverified: [
      "actual_values", "approved_api_hostname", "receiver_running",
      "owner_identity_and_project_grants", "phone_configuration",
      "cost_ceiling", "durable_storage_migrations",
    ],
  };
}

/** Offline, source-only recovery coverage CHECK, not a restore/export engine.
 * The supplied "external" rows are UNTRUSTED until an independently
 * authenticated ledger is actually provisioned and verified. No restore,
 * release, backup read, SQL, signing authority or credentials here. */
export function inspectGroveRestoreDeletionCoverage(input) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const groups = ["externalDeletions", "restoredTombstones",
    "restoredTurns", "restoredClaims"];
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      groups.some(key => !Array.isArray(input[key]) ||
        input[key].length > 500)) {
    throw Error("grove_restore_evidence_invalid");
  }
  // Only 3 bounded UUIDs per entry. No transcript text, secrets, identities
  // from browser messages, backup contents or arbitrary object properties.
  const parse = (rows, label) => {
    const scopes = new Set();
    for (const record of rows) {
      if (!record || typeof record !== "object" || Array.isArray(record) ||
          Object.keys(record).length !== 3 ||
          !["groveUserId","projectId","conversationId"]
            .every(key => typeof record[key] === "string" && uuid.test(record[key]))) {
        throw Error("grove_restore_evidence_invalid");
      }
      const scope = [record.groveUserId,record.projectId,record.conversationId]
        .map(x => x.toLowerCase()).join("/");
      if (scopes.has(scope)) {
        // Duplicate rows can be harmless in real tables, but this strictly
        // scoped metadata preflight does not silently coalesce conflicting
        // or incomplete backup inventories.
        throw Error("grove_restore_evidence_duplicate_" + label);
      }
      scopes.add(scope);
    }
    return scopes;
  };
  const deleted = parse(input.externalDeletions,"external");
  const markers = parse(input.restoredTombstones,"tombstone");
  const turns = parse(input.restoredTurns,"turn");
  const claims = parse(input.restoredClaims,"claim");
  let missingMarkers=0, resurrectedTurns=0, resurrectedClaims=0;
  for (const scope of deleted) {
    if (!markers.has(scope)) missingMarkers++;
    if (turns.has(scope)) resurrectedTurns++;
    if (claims.has(scope)) resurrectedClaims++;
  }
  // A full snapshot may have more rows than this 500-scope review and no
  // independent verified deletion ledger exists today. Return a structural
  // disposition ONLY, never a deployment/restore permission.
  const coverageConsistent = deleted.size > 0 &&
    missingMarkers === 0 && resurrectedTurns === 0 &&
    resurrectedClaims === 0;
  return Object.freeze({
    scope: "untrusted_restore_scope_metadata_only",
    status: deleted.size === 0 ? "HOLD_MISSING_EXTERNAL_DELETION_EVIDENCE" :
      coverageConsistent ? "HOLD_INDEPENDENT_ATTESTATION_AND_RESTORE_POLICY" :
      "HOLD_DELETED_CONVERSATION_REAPPEARANCE",
    coveredDeletionCount: deleted.size,
    missingTombstoneCount: missingMarkers,
    resurrectedTurnScopeCount: resurrectedTurns,
    resurrectedClaimScopeCount: resurrectedClaims,
    metadataCoverageConsistent: coverageConsistent,
    externalLedgerVerified: false,
    readyForRestore: false,
    mayServePrivateContent: false,
    requiresSeparateOwnerApproval: true,
  });
}

/** Source-only release-layout verifier; not a Vercel deployment permission.
 * Never trusts an alternate filename as Vercel's effective vercel.json.
 * Does not access remote provider credentials or permit scheduled workers. */
export function inspectPrivateGroveReleaseLayout({
  projectId, rootDirectory, repositoryConfig, backendConfig,
  groveCandidateConfig,
}) {
  const dedicatedId = "prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN";
  if (projectId !== dedicatedId ||
      (rootDirectory !== null && rootDirectory !== "" &&
       rootDirectory !== "apps/backend") ||
      ![repositoryConfig,backendConfig,groveCandidateConfig]
        .every(x => x && typeof x === "object" && !Array.isArray(x))) {
    throw Error("grove_release_layout_metadata_invalid");
  }
  const root = rootDirectory === "apps/backend" ?
    "apps/backend" : "repository-root";
  const effective = root === "repository-root" ?
    repositoryConfig : backendConfig;
  const configOK = cfg =>
    Array.isArray(cfg.crons) && cfg.crons.length <= 20 &&
    cfg.crons.every(x => x && typeof x.path === "string" &&
      typeof x.schedule === "string") &&
    typeof cfg.ignoreCommand === "string" &&
    cfg.ignoreCommand.includes("ops/grove/source-only-ignore.mjs");
  if (!configOK(effective) || !configOK(groveCandidateConfig))
    throw Error("grove_release_config_invalid");
  const expectedIgnore = root === "repository-root" ?
    "node ops/grove/source-only-ignore.mjs" :
    "node ../../ops/grove/source-only-ignore.mjs";
  const inheritedCronCount = effective.crons.length;
  const candidateNoCron = groveCandidateConfig.crons.length === 0;
  const effectiveNoCron = inheritedCronCount === 0 &&
    effective.ignoreCommand === expectedIgnore;
  return Object.freeze({
    scope: "metadata_and_repository_source_only",
    projectId, evaluatedRoot: root,
    effectiveConfigPath: root === "repository-root" ?
      "vercel.json" : "apps/backend/vercel.json",
    alternateCandidateIsEffective: false,
    effectiveCronCount: inheritedCronCount,
    candidateNoCron,
    sourceNoCronVerified: effectiveNoCron,
    status: !candidateNoCron ? "HOLD_CANDIDATE_HAS_CRONS" :
      !effectiveNoCron ? "HOLD_INHERITED_FIREFLY_CONFIG" :
      "HOLD_OWNER_RELEASE_AUTHORIZATION",
    readyForDeployment: false,
    readyForPrivateModel: false,
    readyForSchemaMigration: false,
    requiresExactApprovedDeploymentConfig: true,
    requiresApprovedBudgetAndOwner: true,
  });
}

/** Owner-approved Grove backup COPY policy; no provider calls or cleanup.
 * Active transcripts and separately saved memories NEVER age out here.
 * Metadata from a caller is not verified custody or retention compliance. */
export const GROVE_BACKUP_MAX_RETENTION_DAYS = 30;

export function inspectGroveBackupSnapshotRetention(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      !Array.isArray(input.snapshots) || input.snapshots.length > 100 ||
      typeof input.nowUtc !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input.nowUtc)) {
    throw Error("grove_backup_metadata_invalid");
  }
  const now = Date.parse(input.nowUtc);
  if (!Number.isFinite(now) ||
      new Date(now).toISOString() !== input.nowUtc)
    throw Error("grove_backup_metadata_invalid");

  const seen = new Set();
  let expiredCount=0, unencryptedCount=0, futureCount=0;
  const maxAgeMs=GROVE_BACKUP_MAX_RETENTION_DAYS*24*60*60*1000;
  for (const row of input.snapshots) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        Object.keys(row).length !== 3 ||
        typeof row.snapshotId !== "string" ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(row.snapshotId) ||
        typeof row.createdAtUtc !== "string" ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.createdAtUtc) ||
        typeof row.encryptedAtRest !== "boolean" ||
        seen.has(row.snapshotId)) {
      throw Error("grove_backup_metadata_invalid");
    }
    const created = Date.parse(row.createdAtUtc);
    if (!Number.isFinite(created) ||
        new Date(created).toISOString() !== row.createdAtUtc) {
      throw Error("grove_backup_metadata_invalid");
    }
    seen.add(row.snapshotId);
    if (created > now) futureCount++;
    if (now-created > maxAgeMs) expiredCount++;
    if (!row.encryptedAtRest) unencryptedCount++;
  }
  const metadataWithinPolicy = expiredCount === 0 &&
    unencryptedCount === 0 && futureCount === 0;
  return Object.freeze({
    scope: "untrusted_backup_snapshot_metadata_only",
    maxSnapshotRetentionDays: GROVE_BACKUP_MAX_RETENTION_DAYS,
    activeConversationAgeLimitDays: null,
    snapshotCount: seen.size,
    expiredSnapshotCount: expiredCount,
    unencryptedSnapshotCount: unencryptedCount,
    futureDatedSnapshotCount: futureCount,
    metadataWithinPolicy,
    status: futureCount > 0 ? "HOLD_INVALID_SNAPSHOT_TIMELINE" :
      unencryptedCount > 0 ? "HOLD_BACKUPS_NOT_ENCRYPTED" :
      expiredCount > 0 ? "HOLD_EXPIRED_BACKUPS_REQUIRE_CLEANUP" :
      seen.size === 0 ? "HOLD_NO_BACKUP_EVIDENCE" :
      "HOLD_PROVIDER_RETENTION_NOT_VERIFIED",
    // No backup or database runtime currently enforces 30 days. This
    // function never deletes, authorizes restoration, or infers source proof.
    automatedCleanupImplemented: false,
    verifiedProviderErasure: false,
    verifiedExternalDeletionLedger: false,
    approvedForRestore: false,
    mayServePrivateContent: false,
    cleanupAuthorized: false,
  });
}

const foreignPublicPaths = [
  "/api/chat",
  "/api/public/chat",
  "/api/admin/system/heartbeat",
  "/api/chat/attachments/access",
  "/",
  "/_next/static/chunks/main.js",
];
const wrongMethods = [
  {path: "/api/grove/chat", method: "GET"},
  {path: "/api/grove/ark/projects", method: "OPTIONS"},
];

export function assertPrivateGroveOrigin(value) {
  if (typeof value !== "string") throw Error("grove_host_origin_required");
  let url;
  try { url = new URL(value); } catch { throw Error("grove_host_origin_invalid"); }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !hostname ||
      url.username || url.password || url.port || url.pathname !== "/" ||
      url.search || url.hash ||
      /(?:^|\.)supabase\.co$/.test(hostname) ||
      hostname.includes("firefly") ||
      hostname === "localhost" || hostname.endsWith(".invalid") ||
      hostname === "127.0.0.1" || hostname === "[::1]") {
    throw Error("grove_host_origin_unsafe");
  }
  return url.origin;
}
function denyNoCache(reply) {
  return reply.headers.get("cache-control")?.toLowerCase().includes("no-store");
}
export async function verifyPrivateGroveHost(origin, {request = fetch} = {}) {
  const base = assertPrivateGroveOrigin(origin);
  const receipts = [];
  for (const path of foreignPublicPaths) {
    const reply = await request(base + path, {
      method: "GET", cache: "no-store", redirect: "manual",
    });
    if (reply.status !== 404 || !denyNoCache(reply))
      throw Error("grove_host_isolation_failed:" + path);
    receipts.push({path, status: reply.status});
  }
  for (const {path, method} of wrongMethods) {
    const reply = await request(base + path, {
      method, cache: "no-store", redirect: "manual",
    });
    if (reply.status !== 404 || !denyNoCache(reply) ||
        reply.headers.get("access-control-allow-origin"))
      throw Error("grove_host_method_or_cors_failed:" + path);
    receipts.push({path, method, status: reply.status});
  }
  const projects = await request(base + "/api/grove/ark/projects", {
    method: "GET", cache: "no-store", redirect: "manual",
  });
  if (![401,403].includes(projects.status) || !denyNoCache(projects))
    throw Error("grove_host_auth_boundary_unverified");
  receipts.push({path:"/api/grove/ark/projects",status:projects.status});
  return {scope:"unauthenticated_private_host_only",verified:true,receipts};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const origins = args.filter(x => x.startsWith("--origin="));
  if (args.length !== 2 || origins.length !== 1 ||
      !args.includes("--acknowledge-private-host")) {
    console.error("HOLD: explicit --origin=https://<APPROVED-GROVE-HOST> and --acknowledge-private-host required");
    process.exitCode = 2;
  } else {
    try {
      const result = await verifyPrivateGroveHost(origins[0].slice(9));
      for (const item of result.receipts)
        console.log(item.method ?? "GET", item.path, item.status);
      console.log("PASS: unauthenticated private-host boundary only; NOT a model or account receipt");
    } catch (error) {
      console.error("HOLD:", error instanceof Error ? error.message : "unknown");
      process.exitCode = 1;
    }
  }
}
