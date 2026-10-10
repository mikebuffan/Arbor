import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./source-only-ignore.mjs", import.meta.url));
const branch = "review/one-arbor-independence-budget-preflight-20261009";
const project = "prj_bliWIoBwJ053cXPIBB9uJzpW4PK6";
const preview = { VERCEL_ENV: "preview", VERCEL_PROJECT_ID: project, VERCEL_GIT_COMMIT_REF: branch };
function exitCode(env) {
  // Deliberately exclude inherited Vercel metadata and all credentials.
  const result = spawnSync(process.execPath, [script], { env, encoding: "utf8" });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  return result.status;
}
test("exact isolated project and reviewed Preview branch may build", () => {
  assert.equal(exitCode(preview), 1);
});
test("review branch stays fenced in production, development and missing environment", () => {
  for (const stage of ["production", "development", "", "Preview"]) {
    assert.equal(exitCode({ ...preview, VERCEL_ENV: stage }), 0);
  }
  assert.equal(exitCode({ VERCEL_PROJECT_ID: project, VERCEL_GIT_COMMIT_REF: branch }), 0);
});
test("public, private, sandbox and missing project remain fenced", () => {
  for (const id of ["prj_JArYlugmdFovY10CxZ0LEJmcrsKC", "prj_OHM6b4QpfGZGNWpx4hSPkgHCuyzp",
    "prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN", "prj_rQorFjTn3bAfgLahoYSQR7Ry83O9", "", project + "-other"]) {
    assert.equal(exitCode({ ...preview, VERCEL_PROJECT_ID: id }), 0);
  }
  assert.equal(exitCode({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: branch }), 0);
});
test("every existing source-only branch remains fenced outside the sole exception", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(script, "utf8");
  const entries = [...source.split("]);", 1)[0].matchAll(/"([^"\n]+)"/g)].map(match => match[1]);
  assert.ok(entries.length > 60);
  for (const ref of entries) {
    assert.equal(exitCode({ VERCEL_GIT_COMMIT_REF: ref }), 0, ref);
    assert.equal(exitCode({ ...preview, VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: ref }), 0, ref);
    if (ref !== branch) assert.equal(exitCode({ ...preview, VERCEL_GIT_COMMIT_REF: ref }), 0, ref);
  }
});
test("unlisted main and production refs retain their original build decision", () => {
  for (const ref of ["main", "production", "unlisted-feature"]) {
    assert.equal(exitCode({ VERCEL_GIT_COMMIT_REF: ref }), 1);
  }
});
test("isolated project rejects main, unknown branches and missing branch metadata", () => {
  for (const ref of ["main", "production", "unlisted-feature", ""]) {
    for (const stage of ["preview", "production", "development", ""]) {
      assert.equal(exitCode({ ...preview, VERCEL_ENV: stage, VERCEL_GIT_COMMIT_REF: ref }), 0,
        stage + " " + ref);
    }
  }
  assert.equal(exitCode({ VERCEL_PROJECT_ID: project, VERCEL_ENV: "preview" }), 0);
});

test("batch20 security and recovery draft remains source-only in every deployment stage", () => {
  const reviewBranch = "fix/batch20-identity-issuer-gate-20261009";
  for (const stage of ["preview", "production", "development", ""]) {
    for (const id of [project, "prj_JArYlugmdFovY10CxZ0LEJmcrsKC", ""]) {
      assert.equal(exitCode({ VERCEL_ENV: stage, VERCEL_PROJECT_ID: id, VERCEL_GIT_COMMIT_REF: reviewBranch }), 0);
    }
  }
});


test("chat safe-batch review stays source-only in all projects and deployment stages", () => {
  const reviewBranch = "fix/chat-safe-batch-followthrough-20261009";
  for (const stage of ["preview", "production", "development", ""]) {
    for (const id of [project, "prj_JArYlugmdFovY10CxZ0LEJmcrsKC", ""]) {
      assert.equal(exitCode({ VERCEL_ENV: stage, VERCEL_PROJECT_ID: id, VERCEL_GIT_COMMIT_REF: reviewBranch }), 0);
    }
  }
});

test("boundary receipts draft stays source-only in all deployment environments", () => {
  const reviewBranch = "fix/chat-boundary-pending-receipts-20261009";
  for (const stage of ["preview", "production", "development", ""]) {
    for (const id of [project, "prj_JArYlugmdFovY10CxZ0LEJmcrsKC", ""]) {
      assert.equal(exitCode({ VERCEL_ENV: stage, VERCEL_PROJECT_ID: id, VERCEL_GIT_COMMIT_REF: reviewBranch }), 0);
    }
  }
});

