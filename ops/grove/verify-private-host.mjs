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
