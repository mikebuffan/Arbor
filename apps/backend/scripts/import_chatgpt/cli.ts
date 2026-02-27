import { runImport } from "./runImport";

const rootDir = process.argv[2];
const userId = process.argv[3];
const projectId = process.argv[4];

if (!rootDir || !userId || !projectId) {
  console.error("Usage: pnpm tsx apps/backend/scripts/import_chatgpt/cli.ts <exportRootDir> <userId> <projectId>");
  process.exit(1);
}

runImport({ rootDir, userId, projectId }).catch((e: any) => {
  console.error(e);
  process.exit(1);
});