test("97-task review draft never deploys on any project or stage", () => {
  const ref = "fix/one-arbor-97-unlock-review-20261009";
  for (const stage of ["preview", "production", "development", ""]) {
    for (const id of [project, "prj_JArYlugmdFovY10CxZ0LEJmcrsKC", ""]) {
      assert.equal(exitCode({ VERCEL_ENV: stage, VERCEL_PROJECT_ID: id, VERCEL_GIT_COMMIT_REF: ref }), 0);
    }
  }
});

test("GitHub run discovery draft remains source-only in every environment", () => {
  const ref = "fix/one-arbor-github-run-discovery-20261009";
  for (const stage of ["preview","production","development",""]) {
    for (const id of [project,"prj_JArYlugmdFovY10CxZ0LEJmcrsKC",""]) {
      assert.equal(exitCode({VERCEL_ENV:stage,VERCEL_PROJECT_ID:id,VERCEL_GIT_COMMIT_REF:ref}),0);
    }
  }
});
 
test("cross-round receipt draft remains source-only for every project and environment", () => {
  const ref = "fix/cross-round-receipt-retention-20261009";
  for (const stage of ["preview","production","development",""]) {
    for (const id of [project,"prj_JArYlugmdFovY10CxZ0LEJmcrsKC",""]) {
      assert.equal(exitCode({VERCEL_ENV:stage,VERCEL_PROJECT_ID:id,VERCEL_GIT_COMMIT_REF:ref}),0);
    }
  }
});

test("C08 correction-count review branch cannot deploy", () => {
  const ref = "fix/unlock-c08-correction-count-20261009";
  for (const stage of ["preview", "production", "development", ""]) {
    for (const id of [project, "prj_JArYlugmdFovY10CxZ0LEJmcrsKC", ""]) {
      assert.equal(exitCode({VERCEL_ENV: stage, VERCEL_PROJECT_ID: id, VERCEL_GIT_COMMIT_REF: ref}), 0);
    }
  }
});

test("D12 self-update score review stays source-only", () => {
 const ref="fix/d12-unverified-score-20261009";
 for (const stage of ["preview","production","development",""]) {
   for(const id of [project,"prj_JArYlugmdFovY10CxZ0LEJmcrsKC",""]) {
     assert.equal(exitCode({VERCEL_ENV:stage,VERCEL_PROJECT_ID:id,VERCEL_GIT_COMMIT_REF:ref}),0);
   }
 }
});

test("combined Grove exact-conversation continuity branch stays source-only", () => {
  const ref = "fix/one-arbor-exact-grove-continuity-20261009";
  for (const stage of ["preview","production","development",""]) {
    for(const id of [project,"prj_JArYlugmdFovY10CxZ0LEJmcrsKC",""]) {
      assert.equal(exitCode({VERCEL_ENV:stage,VERCEL_PROJECT_ID:id,VERCEL_GIT_COMMIT_REF:ref}),0);
    }
  }
});

test("Grove replay capture draft is source-only", () => {
  const ref = "fix/grove-replay-runtime-capture-20261010";
  for (const stage of ["preview","production","development",""]) {
    for(const id of [project,"prj_JArYlugmdFovY10CxZ0LEJmcrsKC",""]) {
      assert.equal(exitCode({VERCEL_ENV:stage,VERCEL_PROJECT_ID:id,VERCEL_GIT_COMMIT_REF:ref}),0);
    }
  }
});

test("Grove history ordering source review cannot deploy", () => {
  const ref="fix/grove-restart-history-order-20261010";
  for (const stage of ["preview","production","development",""]) {
    for(const id of [project,"prj_JArYlugmdFovY10CxZ0LEJmcrsKC",""]) {
      assert.equal(exitCode({VERCEL_ENV:stage,VERCEL_PROJECT_ID:id,VERCEL_GIT_COMMIT_REF:ref}),0);
    }
  }
});

test("Grove durable correction restart review stays source-only", () => {
  const ref = "fix/grove-global-correction-restart-20261010";
  for (const stage of ["preview", "production", "development", ""]) {
    for (const id of [project, "prj_JArYlugmdFovY10CxZ0LEJmcrsKC", ""]) {
      assert.equal(exitCode({VERCEL_ENV: stage, VERCEL_PROJECT_ID: id, VERCEL_GIT_COMMIT_REF: ref}), 0);
    }
  }
});

test("Grove phone history order branch cannot deploy", () => {
  const ref="fix/grove-phone-history-order-20261010";
  for (const stage of ["preview","production","development",""]) {
    for (const id of [project,"prj_JArYlugmdFovY10CxZ0LEJmcrsKC",""]) {
      assert.equal(exitCode({VERCEL_ENV:stage,VERCEL_PROJECT_ID:id,VERCEL_GIT_COMMIT_REF:ref}),0);
    }
  }
});
