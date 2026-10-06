#!/usr/bin/env node
import { createHmac, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000002";
const CONVERSATION_ID = "00000000-0000-4000-8000-000000000003";

export const EXPECTED = Object.freeze({
  model: "arbor-lm-v0.3",
  adapterSha256: "5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa",
  runtimeCardVersion: "0.3.3",
  brokerReceiverRevision: "2026-10-06.1",
  behaviorContractVersion: "2026-10-05.1",
});

export function assertLoopbackOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw Error("local_receiver_origin_invalid"); }
  if (url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.username || url.password || url.pathname !== "/" ||
      url.search || url.hash) {
    throw Error("local_receiver_origin_not_loopback");
  }
  return url.origin;
}

export function syntheticBody() {
  return {
    owner_id: OWNER_ID,
    project_id: PROJECT_ID,
    conversation_id: CONVERSATION_ID,
    context: {
      access: "read-only",
      projectId: PROJECT_ID,
      ark: {
        available: false,
        capturedAt: "2026-10-06T00:00:00.000Z",
        activeObjectiveHandoff: "not_resolved",
        liveExecutionVerified: false,
      },
      continuity: {
        available: false,
        source: "unavailable",
      },
      selectedAttachment: null,
      behavior: {
        proof: {
          schemaVersion: 1,
          contractVersion: EXPECTED.behaviorContractVersion,
          mode: "text",
          projectionFingerprint: "a".repeat(64),
        },
      },
    },
    messages: [{role: "user", content: "Local Arbor runtime smoke test."}],
    max_new_tokens: 170,
  };
}

function validateReply(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      typeof data.reply !== "string" || !data.reply.trim() ||
      data.model !== EXPECTED.model ||
      data.adapter_sha256 !== EXPECTED.adapterSha256 ||
      data.runtime_card_version !== EXPECTED.runtimeCardVersion ||
      data.broker_receiver_revision !== EXPECTED.brokerReceiverRevision ||
      data.behavior_contract_version !== EXPECTED.behaviorContractVersion ||
      data.behavior_projection_fingerprint !== "a".repeat(64) ||
      data.ark_captured_at !== "2026-10-06T00:00:00.000Z" ||
      data.continuity_source !== "unavailable" ||
      data.app !== "the-grove" ||
      data.experimental !== true ||
      data.external_actions_executed !== false ||
      data.live_execution_verified !== false ||
      data.active_objective_handoff !== "not_resolved" ||
      !Array.isArray(data.work_receipts) ||
      data.work_receipts.length !== 0 ||
      !["unverified_model_text", "known_action_claim_filtered"]
        .includes(String(data.reply_verification))) {
    throw Error("local_receiver_reply_contract_mismatch");
  }
  return data;
}

export async function runLocalReceiverSmoke(input) {
  const origin = assertLoopbackOrigin(input.origin);
  const apiKey = input.apiKey;
  const hmacKey = input.hmacKey;
  if (typeof apiKey !== "string" || apiKey.length < 16 ||
      typeof hmacKey !== "string" || hmacKey.length < 32 ||
      apiKey === hmacKey) {
    throw Error("local_receiver_credentials_invalid");
  }

  const body = JSON.stringify(syntheticBody());
  const timestamp = String(Math.floor((input.nowMs ?? Date.now()) / 1000));
  const nonce = (input.nonce ?? randomBytes(24).toString("hex"));
  if (!/^[a-f0-9]{48}$/.test(nonce)) throw Error("local_receiver_nonce_invalid");
  const signature = createHmac("sha256", hmacKey)
    .update(timestamp + "\n" + nonce + "\n" + body)
    .digest("hex");

  const started = performance.now();
  const response = await (input.request ?? fetch)(
    new URL("/v1/grove/chat-with-host-context", origin),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-arbor-api-key": apiKey,
        "x-arbor-host-timestamp": timestamp,
        "x-arbor-host-nonce": nonce,
        "x-arbor-host-signature": signature,
      },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(300000),
    },
  );
  const elapsedMs = Math.round(performance.now() - started);
  if (!response.ok) throw Error("local_receiver_http_" + response.status);

  const data = validateReply(await response.json());
  return {
    verified: true,
    scope: "one_synthetic_local_receiver_turn",
    elapsedMs,
    replyCharacters: data.reply.trim().length,
    replyVerification: data.reply_verification,
    externalActionsExecuted: false,
    workReceipts: 0,
    model: data.model,
    adapterSha256: data.adapter_sha256,
    runtimeCardVersion: data.runtime_card_version,
    brokerReceiverRevision: data.broker_receiver_revision,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const originArg = process.argv.slice(2).find(x => x.startsWith("--origin="));
  if (!originArg || process.argv.length !== 3) {
    console.error("HOLD: usage node smoke-local-receiver.mjs --origin=http://127.0.0.1:<port>");
    process.exitCode = 2;
  } else {
    try {
      const result = await runLocalReceiverSmoke({
        origin: originArg.slice("--origin=".length),
        apiKey: process.env.ARBOR_GROVE_API_KEY,
        hmacKey: process.env.ARBOR_GROVE_BROKER_HMAC_KEY,
      });
      console.log(JSON.stringify(result, null, 2));
      console.log("PASS: one synthetic loopback receiver turn only; NOT Grove account/ARK/live-release acceptance");
    } catch (error) {
      console.error("HOLD:", error instanceof Error ? error.message : "unknown");
      process.exitCode = 1;
    }
  }
}
