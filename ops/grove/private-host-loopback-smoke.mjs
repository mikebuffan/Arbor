#!/usr/bin/env node
// Offline acceptance of the ACTUAL compiled Next server in private Grove mode.
// No secrets, no remote origin, no model, no authorization or database writes.
// This checks the deny boundary only, NOT a live private owner/session pilot.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 31387;
const origin = "http://127.0.0.1:" + port;
const child = spawn("pnpm", ["exec", "next", "start", "--hostname",
  "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    GROVE_API_ENABLED: "true",
    ARBOR_PUBLIC_APP_ENABLED: "false",
    GROVE_PRIVATE_CHAT_PREVIEW_ENABLED: "false",
    GROVE_PRIVATE_MODEL_TURN_ENABLED: "false",
    GROVE_PRIVATE_TRANSCRIPT_ENABLED: "false",
    GROVE_PRIVATE_CLAIM_ENABLED: "false",
    ARBOR_ARK_ENABLE_LIVE_EXECUTION: "false",
    ARBOR_ENABLE_ARK_EXECUTION: "false",
    GROVE_SERVICE_ROLE_KEY: "",
    GROVE_FIREFLY_SERVICE_ROLE_KEY: "",
    OPENAI_API_KEY: "",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let startupLog = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", chunk => {
    startupLog = (startupLog + String(chunk)).slice(-2500);
  });
}
let stopped = false;
child.on("exit", () => { stopped = true; });

async function request(path, method = "GET") {
  const response = await fetch(origin + path, {
    method, redirect: "manual",
    headers: { origin: "https://untrusted.example.org", ...(method === "POST"
      ? { "content-type": "application/json" } : {}) },
    ...(method === "POST" ? { body: JSON.stringify({
      projectId: "00000000-0000-4000-8000-000000000003",
      conversationId: "00000000-0000-4000-8000-000000000004",
      message: "synthetic-only",
    }) } : {}),
    signal: AbortSignal.timeout(2500),
  });
  return response;
}
async function expectBlocked(path, method = "GET") {
  const response = await request(path, method);
  assert.equal(response.status, 404, method + " " + path);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/,
    "non-cacheable deny: " + path);
  assert.equal(response.headers.get("access-control-allow-origin"), null,
    "no browser-origin disclosure: " + path);
  assert.equal(response.headers.get("location"), null,
    "no redirect: " + path);
  await response.arrayBuffer();
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (stopped) throw new Error("next_server_exited_before_smoke");
    try {
      const r = await request("/api/chat");
      await r.arrayBuffer();
      ready = true;
      break;
    } catch {
      await delay(250);
    }
  }
  assert.ok(ready, "next_server_did_not_start");
  for (const [path, method] of [
    ["/", "GET"], ["/api/chat", "GET"],
    ["/api/chat", "POST"],
    ["/api/admin/system/heartbeat", "GET"],
    ["/api/ark/status", "GET"],
    ["/api/public/chat", "GET"],
    ["/_next/static/chunks/main.js", "GET"],
    ["/api/grove/chat", "GET"],
    ["/api/grove/chat", "OPTIONS"],
    ["/api/grove/chat", "POST"], // Private model flags OFF
    ["/api/grove/ark/run", "POST"], // No worker/activation
  ]) {
    await expectBlocked(path, method);
  }
  console.log("GROVE_LOOPBACK_PRIVATE_DENY_RUNTIME=PASS;" +
    " LIVE_HOST=NONE; MODEL_CALLS=NONE; CREDENTIALS=NONE");
} catch (error) {
  console.error("GROVE_LOOPBACK_PRIVATE_DENY_RUNTIME=FAIL",
    error instanceof Error ? error.message : String(error));
  // Only source/Next startup metadata; no secrets or document content.
  if (!stopped) console.error(startupLog.slice(-900));
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise(resolve => child.once("exit", resolve)),
    delay(2500)]);
  if (!stopped) child.kill("SIGKILL");
}
