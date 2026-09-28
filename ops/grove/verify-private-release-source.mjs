#!/usr/bin/env node
/** OFFLINE source-only consistency test for a dedicated Grove backend.
 * Not a deployment receipt and never applies migrations or contacts providers.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";

export function verifyGroveSource(read=(p)=>readFileSync(p,"utf8")) {
  const violations=[];
  const load=(path)=>read(new URL("../../"+path,import.meta.url));
  for(const path of ["vercel.json","apps/backend/vercel.json"]){
    let config;
    try {config=JSON.parse(load(path));}
    catch {violations.push(path+":invalid_config");continue;}
    if(!Array.isArray(config.crons)||config.crons.length)
      violations.push(path+":inherited_cron");
  }
  const privateConfig=load("apps/frontend/lib/config/grove_private_config.dart");
  if(!privateConfig.includes("'fqjqpuaoifgbweiguacf.supabase.co'") ||
     !privateConfig.includes("auth.host.toLowerCase() == expectedAuthHost"))
    violations.push("grove_auth_realm_not_pinned");

  const android=load("apps/frontend/android/app/build.gradle.kts");
  for(const marker of [
    "GROVE_ANDROID_KEYSTORE_PATH",
    "GROVE_ANDROID_KEYSTORE_PASSWORD",
    "GROVE_ANDROID_KEY_ALIAS",
    "GROVE_ANDROID_KEY_PASSWORD",
    "groveReleaseRequested",
    "groveRelease",
  ]){
    if(!android.includes(marker))
      violations.push("grove_release_signing_gate_missing:"+marker);
  }
  if(android.includes('signingConfig = signingConfigs.getByName("debug")'))
    violations.push("grove_release_uses_debug_signing");

  const provider=load("apps/backend/lib/providers/openai.ts");
  if(!provider.includes("export const openai = new Proxy") ||
     !provider.includes("Reflect.get(getClient(), property)"))
    violations.push("legacy_openai_not_lazy");
  const loop=load("apps/backend/lib/grove/privateConversationLoop.ts");
  for(const flag of [
    "GROVE_PRIVATE_CHAT_PREVIEW_ENABLED",
    "GROVE_PRIVATE_MODEL_TURN_ENABLED",
    "GROVE_PRIVATE_TRANSCRIPT_ENABLED",
    "GROVE_PRIVATE_CLAIM_ENABLED",
    "GROVE_COGNITIVE_PREVIEW_ENABLED",
  ]){
    if(!loop.includes('env.'+flag+' === "true"'))
      violations.push("feature_not_explicitly_opt_in:"+flag);
  }
  const route=load("apps/backend/app/api/grove/chat/conversations/route.ts");
  if(!route.includes('process.env.GROVE_PRIVATE_NEW_CONVERSATION_ENABLED !== "true"'))
    violations.push("new_conversation_not_opt_in");
  const transcript=load("docs/migrations/PROPOSED_grove_private_turns_20260923.sql");
  const claims=load("docs/migrations/PROPOSED_grove_private_turn_claims_20260923.sql");
  if(!transcript.includes("GRANT SELECT ON public.grove_private_turns TO service_role")||
     transcript.includes("GRANT SELECT, INSERT ON public.grove_private_turns TO service_role"))
    violations.push("unfenced_private_transcript_write_grant");
  if(!claims.includes("grove_private_complete_turn")||
     !claims.includes("v_claim.lease_token <> p_lease_token")||
     !claims.includes("FOR SHARE OF o,b,g")||
     !claims.includes("GRANT EXECUTE ON FUNCTION public.grove_private_complete_turn"))
    violations.push("fenced_completion_migration_missing");
  const pipeline=load(".github/workflows/arbor-ci.yml");
  if(!pipeline.includes('OPENAI_API_KEY: ""') ||
     !pipeline.includes('GROVE_PRIVATE_CLAIM_ENABLED: "false"') ||
     !pipeline.includes("Grove disposable private transcript schema acceptance"))
    violations.push("key_free_and_disposable_db_ci_missing");
  const filter=load("ops/grove/should-build-private-host.mjs");
  if(!filter.includes('"release/grove-private-source-candidate-20260923"')||
     !filter.includes('"deploy/grove-private-api-20260921"')||
     filter.includes('REVIEW_PREVIEW_BRANCH =\n  "feature/grove-private-release-readiness-20260923"'))
    violations.push("optional_isolated_preview_filter_drift");
  return violations;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const fail=verifyGroveSource();
  for(const v of fail)console.error("FAIL:",v);
  if(fail.length)process.exitCode=1;
  else console.log("PASS: offline private Grove source gates; LIVE_DEPLOYMENT=NOT_VERIFIED");
}
