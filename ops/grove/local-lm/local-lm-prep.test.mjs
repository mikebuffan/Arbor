import test from "node:test";
import assert from "node:assert/strict";
import { verifyPrivateRuntimeManifest, EXPECTED as MANIFEST_EXPECTED } from "./verify-runtime-manifest.mjs";
import { assertLoopbackOrigin, runLocalReceiverSmoke, syntheticBody, EXPECTED as SMOKE_EXPECTED } from "./smoke-local-receiver.mjs";
import { evaluateLocalRuntimeCompatibility } from "./evaluate-local-runtime.mjs";
import { createHmac } from "node:crypto";

const revision = "a".repeat(40);
const manifest = {
  schemaVersion: 1,
  foundation: {name: MANIFEST_EXPECTED.foundationName, revision},
  tokenizer: {revision: "b".repeat(40)},
  adapter: {sha256: MANIFEST_EXPECTED.adapterSha256},
  receiver: {
    runtimeCardVersion: MANIFEST_EXPECTED.receiverCardVersion,
    brokerReceiverRevision: MANIFEST_EXPECTED.brokerReceiverRevision,
    behaviorContractVersion: MANIFEST_EXPECTED.behaviorContractVersion,
  },
  cpu: {minimumInstructionSet: "sse2"},
  context: {maxInputTokens: 8192, maxNewTokens: MANIFEST_EXPECTED.maxNewTokens},
};

test("runtime manifest requires exact pinned model/tokenizer and current receiver contract", () => {
  assert.equal(verifyPrivateRuntimeManifest(manifest).verified, true);
  assert.throws(() => verifyPrivateRuntimeManifest({
    ...manifest,
    foundation: {...manifest.foundation, revision: "main"},
  }), /foundation_unpinned/);
  assert.throws(() => verifyPrivateRuntimeManifest({
    ...manifest,
    adapter: {sha256: "0".repeat(64)},
  }), /adapter_mismatch/);
  assert.throws(() => verifyPrivateRuntimeManifest({
    ...manifest,
    context: {...manifest.context, maxInputTokens: 2400},
  }), /context_too_small/);
  assert.throws(() => verifyPrivateRuntimeManifest({
    ...manifest,
    context: {...manifest.context, maxInputTokens: 9000},
  }), /exceeds_reviewed_proposal/);
});

test("local smoke is loopback only", () => {
  assert.equal(assertLoopbackOrigin("http://127.0.0.1:8123"), "http://127.0.0.1:8123");
  for (const value of [
    "https://127.0.0.1:8123",
    "http://private.example.org:8123",
    "http://user:pass@127.0.0.1:8123",
    "http://127.0.0.1:8123/path",
  ]) assert.throws(() => assertLoopbackOrigin(value));
});

test("local smoke signs exact synthetic body and validates current receiver metadata", async () => {
  const apiKey = "synthetic-local-api-key";
  const hmacKey = "synthetic-local-hmac-key-longer-than-thirty-two-characters";
  const nowMs = 1_800_000_000_000;
  const nonce = "ab".repeat(24);
  const request = async (url, init) => {
    assert.equal(url.toString(), "http://127.0.0.1:8123/v1/grove/chat-with-host-context");
    const timestamp = String(Math.floor(nowMs / 1000));
    const body = init.body;
    assert.deepEqual(JSON.parse(body), syntheticBody());
    assert.equal(init.headers["x-arbor-host-timestamp"], timestamp);
    assert.equal(init.headers["x-arbor-host-nonce"], nonce);
    assert.equal(init.headers["x-arbor-host-signature"], createHmac("sha256", hmacKey)
      .update(timestamp + "\n" + nonce + "\n" + body).digest("hex"));
    return Response.json({
      reply: "Synthetic local reply",
      model: SMOKE_EXPECTED.model,
      adapter_sha256: SMOKE_EXPECTED.adapterSha256,
      runtime_card_version: SMOKE_EXPECTED.runtimeCardVersion,
      broker_receiver_revision: SMOKE_EXPECTED.brokerReceiverRevision,
      behavior_contract_version: SMOKE_EXPECTED.behaviorContractVersion,
      behavior_projection_fingerprint: "a".repeat(64),
      ark_captured_at: "2026-10-06T00:00:00.000Z",
      continuity_source: "unavailable",
      app: "the-grove",
      experimental: true,
      external_actions_executed: false,
      live_execution_verified: false,
      active_objective_handoff: "not_resolved",
      work_receipts: [],
      reply_verification: "unverified_model_text",
    });
  };
  const result = await runLocalReceiverSmoke({
    origin:"http://127.0.0.1:8123",apiKey,hmacKey,nowMs,nonce,request,
  });
  assert.equal(result.verified,true);
  assert.equal(result.model,SMOKE_EXPECTED.model);
  assert.equal(result.externalActionsExecuted,false);
});

test("local smoke rejects fake execution receipts", async () => {
  const request = async () => Response.json({
    reply: "bad",
    model: SMOKE_EXPECTED.model,
    adapter_sha256: SMOKE_EXPECTED.adapterSha256,
    runtime_card_version: SMOKE_EXPECTED.runtimeCardVersion,
    broker_receiver_revision: SMOKE_EXPECTED.brokerReceiverRevision,
    behavior_contract_version: SMOKE_EXPECTED.behaviorContractVersion,
    behavior_projection_fingerprint: "a".repeat(64),
    ark_captured_at: "2026-10-06T00:00:00.000Z",
    continuity_source: "unavailable",
    app: "the-grove",
    experimental: true,
    external_actions_executed: true,
    live_execution_verified: true,
    active_objective_handoff: "executing",
    work_receipts: [{verified:true}],
    reply_verification: "verified",
  });
  await assert.rejects(runLocalReceiverSmoke({
    origin:"http://127.0.0.1:8123",
    apiKey:"synthetic-local-api-key",
    hmacKey:"synthetic-local-hmac-key-longer-than-thirty-two-characters",
    nonce:"cd".repeat(24),
    request,
  }), /reply_contract_mismatch/);
});

test("hardware/runtime compatibility fails closed on a missing instruction set", () => {
  const preflight = {
    schemaVersion: 1,
    scope: "read_only_local_hardware_preflight",
    machineIdentityCollected: false,
    processor: {instructionSets: {sse2:true,sse42:true,avx:false,avx2:false}},
    assessment: {
      localCpuPilotEligible: true,
      intendedMode: "cpu_only_bounded_pilot",
      holdReasons: [],
    },
  };
  const compatible = evaluateLocalRuntimeCompatibility(preflight, manifest);
  assert.equal(compatible.readyForArtifactStage, true);
  const incompatible = evaluateLocalRuntimeCompatibility(preflight, {
    ...manifest,
    cpu: {minimumInstructionSet: "avx2"},
  });
  assert.equal(incompatible.readyForArtifactStage, false);
  assert.match(incompatible.holdReasons.join(" "), /requires avx2/);
});
