"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const utilSource = fs.readFileSync(path.join(root, "src/core/util.js"), "utf8");
const modelSource = fs.readFileSync(path.join(root, "src/core/model.js"), "utf8");
const metricsSource = fs.readFileSync(path.join(root, "src/core/metrics.js"), "utf8");
const storeSource = fs.readFileSync(path.join(root, "src/core/store.js"), "utf8");
const quotesSource = fs.readFileSync(path.join(root, "src/modules/finance_quotes.js"), "utf8");
const projectsSource = fs.readFileSync(path.join(root, "src/modules/projects.js"), "utf8");

function makeApp(initial) {
  const collections = Object.assign({
    clients: [], contracts: [], expenses: [], invoices: [], leads: [], projects: [], quotes: [], tasks: []
  }, initial || {});
  let generated = 0;
  const store = {
    backend: "local",
    readOnly: false,
    all: (name) => collections[name] || [],
    get: (name, id) => (collections[name] || []).find((item) => item.id === id) || null,
    put: (name, item) => {
      const row = Object.assign({}, item, { id: item.id || "synthetic-" + (++generated) });
      const rows = collections[name] || (collections[name] = []);
      const index = rows.findIndex((existing) => existing.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return row;
    },
    patch: (name, id, partial) => {
      const row = (collections[name] || []).find((item) => item.id === id);
      return row ? Object.assign(row, partial) : null;
    },
    flush: () => true,
    config: () => null
  };
  const actions = {}, values = {}, state = { modal: null, opened: [], navigated: [], toasts: [], confirm: null };
  const ui = {
    modal: (options) => { state.modal = options; },
    btn: () => "<button></button>",
    field: () => "<input>",
    pill: () => "",
    empty: () => "",
    kpis: () => "",
    invPill: () => "",
    confirm: (...args) => { state.confirm = args; },
    toast: (message) => state.toasts.push(message),
    closeModal: () => { state.modal = null; },
    go: (view, params) => state.navigated.push({ view, params }),
    p: () => ({})
  };
  const window = { GK: { store }, navigator: { locks: { request: (_name, callback) => Promise.resolve().then(callback) } } };
  const context = { window, console, Date, Math, Promise, JSON, Object, String, Number, RegExp, setTimeout, clearTimeout };
  vm.runInNewContext(utilSource, context);
  const GK = window.GK;
  GK.i18n = { lang: () => "en", add: () => {} };
  GK.t = (key) => key;
  GK.me = () => ({ id: "owner", role: "founder" });
  GK.ui = ui;
  GK.act = (name, handler) => { actions[name] = handler; };
  GK.change = () => {};
  GK.view = () => {};
  GK.tk = { css: () => {} };
  GK.u.val = (id) => values[id] || "";
  GK.u.checked = () => false;
  GK.u.focus = () => {};
  vm.runInNewContext(modelSource, context);
  vm.runInNewContext(metricsSource, context);
  GK.fin = {
    tabs: {},
    u: {
      r3: (value) => Math.round((+value || 0) * 1000) / 1000,
      fm: (value) => String(value),
      fmP: (value) => String(value),
      canW: () => true,
      invoices: () => store.all("invoices"),
      invPill: () => ""
    }
  };
  vm.runInNewContext(quotesSource, context);
  vm.runInNewContext(projectsSource, context);
  return { GK, actions, collections, state, store, values };
}

function quote(overrides) {
  return Object.assign({
    id: "quote-1", no: "Q-2026-001", clientId: "client-1", pack: "test", title: "Test campaign",
    amount: 1000, status: "sent", acceptedOn: "", projectId: "", invoiceIds: []
  }, overrides || {});
}

test("new-project acceptance stays pending until save, then links project and quote invoices", () => {
  const app = makeApp({ clients: [{ id: "client-1", brand: "Synthetic" }], quotes: [quote()] });
  app.actions["fi-q-accept"]({ dataset: { id: "quote-1" } });
  assert.equal(app.collections.quotes[0].status, "sent");
  assert.ok(app.state.modal);
  app.values["fi-q-a-proj"] = "__new";
  app.actions["fi-q-accept-go"]({ dataset: { id: "quote-1" } });
  assert.equal(app.collections.quotes[0].status, "sent");
  assert.equal(app.collections.quotes[0].projectId, "");

  app.values["pj-n-client"] = "client-1";
  app.values["pj-n-pack"] = "test";
  app.values["pj-n-name"] = "Synthetic campaign";
  app.actions["pj-new-save"]();

  const project = app.collections.projects[0];
  const savedQuote = app.store.get("quotes", "quote-1");
  assert.equal(project.sourceQuoteId, "quote-1");
  assert.equal(savedQuote.status, "accepted");
  assert.equal(savedQuote.projectId, project.id);
  assert.equal(savedQuote.invoiceIds.length, 2);
  assert.ok(savedQuote.invoiceIds.every((id) => app.store.get("invoices", id).projectId === project.id));
  assert.ok(app.collections.invoices.every((invoice) => invoice.sourceQuoteId === "quote-1"));
  app.values["fi-q-a-proj"] = "__new";
  app.actions["fi-q-accept-go"]({ dataset: { id: "quote-1" } });
  assert.equal(app.collections.projects.length, 1);
  assert.equal(app.collections.invoices.length, 2);
});

test("opening and cancelling acceptance leaves the quote unchanged", () => {
  const app = makeApp({ quotes: [quote()] });
  app.actions["fi-q-accept"]({ dataset: { id: "quote-1" } });
  assert.ok(app.state.modal);
  assert.equal(app.store.get("quotes", "quote-1").status, "sent");
  assert.equal(app.store.get("quotes", "quote-1").acceptedOn, "");
  assert.equal(app.collections.invoices.length, 0);
});

test("accepting into an existing project excludes unrelated project invoices", () => {
  const app = makeApp({
    clients: [{ id: "client-1", brand: "Synthetic" }],
    projects: [{ id: "project-1", clientId: "client-1", name: "Existing" }],
    invoices: [{ id: "unrelated", clientId: "client-1", projectId: "project-1", kind: "deposit", amount: 999 }],
    quotes: [quote()]
  });
  app.values["fi-q-a-proj"] = "project-1";
  app.actions["fi-q-accept-go"]({ dataset: { id: "quote-1" } });
  const savedQuote = app.store.get("quotes", "quote-1");
  assert.equal(savedQuote.projectId, "project-1");
  assert.equal(savedQuote.invoiceIds.length, 2);
  assert.ok(!savedQuote.invoiceIds.includes("unrelated"));
  assert.equal(app.store.get("invoices", "unrelated").sourceQuoteId, undefined);
});

test("retries reuse quote-specific invoice drafts and attach drafts made before a project", () => {
  const app = makeApp({ quotes: [quote()] });
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", ""), true);
  const draftIds = app.store.get("quotes", "quote-1").invoiceIds.slice();
  assert.equal(app.collections.invoices.length, 2);
  const project = app.store.put("projects", { id: "project-1", clientId: "client-1", sourceQuoteId: "quote-1" });
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", project.id), true);
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", project.id), true);
  assert.deepEqual(app.store.get("quotes", "quote-1").invoiceIds, draftIds);
  assert.equal(app.collections.invoices.length, 2);
  assert.ok(app.collections.invoices.every((invoice) => invoice.projectId === project.id));
});

test("legacy quote without relationship fields can complete and recover after partial draft failure", () => {
  const app = makeApp({ quotes: [quote({ invoiceIds: undefined, projectId: undefined })] });
  let failOnce = true;
  const originalPut = app.store.put;
  app.store.put = (collection, item) => {
    if (collection === "invoices" && item.kind === "balance" && failOnce) {
      failOnce = false;
      return null;
    }
    return originalPut(collection, item);
  };
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", ""), false);
  assert.equal(app.store.get("quotes", "quote-1").status, "sent");
  assert.equal(app.collections.invoices.length, 1);
  app.store.put = originalPut;
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", ""), true);
  assert.equal(app.store.get("quotes", "quote-1").invoiceIds.length, 2);
  assert.equal(app.collections.invoices.length, 2);
});

test("storage failure never leaves the quote accepted and can be retried", () => {
  const app = makeApp({ quotes: [quote()] });
  app.store.flush = () => false;
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", ""), false);
  assert.equal(app.store.get("quotes", "quote-1").status, "sent");
  app.store.flush = () => true;
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", ""), true);
  assert.equal(app.store.get("quotes", "quote-1").status, "accepted");
  assert.equal(app.collections.invoices.length, 2);
});

test("failed ID collision does not overwrite an unrelated invoice", () => {
  const app = makeApp({
    invoices: [{ id: "qinv-quote-1-deposit", sourceQuoteId: "another-quote", clientId: "client-2", kind: "deposit", amount: 12 }],
    quotes: [quote()]
  });
  const before = Object.assign({}, app.collections.invoices[0]);
  assert.equal(app.GK.finQuotes.completeHandoff("quote-1", ""), false);
  assert.deepEqual(app.collections.invoices[0], before);
  assert.equal(app.store.get("quotes", "quote-1").status, "sent");
});

test("two isolated local stores reserve distinct quote numbers while holding the same tab lock", async () => {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
  let lockQueue = Promise.resolve();
  function storeContext() {
    const window = { addEventListener: () => {}, requestAnimationFrame: (fn) => fn() };
    const GK = { u: { lsGet: (key, fallback) => {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      try { return JSON.parse(raw); } catch (_) { return fallback; }
    } } };
    window.GK = GK;
    const context = {
      window, localStorage, document: { addEventListener: () => {} }, console, Date, Math, JSON, Object, String,
      Number, RegExp, Promise, setTimeout, clearTimeout
    };
    vm.runInNewContext(storeSource, context);
    return GK.store;
  }
  const first = storeContext(), second = storeContext();
  function allocate(store) {
    const locked = lockQueue.then(() => store.reserveQuoteNo("2026"));
    lockQueue = locked.then(() => undefined);
    return locked;
  }
  const numbers = await Promise.all([allocate(first), allocate(second)]);
  assert.deepEqual(numbers.sort(), ["Q-2026-001", "Q-2026-002"]);
});
