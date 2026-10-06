// Source-only verification. No credentials, fetch, models or database access.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const exactStorageHashes = {
  "docs/migrations/PROPOSED_grove_private_turn_claims_20260923.sql": "132cfe643a557bc5cb031c030881513a68ecdb4f2b30fa815b893755f5828832",
  "docs/migrations/PROPOSED_grove_private_turns_20260923.sql": "169431809c13907b64a37011cf5ae25b1e4751bda003282fb4cfe7973857256f",
  "ops/grove/disposable-db/00-private-transcript-acceptance.sql": "c8222230b90ea3375cd3c22b5a90be657b907f30c00bdc1a5d0cfcade738ca95",
  "supabase/grove/migrations/20260922035539_grove_private_owner_access.sql": "a65498df28f22bee32080c629e864366d3859a54a69d9fe231d5cd784df319ee",
  "supabase/grove/migrations/20260922042500_grove_private_firefly_read_grants.sql": "d3acdfe82f9f6c03f44880bdd302b1b680f779219eed1791345a2def02d72c41"
};
const originalCrons = {
  "vercel.json": [
    {
      "path": "/api/admin/system/heartbeat",
      "schedule": "*/10 * * * *"
    }
  ],
  "apps/backend/vercel.json": [
    {
      "path": "/api/admin/system/heartbeat",
      "schedule": "0 0 * * *"
    }
  ],
  "apps/backend/vercel.grove.json": []
};
const commonSkips = [
  'arbor/grove-receiver-r3-20261006',
  'arbor/grove-receiver-r3-alignment-20261006',
  'arbor/grove-combined-connection-20261006',
  'arbor/grove-storage-release-prep-20261006',
  'arbor/grove-release-preparation-20261006',
];
let checked = 0;
for (const [file, expected] of Object.entries(exactStorageHashes)) {
  const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
  assert.equal(actual, expected, `Restored storage source drift: ${file}`);
}
for (const [file, crons] of Object.entries(originalCrons)) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(config.crons, crons, `Original cron drift: ${file}`);
  assert.equal(typeof config.ignoreCommand, 'string');
  assert.ok(Buffer.byteLength(config.ignoreCommand, 'utf8') <= 256,
    `Vercel ignoreCommand exceeds 256 bytes: ${file}`);
  const skips = new Set(commonSkips);
  const acceptance = 'arbor/grove-combined-acceptance-20261006';
  if (file !== 'apps/backend/vercel.grove.json') skips.add(acceptance);
  const negatives = ['', 'main', 'integration/finish-the-buffalo-20261005',
    'arbor/grove-unrelated-20261006', 'grove-release-preparation-20261006',
    'receiver-r3-20261006', ...commonSkips.flatMap(b => [b + '-extra', b + '/child', b.toUpperCase()])];
  for (const branch of new Set([...skips, acceptance, ...negatives])) {
    const result = spawnSync('/bin/sh', ['-c', config.ignoreCommand], {
      env: { VERCEL_GIT_COMMIT_REF: branch }, encoding: 'utf8', timeout: 2000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, skips.has(branch) ? 0 : 1, `${file}: ${JSON.stringify(branch)}`);
    checked++;
  }
}
console.log(`PASS: 5 unchanged storage files; original schedules; ${checked} exact/negative branch cases; all ignore commands within 256 bytes.`);
