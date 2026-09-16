import "dotenv/config";
import path from "node:path";
import { runImport } from "./runImport";

const rootDir = process.argv[2];
const userId = process.argv[3] ?? process.env.ARBOR_IMPORT_USER_ID;
const projectId = process.argv[4] ?? process.env.ARBOR_IMPORT_PROJECT_ID;

if (!rootDir || !userId || !projectId) {
  throw new Error(
    "Usage: tsx scripts/import_chatgpt/importHistoricalOnly.ts <export-directory> [user-id] [project-id]",
  );
}

await runImport({
  rootDir: path.resolve(rootDir),
  userId,
  projectId,
  historicalOnly: true,
  embedHistorical: false,
});

console.log("[history-transport] raw historical turns are available for lexical recall and pattern hopping.");
