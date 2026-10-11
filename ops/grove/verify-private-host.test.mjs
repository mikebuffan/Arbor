import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPrivateGroveOrigin, verifyPrivateGroveHost,
  inspectPrivateGroveTalkKeyMetadata, PRIVATE_GROVE_TALK_KEY_GROUPS,
  inspectGroveRestoreDeletionCoverage,
} from "./verify-private-host.mjs";

const origin = "https://grove-private-api.example.org";
function fixture(changes = {}) {
  const called = [];
  const request = async (input, options) => {
    const url = new URL(input);
    called.push({path:url.pathname,method:options.method,
      cache:options.cache,redirect:options.redirect});
    const result = changes[url.pathname + "#" + options.method] ??
      changes[url.pathname] ?? {};
    return new Response(null, {
      status: result.status ??
        (url.pathname === "/api/grove/ark/projects" &&
         options.method === "GET" ? 401 : 404),
      headers: {
        "cache-control": result.cache ?? "no-store",
        ...(result.cors ? {"access-control-allow-origin":"*"} : {}),
      },
    });
  };
  return {called,request};
}

test("only explicit isolated HTTPS origins may be checked", () => {
  assert.equal(assertPrivateGroveOrigin(origin),origin);
  for (const value of [
    "https://firefly-coral.vercel.app",
    "https://abc.supabase.co",
    "https://ci-grove.example.invalid",
    "http://grove-private-api.example.org",
    "https://user:pass@grove-private-api.example.org",
    "https://grove-private-api.example.org/other",
    "https://grove-private-api.example.org?token=secret",
    "http://localhost:3000",
    "https://grove-private-api.example.org:444",
  ]) {
    assert.throws(() => assertPrivateGroveOrigin(value),
      /grove_host_origin_(unsafe|invalid)/);
  }
});

test("preflight checks only safe GET/OPTIONS routes and no private data", async () => {
  const f = fixture();
  const result = await verifyPrivateGroveHost(origin,{request:f.request});
  assert.equal(result.verified,true);
  assert.equal(result.scope,"unauthenticated_private_host_only");
  assert.ok(f.called.some(x =>
    x.path === "/api/grove/ark/projects" && x.method === "GET"));
  assert.equal(f.called.filter(x =>
    x.path === "/api/grove/chat").length,1);
  assert.equal(f.called.find(x =>
    x.path === "/api/grove/chat").method,"GET");
  for (const row of f.called) {
    assert.equal(row.cache,"no-store");
    assert.equal(row.redirect,"manual");
    assert.ok(["GET","OPTIONS"].includes(row.method));
  }
  assert.equal(f.called.length,result.receipts.length);
});

test("a public Firefly route or static asset unexpectedly exposed is HOLD", async () => {
  for (const path of ["/api/chat","/_next/static/chunks/main.js","/"]) {
    const f = fixture({[path]:{status:200}});
    await assert.rejects(
      verifyPrivateGroveHost(origin,{request:f.request}),
      /grove_host_isolation_failed/,
    );
  }
});
test("private host must deny browser preflight and cross-origin CORS", async () => {
  const f = fixture({"/api/grove/ark/projects#OPTIONS":{cors:true}});
  await assert.rejects(
    verifyPrivateGroveHost(origin,{request:f.request}),
    /grove_host_method_or_cors_failed/,
  );
});

test("missing authentication cannot return project discovery or server error", async () => {
  for (const status of [200,404,500,302]) {
    const f = fixture({"/api/grove/ark/projects#GET":{status}});
    await assert.rejects(
      verifyPrivateGroveHost(origin,{request:f.request}),
      /grove_host_auth_boundary_unverified/,
    );
  }
});

test("cacheable private denials are HOLD", async () => {
  const f = fixture({"/api/chat":{cache:"public, max-age=3600"}});
  await assert.rejects(
    verifyPrivateGroveHost(origin,{request:f.request}),
    /grove_host_isolation_failed/,
  );
});


