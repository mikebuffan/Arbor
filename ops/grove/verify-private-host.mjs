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
