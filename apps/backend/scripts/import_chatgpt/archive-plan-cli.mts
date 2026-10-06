import fs from "node:fs/promises";
import {createRequire} from "node:module";
const {prepareResumableArchive}=createRequire(import.meta.url)("./resumableArchive.ts") as typeof import("./resumableArchive");
const [output,userId,projectId,...files]=process.argv.slice(2);
if(!output||!userId||!projectId||!files.length)throw Error("Usage: node --import tsx scripts/import_chatgpt/archive-plan-cli.mts <new-manifest.json> <user-id> <project-id> <export.json> [...]");
const {manifest}=await prepareResumableArchive({files,target:{userId,projectId}});
await fs.writeFile(output,JSON.stringify(manifest,null,2),{flag:"wx",mode:0o600});
console.log(JSON.stringify({output,fingerprint:manifest.fingerprint,uniqueTurns:manifest.uniqueTurns,
  batches:manifest.batches.length,writes:"local manifest only",databaseWrites:false,modelCalls:false}));
