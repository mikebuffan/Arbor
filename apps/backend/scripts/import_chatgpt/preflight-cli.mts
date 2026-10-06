import {createRequire} from "node:module";
const {preflightHistoricalSources}=createRequire(import.meta.url)("./preflight.ts") as typeof import("./preflight");

const files=process.argv.slice(2);
if(!files.length)throw new Error("Usage: node --import tsx scripts/import_chatgpt/preflight-cli.mts <export.json> [...]");
const result=await preflightHistoricalSources(files);
console.log(JSON.stringify(result,null,2));
if(!result.ready)process.exitCode=1;
