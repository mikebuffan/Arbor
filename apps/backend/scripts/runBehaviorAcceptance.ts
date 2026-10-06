import { readFileSync, openSync, writeFileSync, fsyncSync, closeSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { runAcceptanceComparison, validateAcceptanceInput, type FixtureFactory } from "../lib/arbor/agency/acceptanceRunner";
import { provisionAcceptanceFixture } from "../lib/arbor/agency/acceptanceFixture";

// Private CLI only. No HTTP route, deployment, credential discovery or worker.
async function main() {
  const [generationPath, assignmentPath, configPath, outputPrefix, fixtureModule] = process.argv.slice(2);
  if (!generationPath || !assignmentPath || !configPath || !outputPrefix)
    throw new Error("Usage: tsx scripts/runBehaviorAcceptance.ts GENERATION ASSIGNMENT CONFIG OUTPUT_PREFIX [HOST_FIXTURE_MODULE]");
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const generation = read(generationPath);
  const assignment = read(assignmentPath);
  const config = read(configPath);
  validateAcceptanceInput(generation, assignment, config);
  if (!process.env.OPENAI_API_KEY) throw new Error("acceptance_host_key_missing");
  const { openai } = await import("../lib/providers/openai");
  const provision: FixtureFactory = fixtureModule
    ? (await import(pathToFileURL(resolve(fixtureModule)).href)).provisionAcceptanceFixture
    : provisionAcceptanceFixture;
  if (typeof provision !== "function") throw new Error("Fixture module must export provisionAcceptanceFixture");
  // Reserve both files before inference. Never overwrite an earlier capture.
  const events = openSync(`${outputPrefix}.events.jsonl`, "wx", 0o600);
  let results: number | undefined;
  try {
    results = openSync(`${outputPrefix}.results.json`, "wx", 0o600);
    const result = await runAcceptanceComparison({ generation, assignment, config, provision,
      createResponse: request => openai.responses.create(request),
      record: async event => { writeFileSync(events, JSON.stringify(event) + "\n"); fsyncSync(events); },
    });
    writeFileSync(results, JSON.stringify(result, null, 2) + "\n");
    fsyncSync(results);
    console.log(JSON.stringify({ status: result.status, capturedPairs: result.pairs.length,
      failures: result.failures.length, modelCalls: result.calls }));
    if (result.failures.length) process.exitCode = 1;
  } finally {
    closeSync(events);
    if (results !== undefined) closeSync(results);
  }
}

main().catch((error: unknown) => {
  // Provider/adapter errors can contain sensitive request details. Actual
  // partial receipts stay private; never echo arbitrary errors to stdout.
  console.error(error instanceof Error && error.message === "acceptance_host_key_missing"
    ? "Acceptance runner stopped: model credential is not configured on this host. No inference performed."
    : "Acceptance runner stopped. Check configuration and private event capture; no completed run is claimed.");
  process.exitCode = 1;
});
