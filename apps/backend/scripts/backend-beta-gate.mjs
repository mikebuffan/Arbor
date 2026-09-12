import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const expectedMigrations = [
  "20260823175536_firefly_public_baseline.sql",
  "20260823175539_firefly_storage_attachment_policies_baseline.sql",
  "20260823175543_milestone_1b_attachment_scope.sql",
  "20260829070348_fix_attachment_scoped_metadata_policy.sql",
  "20260910_arbor_linear_runtime.sql",
  "20260910204000_arbor_agency_strategy_candidates.sql",
  "20260911033524_arbor_runtime_state.sql",
  "20260911174750_backend_closeout_hardening.sql",
];

const requiredRoutes = [
  "apps/backend/app/api/chat/route.ts",
  "apps/backend/app/api/conversations/route.ts",
  "apps/backend/app/api/conversations/list/route.ts",
  "apps/backend/app/api/conversations/last/route.ts",
  "apps/backend/app/api/projects/default/route.ts",
  "apps/backend/app/api/memory/items/route.ts",
  "apps/backend/app/api/memory/item/[id]/route.ts",
  "apps/backend/app/api/memory/correct/route.ts",
  "apps/backend/app/api/memory/delete/route.ts",
  "apps/backend/app/api/memory/reset/route.ts",
  "apps/backend/app/api/memory/export/route.ts",
  "apps/backend/app/api/chat/attachments/access/route.ts",
  "apps/backend/app/api/chat/attachments/delete/route.ts",
  "apps/backend/app/api/arbor/voice/route.ts",
  "apps/backend/app/api/arbor/voice/realtime/route.ts",
];

const failures = [];

for (const relativePath of requiredRoutes) {
  if (!existsSync(join(repoRoot, relativePath))) {
    failures.push(`missing required backend route: ${relativePath}`);
  }
}

const migrationsDir = join(repoRoot, "supabase/migrations");
const actualMigrations = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (
  JSON.stringify(actualMigrations) !==
  JSON.stringify([...expectedMigrations].sort())
) {
  failures.push(
    `migration ledger drifted:\nexpected=${expectedMigrations.join(",")}\nactual=${actualMigrations.join(",")}`,
  );
}

const canonAudit = readFileSync(
  join(repoRoot, "docs/audits/backend-canon-reconciliation-milestone-1b.md"),
  "utf8",
);

for (const requiredCanon of [
  "Ordinary conversation does not depend on heartbeat, decay, or reflection.",
  "Persistent decay and reflection remain quarantined.",
  "eight migrations",
]) {
  if (!canonAudit.includes(requiredCanon)) {
    failures.push(`backend canon lost required invariant: ${requiredCanon}`);
  }
}

if (failures.length > 0) {
  console.error("BACKEND BETA GATE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("BACKEND BETA GATE: PASS");
console.log(`- ${requiredRoutes.length} required routes present`);
console.log(`- ${actualMigrations.length} canonical migrations present`);
console.log("- maintenance quarantine invariants present");
