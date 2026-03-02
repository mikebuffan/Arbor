import path from "node:path";
import dotenv from "dotenv";

function loadEnv() {
  const cwd = process.cwd();

  const candidates = [
    path.resolve(cwd, ".env.local"),
    path.resolve(cwd, ".env"),
    path.resolve(cwd, "apps/backend/.env.local"),
    path.resolve(cwd, "apps/backend/.env"),
    path.resolve(cwd, "../../.env.local"),
    path.resolve(cwd, "../../.env"),
  ];

  for (const p of candidates) dotenv.config({ path: p });

  console.log("[env] OPENAI_API_KEY present?", !!process.env.OPENAI_API_KEY);
  console.log("[env] SUPABASE_URL present?", !!process.env.SUPABASE_URL);
  console.log("[env] SUPABASE_SERVICE_ROLE_KEY present?", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getFlag(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return "true";
  return next;
}

async function main() {
  loadEnv();

  const rootDir = process.argv[2];
  const userId = process.argv[3];
  const projectId = process.argv[4] ?? null;

  if (!rootDir || !userId) {
    console.error(
      'Usage: pnpm tsx scripts/import_chatgpt/cli.ts "<export_root_dir>" "<user_id>" "<project_id_or_null>" [--dry-run] [--turns-per-chunk 10] [--global-user-id <uuid>]'
    );
    process.exit(1);
  }

  const dryRun = getFlag("--dry-run") === "true";
  const turnsPerChunkRaw = getFlag("--turns-per-chunk");
  const turnsPerChunk = turnsPerChunkRaw ? Number(turnsPerChunkRaw) : 10;
  const globalUserId = getFlag("--global-user-id");

  const { runImport } = await import("./runImport");
  await runImport({
    rootDir,
    userId,
    projectId,
    dryRun,
    turnsPerChunk: Number.isFinite(turnsPerChunk) && turnsPerChunk > 0 ? turnsPerChunk : 10,
    globalUserId: globalUserId && globalUserId !== "true" ? globalUserId : null,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});