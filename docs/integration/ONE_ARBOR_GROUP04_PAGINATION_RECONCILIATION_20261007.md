# One Arbor — Group 4 source-only conflict reconciliation (2026-10-07)

Parent PR #349 head before reconciliation: `23f77a99627956b35c36bd88e9eb3514a15cc994`; child Group 4 PR #352 source head: `49acefdd8c7b2730d004071efc96c8d057c757c1`.

This proposed two-parent source integration incorporates newer parent review documentation, source fingerprint checks, Group 03 source-only Vercel exclusion and all eight Group 4 child paths. Parent feature code not listed below is untouched. The original 17 source fingerprint entries remain independently checked; four changed Group 4 fingerprints are re-pinned to verified Git blobs, and four new Group 4 files are added for 21 total.

Changed source files:
- `apps/backend/app/api/memory/items/route.ts` -> Git blob `f5d81852a6e4ea97e55825040f60b75484f6c39c`
- `apps/frontend/lib/environment/grove_memory_shelf.dart` -> Git blob `17e98e461846bac6189a853ea9a96e782ca9ba20`
- `apps/frontend/test/grove_memory_shelf_test.dart` -> Git blob `d5e9abadd7a1312469e0f6d02d4f6b54cfccfee8`
- `ops/grove/source-only-ignore.mjs` -> Git blob `865206f47d49c4f152319bf348e9e5a226cfa521`
- `.github/workflows/one-arbor-group04-shelf-pagination.yml` -> Git blob `a5e439673e9b0c81c1c2cbc545aa3375599f8a11`
- `apps/backend/lib/memory/__tests__/shelfPageRead.test.ts` -> Git blob `35b5c43abb6b2c774a1ae3aa75b33507c1e4d3bb`
- `apps/frontend/lib/environment/grove_memory_shelf_view.dart` -> Git blob `31e54c5c459cadce0eeba4bb577922c419cde71a`
- `apps/frontend/test/grove_memory_shelf_view_test.dart` -> Git blob `f01802b64c9ee0ed0116ee66e81344499fdcdf25`

The compositional fingerprint guard remains executable and has not been disabled, ignored, or weakened. Existing project/release owner and earlier independent source heads remain recorded in the manifest. The new Group 4 owner field pins the pre-integration review candidate, not owner signoff. No main merge or production deployment, server permission change, worker/STOP activation, database or personal-memory write, memory promotion, embeddings, or model behavior test.

After integration, require exact-head isolated Group 4 backend and Flutter tests and the existing 21-blob fingerprint guard. A passing source check does not establish deployed or real-model acceptance.
