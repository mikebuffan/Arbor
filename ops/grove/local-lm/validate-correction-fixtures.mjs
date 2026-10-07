#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const TRAIN = "ops/grove/local-lm/arbor-lm-v04-targeted-correction-train.jsonl";
const HOLDOUT = "ops/grove/local-lm/arbor-lm-v04-next-holdout.jsonl";
const expectedTrainFamilies = {
  metadata_boundary: 14,
  deployment_status: 8,
  pronoun_ownership: 8,
  no_adjacent_invention: 8,
  natural_shared_agency: 10,
};
const expectedHoldoutFamilies = {
  metadata_boundary: 6,
  deployment_status: 4,
  pronoun_ownership: 4,
  no_adjacent_invention: 4,
  natural_shared_agency: 6,
};

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
function countFamilies(rows) {
  const out = {};
  for (const row of rows) out[row.family] = (out[row.family] ?? 0) + 1;
  return out;
}
function exactObject(actual, expected, code) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw Error(code + ": " + JSON.stringify(actual));
  }
}
async function readJsonl(path) {
  const raw = await readFile(path, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw Error(path + ": invalid JSON at line " + (index + 1));
    }
  });
}
export async function validateCorrectionFixtures() {
  const [train, holdout] = await Promise.all([readJsonl(TRAIN), readJsonl(HOLDOUT)]);
  if (train.length !== 48) throw Error("targeted correction training count changed");
  if (holdout.length !== 24) throw Error("targeted correction holdout count changed");

  const ids = new Set();
  const trainUsers = new Set();
  for (const row of train) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        typeof row.id !== "string" || typeof row.family !== "string" ||
        typeof row.user !== "string" || !row.user.trim() ||
        typeof row.assistant !== "string" || !row.assistant.trim() ||
        Object.prototype.hasOwnProperty.call(row, "criterion")) {
      throw Error("training fixture schema invalid");
    }
    if (ids.has(row.id)) throw Error("duplicate fixture id");
    ids.add(row.id);
    const user = normalize(row.user);
    if (trainUsers.has(user)) throw Error("duplicate training prompt");
    trainUsers.add(user);
  }

  const holdoutUsers = new Set();
  for (const row of holdout) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        typeof row.id !== "string" || typeof row.family !== "string" ||
        typeof row.user !== "string" || !row.user.trim() ||
        typeof row.criterion !== "string" || !row.criterion.trim() ||
        Object.prototype.hasOwnProperty.call(row, "assistant")) {
      throw Error("holdout fixture schema invalid");
    }
    if (ids.has(row.id)) throw Error("duplicate fixture id");
    ids.add(row.id);
    const user = normalize(row.user);
    if (holdoutUsers.has(user)) throw Error("duplicate holdout prompt");
    if (trainUsers.has(user)) throw Error("holdout leaked into training prompts");
    holdoutUsers.add(user);
  }

  exactObject(countFamilies(train), expectedTrainFamilies,
    "training family balance changed");
  exactObject(countFamilies(holdout), expectedHoldoutFamilies,
    "holdout family balance changed");

  const serializedTrain = JSON.stringify(train);
  if (/arbor_lm_v04_private_holdout_20260923_013632_257640\.jsonl/i.test(serializedTrain)) {
    throw Error("prior private holdout copied into training set");
  }
  if (/ladybamf|buffan|@gmail|account number|password\s*[:=]/i.test(serializedTrain)) {
    throw Error("personal/private literal detected in synthetic training fixtures");
  }

  return {
    trainCount: train.length,
    holdoutCount: holdout.length,
    trainFamilies: countFamilies(train),
    holdoutFamilies: countFamilies(holdout),
    exactPromptOverlap: 0,
    status: "PREPARED_NOT_TRAINED",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await validateCorrectionFixtures(), null, 2));
    console.log("PASS: targeted correction fixtures are isolated; no training or inference was performed");
  } catch (error) {
    console.error("FAIL:", error instanceof Error ? error.message : "unknown");
    process.exitCode = 1;
  }
}
