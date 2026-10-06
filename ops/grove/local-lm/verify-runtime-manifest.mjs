#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const EXPECTED = Object.freeze({
  foundationName: "Qwen/Qwen3-0.6B",
  adapterSha256: "5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa",
  receiverCardVersion: "0.3.3",
  brokerReceiverRevision: "2026-10-06.1",
  behaviorContractVersion: "2026-10-05.1",
  maxNewTokens: 170,
  minimumReviewedPromptTokens: 4020,
  maximumProposedPromptTokens: 8192,
});

const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;

function exactString(value, code) {
  if (typeof value !== "string" || !value.trim()) throw Error(code);
  return value.trim();
}

export function verifyPrivateRuntimeManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("private_runtime_manifest_invalid");
  if (input.schemaVersion !== 1)
    throw Error("private_runtime_manifest_schema");

  const foundation = input.foundation;
  const tokenizer = input.tokenizer;
  const adapter = input.adapter;
  const receiver = input.receiver;
  const context = input.context;

  if (!foundation || typeof foundation !== "object" ||
      foundation.name !== EXPECTED.foundationName ||
      !sha40.test(exactString(foundation.revision, "foundation_revision_required")))
    throw Error("private_runtime_foundation_unpinned");

  if (!tokenizer || typeof tokenizer !== "object" ||
      !sha40.test(exactString(tokenizer.revision, "tokenizer_revision_required")))
    throw Error("private_runtime_tokenizer_unpinned");

  if (!adapter || typeof adapter !== "object" ||
      !sha64.test(exactString(adapter.sha256, "adapter_sha_required")) ||
      adapter.sha256 !== EXPECTED.adapterSha256)
    throw Error("private_runtime_adapter_mismatch");

  if (!receiver || typeof receiver !== "object" ||
      receiver.runtimeCardVersion !== EXPECTED.receiverCardVersion ||
      receiver.brokerReceiverRevision !== EXPECTED.brokerReceiverRevision ||
      receiver.behaviorContractVersion !== EXPECTED.behaviorContractVersion)
    throw Error("private_runtime_receiver_contract_mismatch");

  if (receiver.archiveSha256 !== undefined &&
      !sha64.test(exactString(receiver.archiveSha256, "receiver_archive_sha_invalid")))
    throw Error("private_runtime_receiver_archive_sha_invalid");

  if (!context || typeof context !== "object" ||
      !Number.isSafeInteger(context.maxInputTokens) ||
      !Number.isSafeInteger(context.maxNewTokens) ||
      context.maxNewTokens !== EXPECTED.maxNewTokens)
    throw Error("private_runtime_context_invalid");

  if (context.maxInputTokens < EXPECTED.minimumReviewedPromptTokens)
    throw Error("private_runtime_context_too_small_for_reviewed_fixture");
  if (context.maxInputTokens > EXPECTED.maximumProposedPromptTokens)
    throw Error("private_runtime_context_exceeds_reviewed_proposal");

  return {
    verified: true,
    scope: "artifact_identity_and_declared_context_only",
    foundationName: foundation.name,
    foundationRevision: foundation.revision,
    tokenizerRevision: tokenizer.revision,
    adapterSha256: adapter.sha256,
    receiverCardVersion: receiver.runtimeCardVersion,
    brokerReceiverRevision: receiver.brokerReceiverRevision,
    behaviorContractVersion: receiver.behaviorContractVersion,
    maxInputTokens: context.maxInputTokens,
    maxNewTokens: context.maxNewTokens,
    realWeightsLoaded: false,
    tokenizerExecutionVerified: false,
    inferenceVerified: false,
  };
}

export async function readAndVerifyManifest(path) {
  const raw = await readFile(path, "utf8");
  return verifyPrivateRuntimeManifest(JSON.parse(raw));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("HOLD: usage node verify-runtime-manifest.mjs <private-runtime-manifest.json>");
    process.exitCode = 2;
  } else {
    try {
      const result = await readAndVerifyManifest(args[0]);
      console.log(JSON.stringify(result, null, 2));
      console.log("PASS: declared artifact identity/context only; NOT a model-load or inference receipt");
    } catch (error) {
      console.error("HOLD:", error instanceof Error ? error.message : "unknown");
      process.exitCode = 1;
    }
  }
}
