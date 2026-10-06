import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifyGroveSource} from "./verify-private-release-source.mjs";
const root=new URL("../../",import.meta.url);
const original=(path)=>readFileSync(path,"utf8");
function corrupted(match,replacement){
  return verifyGroveSource(url=>{
    const source=original(url);
    return url.pathname.endsWith(match)?replacement(source):source;
  });
}
test("exact source has source-only (NOT live) deployment gates",()=>{
  assert.deepEqual(verifyGroveSource(),[]);
  assert.ok(root.href.endsWith("/"));
});
test("both Vercel config scopes must omit Firefly cron",()=>{
  for(const path of ["/vercel.json","apps/backend/vercel.json"]){
    const issues=corrupted(path,s=>s.replace('"crons": []',
      '"crons": [{"path":"/api/admin/system/heartbeat","schedule":"* * * * *"}]'));
    assert.ok(issues.some(s=>s.includes(":inherited_cron")));
  }
});
test("legacy OpenAI must remain lazy on missing key",()=>{
  assert.ok(corrupted("apps/backend/lib/providers/openai.ts",
    s=>s.replace("export const openai = new Proxy","export const openai = new OpenAI"))
    .includes("legacy_openai_not_lazy"));
});
test("feature flags, independent claim and persisted fence cannot regress",()=>{
  assert.ok(corrupted("apps/backend/lib/grove/privateConversationLoop.ts",
    s=>s.replace('env.GROVE_PRIVATE_CLAIM_ENABLED === "true"',
      "Boolean(env.GROVE_PRIVATE_CLAIM_ENABLED)"))
    .includes("feature_not_explicitly_opt_in:GROVE_PRIVATE_CLAIM_ENABLED"));
  assert.ok(corrupted("docs/migrations/PROPOSED_grove_private_turns_20260923.sql",
    s=>s.replace("GRANT SELECT ON public.grove_private_turns TO service_role",
      "GRANT SELECT, INSERT ON public.grove_private_turns TO service_role"))
    .includes("unfenced_private_transcript_write_grant"));
  assert.ok(corrupted("docs/migrations/PROPOSED_grove_private_turn_claims_20260923.sql",
    s=>s.replace("v_claim.lease_token <> p_lease_token",
      "v_claim.lease_token = p_lease_token"))
    .includes("fenced_completion_migration_missing"));
});
test("research or stale draft branch cannot become private preview filter",()=>{
  assert.ok(corrupted("ops/grove/should-build-private-host.mjs",
    s=>s.replace('"release/grove-private-source-candidate-20260923"',
      '"chore/research-ci-trigger-cleanup-handoff-20260923"'))
    .includes("optional_isolated_preview_filter_drift"));
});
