"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/core/supabase.js"), "utf8");

function makeClient(config, fetchImpl) {
  const values = new Map();
  const context = {
    window: { GK_BACKEND_CONFIG: config, GK: {} },
    sessionStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key)
    },
    fetch: fetchImpl,
    Promise,
    Date,
    JSON,
    Error,
    Math,
    String,
    Object,
    encodeURIComponent
  };
  vm.runInNewContext(source, context);
  return { client: context.window.GK.supabase, values };
}

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) };
}

test("public client-share RPC uses only the anon key", async () => {
  const calls = [];
  const { client } = makeClient({ url: "http://127.0.0.1:54321", anonKey: "local-anon" }, (url, options) => {
    calls.push({ url, options });
    return Promise.resolve(response({ snapshot: { brand: { name: "Synthetic" } } }));
  });
  await client.rpc("get_public_client_share", { p_token: "a".repeat(64) }, true);
  assert.equal(calls[0].options.headers.Authorization, "Bearer " + "local-anon");
  assert.equal(calls[0].url.endsWith("/rest/v1/rpc/get_public_client_share"), true);
});

test("authenticated workspace RPC uses the signed-in access token", async () => {
  const calls = [];
  const { client } = makeClient({ url: "http://127.0.0.1:54321", anonKey: "local-anon" }, (url, options) => {
    calls.push({ url, options });
    return Promise.resolve(response({ access_token: "user-access", refresh_token: "refresh", expires_in: 3600, user: { id: "u1" } }));
  });
  await client.signIn("user@local.test", "synthetic-password");
  await client.rpc("get_my_workspaces", {});
  const rpc = calls.find((call) => call.url.includes("/rest/v1/rpc/"));
  assert.equal(rpc.options.headers.Authorization, "Bearer " + "user-access");
});

test("expired sessions refresh before private RPC requests", async () => {
  const calls = [];
  const { client, values } = makeClient({ url: "http://127.0.0.1:54321", anonKey: "local-anon" }, (url, options) => {
    calls.push({ url, options });
    if (url.includes("/auth/v1/token")) {
      return Promise.resolve(response({ access_token: "fresh-access", refresh_token: "fresh-refresh", expires_in: 3600, user: { id: "u1" } }));
    }
    return Promise.resolve(response([]));
  });
  await client.signIn("user@local.test", "synthetic-password");
  const session = JSON.parse(values.get("gecko-ops-supabase-session"));
  session.expires_at = Math.floor(Date.now() / 1000) - 1;
  values.set("gecko-ops-supabase-session", JSON.stringify(session));
  await client.rpc("get_my_workspaces", {});
  const rpc = calls.find((call) => call.url.includes("/rest/v1/rpc/"));
  assert.equal(rpc.options.headers.Authorization, "Bearer " + "fresh-access");
});

test("missing backend configuration fails explicitly", async () => {
  const { client } = makeClient({}, () => { throw new Error("fetch should not run"); });
  await assert.rejects(client.rpc("get_my_workspaces", {}), /Supabase is not configured/);
});

test("failed remote logout still clears the local session", async () => {
  const { client, values } = makeClient(
    { url: "http://127.0.0.1:54321", anonKey: "local-anon" },
    (url) => Promise.resolve(url.includes("/auth/v1/logout")
      ? response({ message: "offline" }, 503)
      : response({ access_token: "user-access", refresh_token: "refresh", expires_in: 3600, user: { id: "u1" } }))
  );
  await client.signIn("user@local.test", "synthetic-password");
  await assert.rejects(client.signOut(), /offline/);
  assert.equal(values.has("gecko-ops-supabase-session"), false);
});
