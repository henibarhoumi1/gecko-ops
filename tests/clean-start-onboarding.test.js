"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

function makeStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    raw: (key) => values.get(key)
  };
}

function makeStore(storage) {
  const window = { GK: {}, addEventListener: () => {} };
  const context = {
    window,
    document: { addEventListener: () => {}, visibilityState: "visible" },
    localStorage: storage,
    console, Date, Math, Promise, JSON, Object, String, Number, RegExp,
    setTimeout: () => 0, clearTimeout: () => {}
  };
  vm.runInNewContext(source("src/core/util.js"), context);
  window.GK.t = (key) => key;
  window.GK.m = { defaultConfig: () => ({ version: 2, company: { name: "Synthetic Workspace" }, rules: { openingCash: 0 } }) };
  vm.runInNewContext(source("src/core/store.js"), context);
  return { store: window.GK.store, context, window };
}

function makeGuide(options) {
  const storage = options.storage || makeStorage();
  const text = {};
  const actions = {}, views = {};
  let modal = null;
  const ui = {
    state: { view: "today" },
    modal: (value) => { modal = value; },
    modalOpen: () => !!modal,
    closeModal: () => { modal = null; },
    go: (view) => { ui.state.view = view; },
    head: () => "",
    btn: (label, action, config) => '<button data-a="' + action + '"' + (config && config.data ? ' data-i="' + config.data.i + '" data-v="' + config.data.v + '"' : "") + ">" + label + "</button>",
    toast: () => {},
    nav: () => options.nav || ["today", "pipeline", "clients", "projects", "studio", "calendar", "finance", "dashboard", "marketing", "team"],
    icon: () => ""
  };
  const GK = {
    u: null,
    ui,
    store: { ready: true, backend: "local", localRecordCount: () => options.count || 0 },
    i18n: { add: (words) => Object.assign(text, words), lang: () => "en" },
    t: (key, vars) => {
      let out = text[key] ? text[key][0] : key;
      Object.keys(vars || {}).forEach((name) => { out = out.replace("{" + name + "}", vars[name]); });
      return out;
    },
    view: (name, view) => { views[name] = view; },
    act: (name, fn) => { actions[name] = fn; }
  };
  const window = { GK, addEventListener: () => {} };
  const nodes = {};
  const fakeEl = () => ({ style: {}, offsetHeight: 180, offsetWidth: 340, innerHTML: "", getAttribute: () => null, classList: { add() {}, remove() {}, toggle() {} } });
  const document = {
    addEventListener: () => {},
    getElementById: (id) => nodes[id] || null,
    querySelectorAll: () => [],
    head: { appendChild: () => {} },
    body: { appendChild: (el) => { el.firstChild = fakeEl(); el.lastChild = fakeEl(); el.parentNode = { removeChild: () => { delete nodes[el.id]; } }; nodes[el.id] = el; } },
    createElement: () => fakeEl()
  };
  const context = {
    window, document, localStorage: storage, innerWidth: 1280, innerHeight: 800, setInterval: () => 1, clearInterval: () => {}, console, Date, Math, Promise, JSON, Object, String, Number, RegExp,
    setTimeout: () => 0, clearTimeout: () => {}
  };
  vm.runInNewContext(source("src/core/util.js"), context);
  GK.u = window.GK.u;
  vm.runInNewContext(source("src/modules/guide.js"), context);
  return { GK, ui, actions, views, storage, document, get modal() { return modal; } };
}

test("fresh local workspaces initialize empty without loading sample generators", () => {
  const storage = makeStorage();
  const { store } = makeStore(storage);
  let booted = false;
  store.boot(() => { booted = true; });
  store.flush();
  assert.equal(booted, true);
  assert.deepEqual(Array.from(store.COLLS), ["team", "clients", "leads", "outreach", "contracts", "projects", "invoices", "tasks", "msgs", "ideas", "boards", "shares", "feedback", "expenses", "quotes"]);
  store.COLLS.forEach((collection) => assert.equal(store.all(collection).length, 0, collection + " should start empty"));
  const saved = JSON.parse(storage.raw("gecko-ops-v01-demo"));
  assert.ok(saved.config);
  assert.ok(fs.readFileSync(path.join(root, "src/order.txt"), "utf8").split(/\r?\n/).every((line) => !/seed\.js|\.v2seed/.test(line)));
});

