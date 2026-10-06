# Grove Library scope-invalidation repair — 2026-09-21

Stacked on the still-draft project document shelf PR #133. Neither
production nor ARK runtime was touched.

## Verified code gap being addressed
The memory and document shelves originally cleared old data when a user
clicked Refresh or a fetch failed, but did not listen for local active
project/thread changes or authentication transitions while mounted. They
could temporarily display prior-scope cards until navigation/reload.

## Repair
- ArborSession broadcasts local context changes synchronously AFTER the
  in-memory context is updated, before asynchronous preference writes.
- Production shelf widgets subscribe to session-change and Supabase-auth
  streams; immediately clear displayed rows, cancel acceptance of earlier
  responses via request generation and reload the current authorized scope.
- Subscriptions are canceled on disposal, and rebound if the loader changes.
- Fake-loader widget tests use an injected invalidation stream, never
  requiring live sign-in or credentials.
- Regression tests verify saved-memory and file-name disappearance before
  the new project's network read resolves, plus event ordering and signout
  clearing.

## Limitations / gates
- A code-level regression test cannot replace a real-device signout,
  user-switch, and project-switch privacy acceptance test.
- The underlying draft #133 still lists chat attachments only. It does
  not open, parse or verify files, nor turn ARK into unattended execution.
- Do not separately merge stacked PRs or deploy while Mike's release
  gate is active. Coordinate #122 → #129 → #130 → #132 → #133 → this fix.
