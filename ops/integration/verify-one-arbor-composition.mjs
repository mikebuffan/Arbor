// Read-only reviewed-source fingerprint gate. No network, credentials, or writes.
// Hashes are Git SHA-1 blob IDs, not proof of owner approval or live deployment.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = resolve(root, 'docs/integration/ONE_ARBOR_COMPOSED_SOURCE_FINGERPRINTS_20261007.json');

function gitBlobHash(data) {
  const header = Buffer.from(`blob ${data.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(data).digest('hex');
}
function assert(condition, message) {
  if (!condition) throw Error(`composition_guard: ${message}`);
}
// The well-known Git hash of 'hello\\n' catches a broken hash implementation.
assert(gitBlobHash(Buffer.from('hello\n')) === 'ce013625030ba8dba906f756967f9e9ca394464a',
  'git_blob_hash_self_test_failed');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert(manifest.schemaVersion === 1 && manifest.mode === 'source-only-review-no-deployment',
  'manifest_version_or_mode_invalid');
assert(typeof manifest.baseSource === 'string' && /^[a-f0-9]{40}$/.test(manifest.baseSource),
  'base_source_missing');
const owners = manifest.owners;
assert(owners && typeof owners === 'object' &&
  ['group01_pr344', 'group03_pr346', 'group04_pr345', 'group04_pr347', 'group05_pr343', 'group06_pr348', 'group12_pr355']
    .every(key => /^[a-f0-9]{40}$/.test(owners[key] || '')),
  'owner_head_incomplete');
const expected = manifest.expectedBlobSha;
assert(expected && typeof expected === 'object' && Object.keys(expected).length >= 19,
  'required_fingerprints_missing');
let verified = 0;
for (const [name, sha] of Object.entries(expected)) {
  assert(typeof name === 'string' && !isAbsolute(name) &&
    name.split(/[\\/]/).every(part => part !== '..' && part !== '.' && part.length > 0),
    `invalid_path:${name}`);
  assert(typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha),
    `invalid_blob_sha:${name}`);
  const absolute = resolve(root, name);
  assert(!relative(root, absolute).startsWith('..' + sep),
    `outside_repository:${name}`);
  let bytes;
  try { bytes = readFileSync(absolute); }
  catch { throw Error(`composition_guard: unreadable_source:${name}`); }
  const actual = gitBlobHash(bytes);
  assert(actual === sha, `source_changed:${name}:expected=${sha}:actual=${actual}`);
  verified++;
}
const ignore = readFileSync(resolve(root, 'ops/grove/source-only-ignore.mjs'), 'utf8');
for (const name of [
  'review/one-arbor-composed-g01-g03-g04-g05-g06-20261007',
  'test/one-arbor-group5-continuity-time-20261007',
  'review/one-arbor-group01-canonical-ledger-20261007',
  'review/one-arbor-group03-archive-ledger-20261007',
  'test/one-arbor-group12-private-host-replay-20261007',
  'review/one-arbor-group12-integration-20261007',
  'fix/one-arbor-group04-memory-scope-20261007',
  'fix/group4-memory-exclusion-shelf-20261007',
  'review/one-arbor-group06-self-model-20261007',
]) {
  assert(ignore.includes(`"${name}"`), `source_only_branch_missing:${name}`);
}
console.log(`ONE ARBOR SOURCE FINGERPRINT PASS: ${verified} exact Git blobs; review-only; no live acceptance`);