test("current Grove host production key names do not authorize private Talk", () => {
  // Metadata names observed from existing Vercel project. No decrypted values.
  const current = [
    "GROVE_SERVICE_ROLE_KEY", "GROVE_FIREFLY_SERVICE_ROLE_KEY",
    "GROVE_SUPABASE_PUBLISHABLE_KEY", "GROVE_API_ENABLED",
    "GROVE_SUPABASE_URL", "GROVE_FIREFLY_SUPABASE_URL",
    "GROVE_PUBLIC_API_ORIGIN",
  ].map(key => ({key, target:["production"], value:"NOT_READ"}));
  const result = inspectPrivateGroveTalkKeyMetadata(current);
  assert.equal(result.status,"HOLD_MISSING_KEY_NAMES");
  assert.deepEqual(result.missing.privateRealm,[]);
  assert.deepEqual(result.missing.conversationFlags,
    PRIVATE_GROVE_TALK_KEY_GROUPS.conversationFlags);
  assert.deepEqual(result.missing.independentModel,
    PRIVATE_GROVE_TALK_KEY_GROUPS.independentModel);
  assert.deepEqual(result.missing.durableConversation,
    PRIVATE_GROVE_TALK_KEY_GROUPS.durableConversation);
  assert.equal(result.missingCount,7);
  assert.equal(result.readyForDeployment,false);
  assert.equal(result.requiresSeparateApproval,true);
  assert.ok(!JSON.stringify(result).includes("NOT_READ"));
});
test("even all production names never count as host or model acceptance", () => {
  const names=Object.values(PRIVATE_GROVE_TALK_KEY_GROUPS).flat();
  const result=inspectPrivateGroveTalkKeyMetadata(names.map(key=>({key,target:["production"]})));
  assert.equal(result.missingCount,0);
  assert.equal(result.status,"HOLD_RUNTIME_NOT_VERIFIED");
  assert.equal(result.readyForDeployment,false);
  assert.ok(result.unverified.includes("receiver_running"));
  assert.ok(result.unverified.includes("cost_ceiling"));
});
test("preview-only configuration cannot masquerade as production readiness", () => {
  const names=Object.values(PRIVATE_GROVE_TALK_KEY_GROUPS).flat();
  const metadata=names.map(key=>({key,target:["preview"]}));
  metadata.push({key:"GROVE_API_ENABLED",target:["production"]});
  const result=inspectPrivateGroveTalkKeyMetadata(metadata);
  assert.equal(result.missing.privateRealm.includes("GROVE_API_ENABLED"),false);
  assert.equal(result.missing.independentModel.length,3);
  assert.equal(result.readyForDeployment,false);
});
test("malformed metadata fails closed without reading credential values", () => {
  for (const input of [null,{},[{key:"ARBOR_LM_PRIVATE_URL",target:[],value:"secret"},
    {key:"bad key",target:["production"]}],new Array(501).fill({key:"X"})]) {
    assert.throws(()=>inspectPrivateGroveTalkKeyMetadata(input),/grove_host_key_metadata_invalid/);
  }
});


const restoreScope = (last="00000000-0000-4000-8000-000000000005") => ({
  groveUserId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000003",
  conversationId: last,
});
const restoreFixture = (overrides={}) => ({
  externalDeletions:[restoreScope()],
  restoredTombstones:[restoreScope()],
  restoredTurns:[],
  restoredClaims:[],
  ...overrides,
});
test("no independent deletion ledger always blocks a full restore", () => {
  const result=inspectGroveRestoreDeletionCoverage(restoreFixture({
    externalDeletions:[],
  }));
  assert.equal(result.status,"HOLD_MISSING_EXTERNAL_DELETION_EVIDENCE");
  assert.equal(result.readyForRestore,false);
  assert.equal(result.mayServePrivateContent,false);
  assert.equal(result.externalLedgerVerified,false);
});
test("a backup missing a later deletion marker is unsafe even with no rows", () => {
  const result=inspectGroveRestoreDeletionCoverage(restoreFixture({
    restoredTombstones:[],
  }));
  assert.equal(result.status,"HOLD_DELETED_CONVERSATION_REAPPEARANCE");
  assert.equal(result.missingTombstoneCount,1);
  assert.equal(result.readyForRestore,false);
});
test("an old saved turn and an in-flight claim after deletion block restore", () => {
  const result=inspectGroveRestoreDeletionCoverage(restoreFixture({
    restoredTurns:[restoreScope()],
    restoredClaims:[restoreScope()],
  }));
  assert.equal(result.resurrectedTurnScopeCount,1);
  assert.equal(result.resurrectedClaimScopeCount,1);
  assert.equal(result.metadataCoverageConsistent,false);
  assert.equal(result.mayServePrivateContent,false);
});
test("consistent synthetic deletion metadata STILL cannot approve an actual restore", () => {
  const result=inspectGroveRestoreDeletionCoverage(restoreFixture({
    restoredTurns:[restoreScope("00000000-0000-4000-8000-000000000009")],
  }));
  assert.equal(result.metadataCoverageConsistent,true);
  assert.equal(result.status,"HOLD_INDEPENDENT_ATTESTATION_AND_RESTORE_POLICY");
  assert.equal(result.externalLedgerVerified,false);
  assert.equal(result.readyForRestore,false);
  assert.equal(result.requiresSeparateOwnerApproval,true);
});
test("foreign owner/project, malformed, duplicate and content-bearing metadata cannot bypass gate", () => {
  for (const supplied of [
    null,{},restoreFixture({restoredTombstones:[{...restoreScope(), userText:"private"}]}),
    restoreFixture({externalDeletions:[restoreScope(),restoreScope()]}),
    restoreFixture({restoredTurns:[{groveUserId:"foreign",projectId:restoreScope().projectId,
      conversationId:restoreScope().conversationId}]}),
    restoreFixture({restoredClaims:new Array(501).fill(restoreScope())}),
  ]) {
    assert.throws(()=>inspectGroveRestoreDeletionCoverage(supplied),
      /grove_restore_evidence_(invalid|duplicate_external)/);
  }
  const differentOwner=inspectGroveRestoreDeletionCoverage(restoreFixture({
    restoredTombstones:[{...restoreScope(),
      groveUserId:"00000000-0000-4000-8000-000000000002"}],
  }));
  assert.equal(differentOwner.missingTombstoneCount,1);
  assert.equal(differentOwner.readyForRestore,false);
});
