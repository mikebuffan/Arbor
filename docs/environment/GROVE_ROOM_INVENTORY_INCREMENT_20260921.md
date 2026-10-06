# Grove room inventory — isolated foundation

This branch is stacked on the consolidated, unmerged Grove PR #129.
It adds no routes, workers, database tables, cloud sync, app permissions,
production changes, or changes to the approved room artwork.

## What exists here

- A stable-ID, immutable inventory model for the approved house's existing
  workstation, Living Window, library shelves, and Moss resting spots.
- A pure move operation that produces a proposed new inventory, without
  changing the saved Grove world journal or pretending activity happened.
- Project-scoped source items that require an explicit project ID and source
  locator. Default scenery contains **no** invented source documents.
- Filtered room reads that cannot expose another project's source entries.
- Tests for the above, including immutable views, duplicate IDs, and invalid
  provenance.
- A read-only room inventory panel on Grove Home and a Library-first view on
  Memory & State, with room chooser and honest source/scenery labels.
- Widget tests proving unauthenticated and mismatched-project source entries
  are hidden. The production panels supply scenery only, not fake files.

## What is NOT built

This is a visible, read-only catalog, NOT a connected live Library, a durable
inventory database, a file upload, or art that changes with room objects. There is no persistence for inventory
items and no authorization bypass: a future backend source lookup must still
perform real authentication and ownership checks on every request.

Next: review the Grove integration and perform signed-in physical device
acceptance. Later connect real authenticated file retrieval and explicit
persistence with an owner-reviewed retention/sync policy. Do not merge
this branch before PR #129 is accepted; do not independently merge the older
Grove UI source branches in addition to #129.
