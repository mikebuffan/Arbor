import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const backupDir = resolve(
  process.env.FIREFLY_BACKUP_DIR ?? resolve(repoRoot, ".local/backups/firefly"),
);

function fail(message) {
  console.error(`[firefly-backup] ${message}`);
  process.exit(1);
}

function connectionEnv(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail("FIREFLY_DATABASE_URL must be a valid PostgreSQL connection URL");
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    fail("FIREFLY_DATABASE_URL must use postgres:// or postgresql://");
  }

  const { FIREFLY_DATABASE_URL: _secret, ...baseEnv } = process.env;
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

  if (!parsed.hostname || !parsed.username || !databaseName) {
    fail("FIREFLY_DATABASE_URL is missing host, user, or database name");
  }

  return {
    ...baseEnv,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: databaseName,
    PGSSLMODE: parsed.searchParams.get("sslmode") || "require",
  };
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${command} exited with status ${String(result.status)}`);
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const [action = "dump", input] = process.argv.slice(2);

if (action === "dump") {
  const databaseUrl = process.env.FIREFLY_DATABASE_URL;
  if (!databaseUrl) fail("FIREFLY_DATABASE_URL is required");

  mkdirSync(backupDir, { recursive: true });
  const output = resolve(backupDir, `firefly-${timestamp()}.dump`);
  const pgEnv = connectionEnv(databaseUrl);

  run(
    "pg_dump",
    [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      output,
    ],
    pgEnv,
  );

  run("pg_restore", ["--list", output], pgEnv);
  console.log(`[firefly-backup] verified dump: ${output}`);
  process.exit(0);
}

if (action === "verify") {
  if (!input) fail("usage: verify <dump-file>");
  const absolute = resolve(input);
  if (!existsSync(absolute)) fail(`dump file does not exist: ${absolute}`);

  run("pg_restore", ["--list", absolute]);
  console.log(`[firefly-backup] archive verified: ${absolute}`);
  process.exit(0);
}

fail("usage: dump | verify <dump-file>");