test("local cleanup clears business records but preserves configuration and browser preferences", () => {
  const config = { version: 2, company: { name: "Synthetic Studio" }, rates: { reel: 155 }, goals: { monthlyRevenue: 0 } };
  const snapshot = { config, colls: {} };
  const collections = ["team", "clients", "leads", "outreach", "contracts", "projects", "invoices", "tasks", "msgs", "ideas", "boards", "shares", "feedback", "expenses", "quotes"];
  collections.forEach((name) => { snapshot.colls[name] = [{ id: "synthetic-" + name }]; });
  const storage = makeStorage({
    "gecko-ops-v01-demo": JSON.stringify(snapshot),
    "gecko-ops-v01-mode": JSON.stringify("demo"),
    "gecko-ops-v01-as": JSON.stringify("my-member"),
    "gecko-ops-v01-invoice-sequence-2026": "17",
    "gecko-ops-theme": JSON.stringify("light"),
    "gecko-ops-lang": JSON.stringify("fr"),
    "gecko-ops-onboarding-v1": JSON.stringify({ version: 1, status: "complete", step: 9 })
  });
  const { store } = makeStore(storage);
  store.boot(() => {});
  const result = store.clearLocalRecords();
  assert.equal(result.count, collections.length);
  assert.deepEqual(Array.from(result.collections), collections);
  collections.forEach((name) => assert.equal(store.all(name).length, 0, name + " should be cleared"));
  assert.equal(JSON.stringify(store.config()), JSON.stringify(config));
  const saved = JSON.parse(storage.raw("gecko-ops-v01-demo"));
  assert.equal(JSON.stringify(saved.config), JSON.stringify(config));
  collections.forEach((name) => assert.deepEqual(saved.colls[name], []));
  assert.equal(storage.raw("gecko-ops-v01-invoice-sequence-2026"), "17");
  assert.equal(storage.raw("gecko-ops-theme"), JSON.stringify("light"));
  assert.equal(storage.raw("gecko-ops-lang"), JSON.stringify("fr"));
  assert.equal(storage.raw("gecko-ops-onboarding-v1"), JSON.stringify({ version: 1, status: "complete", step: 9 }));
  assert.equal(store.clearLocalRecords().count, 0);
});

test("failed local cleanup restores the in-memory workspace", () => {
  const snapshot = { config: { version: 2 }, colls: { clients: [{ id: "kept" }] } };
  const storage = makeStorage({ "gecko-ops-v01-demo": JSON.stringify(snapshot) });
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === "gecko-ops-v01-demo" && JSON.parse(value).colls.clients.length === 0) throw new Error("quota");
    setItem(key, value);
  };
  const { store } = makeStore(storage);
  store.boot(() => {});
  assert.equal(store.clearLocalRecords(), null);
  assert.equal(store.get("clients", "kept").id, "kept");
});

test("first-time welcome reflects whether saved workspace records exist", () => {
  const empty = makeGuide({ count: 0 });
  empty.GK.guide.maybeWelcome();
  assert.equal(empty.modal.title, "Welcome to GECKO Ops");
  assert.match(empty.modal.body, /This workspace is empty/);
  assert.doesNotMatch(empty.modal.body, /sample/);

  const oldRecords = makeGuide({ count: 3 });
  oldRecords.GK.guide.maybeWelcome();
  assert.match(oldRecords.modal.body, /still has 3 saved records/);
  assert.match(oldRecords.modal.foot, /guide-welcome-clean/);
});

test("interactive tour follows the real screens, moves backward, skips, exits and can restart", () => {
  const app = makeGuide({ count: 0 });
  app.actions["guide-start"]();
  assert.equal(app.ui.state.view, "today");
  const tour = () => app.document.getElementById("tour");
  assert.match(tour().lastChild.innerHTML, /Step 1 of 13/);
  app.actions["tour-next"](); app.actions["tour-next"](); app.actions["tour-next"]();
  assert.match(tour().lastChild.innerHTML, /Click Leads|nav_pipeline/);
  app.ui.state.view = "pipeline"; app.GK.guide.place();
  assert.match(tour().lastChild.innerHTML, /convert it into a client/);
  app.actions["tour-back"]();
  assert.match(tour().lastChild.innerHTML, /Step 3 of 13/);
  app.actions["guide-skip"]();
  assert.equal(JSON.parse(app.storage.raw("gecko-ops-onboarding-v1")).status, "skipped");
  app.actions["guide-restart"]();
  assert.match(tour().lastChild.innerHTML, /Step 1 of 13/);
  app.actions["tour-exit"]();
  assert.equal(JSON.parse(app.storage.raw("gecko-ops-onboarding-v1")).status, "dismissed");
});

test("tour leaves out areas the viewer cannot open", () => {
  const app = makeGuide({ count: 0, nav: ["today", "tasks", "calendar", "projects", "studio"] });
  app.actions["guide-start"]();
  assert.match(app.document.getElementById("tour").lastChild.innerHTML, /Step 1 of 7/);
});

test("tour steps and contextual help only target registered application areas", () => {
  const app = makeGuide({ count: 0 });
  const targets = ["today", "pipeline", "projects", "studio", "production", "boards", "deliveries", "finance", "reports"];
  app.GK.guide.steps.forEach((step) => assert.ok(targets.includes(step.view), step.view));
  targets.forEach((view) => assert.equal(app.GK.guide.hasHelp(view), true, view));
  assert.equal(app.GK.guide.hasHelp("missing"), false);
  app.actions["guide-help"]({ dataset: { v: "finance" } });
  assert.equal(app.modal.label, "nav_finance");
  assert.match(app.modal.body, /quotes, invoices, recorded payments and expenses/);
  assert.match(app.modal.foot, /guide-help-start/);
});
