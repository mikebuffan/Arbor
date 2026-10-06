#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { verifyPrivateRuntimeManifest } from "./verify-runtime-manifest.mjs";

const order = ["sse2", "sse42", "avx", "avx2"];

function present(features, name) {
  if (!features || typeof features !== "object") return false;
  if (name === "sse2") return features.sse2 === true;
  if (name === "sse42") return features.sse42 === true;
  if (name === "avx") return features.avx === true;
  if (name === "avx2") return features.avx2 === true;
  return false;
}

export function evaluateLocalRuntimeCompatibility(preflight, manifest) {
  if (!preflight || typeof preflight !== "object" ||
      preflight.schemaVersion !== 1 ||
      preflight.scope !== "read_only_local_hardware_preflight" ||
      preflight.machineIdentityCollected !== false) {
    throw Error("local_preflight_invalid");
  }
  const verified = verifyPrivateRuntimeManifest(manifest);
  const minimum = verified.minimumInstructionSet;
  if (!order.includes(minimum)) throw Error("local_runtime_instruction_requirement_invalid");

  const features = preflight.processor?.instructionSets;
  const instructionSetCompatible = present(features, minimum);
  const baseEligible = preflight.assessment?.localCpuPilotEligible === true;
  const readyForArtifactStage = baseEligible && instructionSetCompatible;

  const holdReasons = [];
  for (const reason of preflight.assessment?.holdReasons ?? []) {
    if (typeof reason === "string" && reason.trim()) holdReasons.push(reason.trim());
  }
  if (!instructionSetCompatible) {
    holdReasons.push("Runtime requires " + minimum +
      " but Windows did not report that instruction set as available.");
  }

  return {
    verified: true,
    scope: "local_hardware_vs_declared_runtime_only",
    intendedMode: preflight.assessment?.intendedMode ?? null,
    minimumInstructionSet: minimum,
    instructionSetCompatible,
    baseHardwareEligible: baseEligible,
    readyForArtifactStage,
    holdReasons,
    modelLoadVerified: false,
    tokenizerExecutionVerified: false,
    inferenceVerified: false,
  };
}

export async function readCompatibility(preflightPath, manifestPath) {
  const [preflightRaw, manifestRaw] = await Promise.all([
    readFile(preflightPath, "utf8"),
    readFile(manifestPath, "utf8"),
  ]);
  return evaluateLocalRuntimeCompatibility(
    JSON.parse(preflightRaw),
    JSON.parse(manifestRaw),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error("HOLD: usage node evaluate-local-runtime.mjs <windows-preflight.json> <private-runtime-manifest.json>");
    process.exitCode = 2;
  } else {
    try {
      const result = await readCompatibility(args[0], args[1]);
      console.log(JSON.stringify(result, null, 2));
      if (!result.readyForArtifactStage) {
        console.error("HOLD: local runtime hardware compatibility not established");
        process.exitCode = 1;
      } else {
        console.log("PASS: hardware is compatible with declared CPU requirement; NOT a model-load or inference receipt");
      }
    } catch (error) {
      console.error("HOLD:", error instanceof Error ? error.message : "unknown");
      process.exitCode = 1;
    }
  }
}
