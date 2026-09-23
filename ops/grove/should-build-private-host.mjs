#!/usr/bin/env node
/**
 * OPTIONAL Vercel project-specific Ignored Build Step, never a repo-wide
 * deployment rule. Run only in the dedicated grove-private-api PROJECT's
 * Settings > Git > Ignored Build Step with this relative-to-app-root command:
 *
 *   node ../../ops/grove/should-build-private-host.mjs
 *
 * Vercel convention: exit 0 = SKIP, exit 1 = BUILD.
 * This script never deploys, reads secrets, contacts network or alters git.
 * IMPORTANT: owner must confirm exact Vercel project ID and approve applying
 * settings. Do NOT configure it on public Firefly or research projects.
 */
import {pathToFileURL} from "node:url";

export const OLD_PRODUCTION_BRANCH =
  "deploy/grove-private-api-20260921";
export const REVIEW_PREVIEW_BRANCH =
  "feature/grove-private-release-readiness-20260923";

export function grovePrivateBuildDecision(env) {
  const stage = env.VERCEL_ENV;
  const branch = env.VERCEL_GIT_COMMIT_REF;
  if (!stage || !branch)
    return {build:false,reason:"unverified_vercel_branch_or_stage"};
  if (stage === "production" && branch === OLD_PRODUCTION_BRANCH)
    return {build:true,reason:"existing_private_production_branch"};
  if (stage === "preview" && branch === REVIEW_PREVIEW_BRANCH)
    return {build:true,reason:"approved_preview_candidate_branch"};
  return {build:false,reason:"not_a_private_grove_release_branch"};
}
if (process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href) {
  const decision = grovePrivateBuildDecision(process.env);
  console.log("Grove-only Vercel ignored build step:",
    decision.build ? "BUILD" : "SKIP", decision.reason);
  // Vercel-specific inverted contract: nonzero means continue building.
  process.exitCode = decision.build ? 1 : 0;
}
