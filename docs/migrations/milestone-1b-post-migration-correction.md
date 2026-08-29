# Milestone 1B attachment post-migration correction evidence

Status: local forward correction only; Firefly correction not applied

## Preserved Firefly event

Migration `20260823175543_milestone_1b_attachment_scope.sql` applied to
Firefly successfully with SHA-256
`9154E5281125CE5F5C13C3C93897BB2ACF2395E480B6FC0D64CC05B4E886E0F5`.
The immediate installed-policy catalog check then exposed PostgreSQL inner-scope
name resolution in the policy expression: the conversation and message project
comparisons, and the message conversation comparison, had deparsed as
tautologies.

Application-level attachment E2E stopped at that catalog gate. Both synthetic
runs were fully cleaned; the final manifest is
`supabase/.temp/attachment-e2e/ARBOR_E2E_20260829T054704Z_4AED1E00/manifest.json`
with phase `cleanup_complete_with_catalog_failure`. Firefly returned to zero
`chat_attachments` rows and zero `chat-attachments` objects, and the dedicated
synthetic parent resources were removed. No rollback was run. Firefly was
deliberately left in the otherwise-hardened state.

The applied migration is immutable. The policy repair is the new forward
migration
`20260829070348_fix_attachment_scoped_metadata_policy.sql`, not an amendment,
squash, or migration-history rewrite.

## Structured Storage absence evidence

A bounded read-only probe against guaranteed-missing synthetic keys made no
row, object, policy, grant, schema, or history change. Firefly's body-bearing
Storage object-info response distinguishes:

- missing object: `code = NoSuchKey`;
- missing bucket: `code = NoSuchBucket`.

Both responses otherwise share the legacy HTTP/status representation. The
installed Storage SDK's bodyless `exists()` request discards the distinguishing
code, and its body-bearing wrapper also discards the raw `code`. The broker
therefore reads the body-bearing object-info response at the existing
server-only privileged boundary, retains only the allowlisted `code`, and
discards the rest without logging it.

Only `NoSuchKey` with the observed/documented 400 or 404 response is accepted as
verified absence. `NoSuchBucket`, legacy `not_found`, an unclassified 404,
authentication/configuration failures, malformed bodies, unknown codes, network
errors, and `NoSuchKey` on an unexpected status remain fail-closed errors.

## Local verification

The new migration SHA-256 is
`BC7CF87A040A3E975847F53BF11EF5DFA79CAFF3F7AE78274A2E05FB62173CB9`.
Supabase CLI `2.115.0` rebuilt the full ordered chain twice from a clean local
database:

1. `20260823175536_firefly_public_baseline.sql`;
2. `20260823175539_firefly_storage_attachment_policies_baseline.sql`;
3. `20260823175543_milestone_1b_attachment_scope.sql` (the immutable historical
   migration, including the reproduced flawed policy);
4. `20260829070348_fix_attachment_scoped_metadata_policy.sql`.

After each reset, the permanent pgTAP policy suite passed all 20 checks against
the installed/deparsed expression and authenticated behavior. It proves the
three tautologies are absent, all five required outer correlations are present,
correct scope is selectable, conversation/project and message scope mismatches
are denied, the final grant matrix is unchanged, no authenticated attachment
Storage policy exists, and the private bucket configuration is unchanged.

The focused attachment/boundary suite passed 55/55. Focused Milestone 1B-B
passed 10/10. Focused Milestone 1B-A passed 113/114, and full Vitest passed
123/124; in both, the sole failure was the accepted inherited Michael/Mike
assertion in `promoteIdentityAnchors.test.ts`. Standalone TypeScript and the
Next.js production build passed. Changed-file ESLint reported zero findings.
The focused sensitive-logging/service-boundary set passed 38/38.

The temporary local-emulator port override required by the Windows reserved
port range was restored exactly before verification completed. No Firefly SQL,
migration-history operation, row/object mutation, policy/grant change, fixture
seed, or E2E execution occurred during this correction phase.
