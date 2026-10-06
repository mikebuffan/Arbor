import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPrivateGroveOrigin, verifyPrivateGroveHost,
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
