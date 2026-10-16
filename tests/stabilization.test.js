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
const financeSource = fs.readFileSync(path.join(root, "src/modules/finance.js"), "utf8");
const financeExpensesSource = fs.readFileSync(path.join(root, "src/modules/finance_expenses.js"), "utf8");
const pipelineSource = fs.readFileSync(path.join(root, "src/modules/pipeline.js"), "utf8");
const projectsSource = fs.readFileSync(path.join(root, "src/modules/projects.js"), "utf8");

function makeApp(initial) {
  const collections = Object.assign({
    clients: [], contracts: [], expenses: [], invoices: [], leads: [], projects: []
  }, initial || {});
  const store = {
    backend: "local",
    readOnly: false,
    all: (name) => collections[name] || [],
    get: (name, id) => (collections[name] || []).find((item) => item.id === id) || null,
    put: (name, item) => {
      const row = Object.assign({ id: "synthetic-" + (collections[name] || []).length }, item);
      (collections[name] || (collections[name] = [])).push(row);
      return row;
    },
    patch: (name, id, partial) => {
      const row = (collections[name] || []).find((item) => item.id === id);
      return row ? Object.assign(row, partial) : null;
    },
    config: () => null
  };
  const window = { GK: { store } };
  const context = { window, console, Date, Math, Promise, JSON, Object, String, Number, RegExp };
  vm.runInNewContext(utilSource, context);
  const GK = window.GK;
  GK.i18n = { lang: () => "en", add: () => {} };
  GK.t = (key) => key;
  GK.me = () => null;
  vm.runInNewContext(modelSource, context);
  vm.runInNewContext(metricsSource, context);
  return { GK, store, collections, context };
}

function makeStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function loadFinance(app, actions) {
  app.GK.ui = app.GK.ui || {};
  app.GK.view = () => {};
  app.GK.act = (name, handler) => { if (actions) actions[name] = handler; };
  app.GK.change = () => {};
  vm.runInNewContext(financeSource, app.context);
  return app.GK.fin;
}

function loadFinanceExpenses(app, values) {
  const actions = {}, changes = {}, state = { modal: null, toasts: [] };
  app.GK.ui = {
    modal: (options) => { state.modal = options; },
    field: (options) => { state.fields = state.fields || {}; state.fields[options.id] = options; return "<input>"; },
    btn: () => "<button></button>",
    toast: (message) => state.toasts.push(message),
    closeModal: () => { state.modal = null; }
  };
  app.GK.act = (name, handler) => { actions[name] = handler; };
  app.GK.change = (name, handler) => { changes[name] = handler; };
  app.GK.u.val = (id) => values && Object.prototype.hasOwnProperty.call(values, id) ? values[id] : "";
  app.GK.u.numVal = (id) => +(values && values[id]) || 0;
  app.GK.u.focus = () => {};
  vm.runInNewContext(financeExpensesSource, app.context);
  return { actions, changes, state };
}

function loadPipeline(app, values) {
  const actions = {}, changes = {}, state = { opened: [], navigated: [], modal: null, confirm: null, toasts: [] };
  app.GK.u.val = (id) => values && Object.prototype.hasOwnProperty.call(values, id) ? values[id] : "";
  app.GK.ui = {
    modal: (options) => { state.modal = options; },
    btn: () => "<button></button>",
    field: () => "<select></select>",
    confirm: (...args) => { state.confirm = args; },
    toast: (message) => state.toasts.push(message),
    closeModal: () => {},
    render: () => {},
    go: (view, params) => state.navigated.push({ view, params })
  };
  app.GK.view = () => {};
  app.GK.act = (name, handler) => { actions[name] = handler; };
  app.GK.change = (name, handler) => { changes[name] = handler; };
  app.GK.insight = { pipeline: () => "" };
  app.GK.pj = { openNew: (options) => state.opened.push(options) };
  vm.runInNewContext(pipelineSource, app.context);
  return { actions, changes, state };
}

function loadProjects(app, values) {
  const actions = {}, state = { navigated: [], toasts: [] };
  app.GK.ui = {
    modal: () => {},
    btn: () => "<button></button>",
    field: () => "<input>",
    toast: (message) => state.toasts.push(message),
    closeModal: () => {},
    go: (view, params) => state.navigated.push({ view, params })
  };
  app.GK.tk = { css: () => {} };
  app.GK.view = () => {};
  app.GK.act = (name, handler) => { actions[name] = handler; };
  app.GK.change = () => {};
  app.GK.u.val = (id) => values[id] || "";
  app.GK.u.checked = () => false;
  app.GK.u.focus = () => {};
  vm.runInNewContext(projectsSource, app.context);
  return { actions, state };
}

test("credited invoices reduce revenue while recorded cash remains", () => {
  const today = new Date().toISOString().slice(0, 10);
  const app = makeApp({
    invoices: [
      { id: "original", no: "GK-" + today.slice(0, 4) + "-001", clientId: "c1", projectId: "p1", kind: "month", amount: 1000, issued: today, payments: [{ net: 900, withheld: 100 }], credited: true },
      { id: "credit", no: "GK-" + today.slice(0, 4) + "-002", clientId: "c1", projectId: "p1", kind: "credit", amount: -1000, issued: today, payments: [], credited: false }
    ]
  });
  const { GK } = app;
  const project = { id: "p1", clientId: "c1" };
  const invoices = GK.store.all("invoices");
  assert.equal(invoices.reduce((total, invoice) => total + GK.m.invoiceTurnover(invoice), 0), 0);
  assert.equal(GK.m.received(project), 0);
  assert.equal(GK.m.cashIn(project), 900);
});

test("finance and shared monthly metrics use the same TND revenue and cash basis", () => {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const app = makeApp({
    invoices: [{
      id: "eur", no: "GK-" + today.slice(0, 4) + "-001", clientId: "c1", kind: "deposit",
      amount: 100, currency: "EUR", issued: today, payments: [{ date: today, net: 50, withheld: 5 }]
    }]
  });
  const figures = loadFinance(app).u.monthFigures(month);
  const row = app.GK.x.monthly(1, month)[0];
  assert.equal(figures.invoiced, 340);
  assert.equal(figures.net, 170);
  assert.equal(figures.wh, 17);
  assert.equal(row.invoiced, figures.invoiced);
  assert.equal(row.cashIn, figures.net);
  assert.equal(row.withheld, figures.wh);
  assert.equal(app.GK.x.clientCash(today).c1, 187);
});

test("project-linked expenses flow into monthly costs, profit, and commission once", () => {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const app = makeApp({
    clients: [{ id: "c1", brand: "Synthetic", wonOn: "2024-01-01" }],
    expenses: [
      { id: "one-off", date: today, projectId: "p1", amount: 40, recurring: "none", label: "Travel" },
      { id: "monthly", date: month + "-01", projectId: "p1", amount: 20, recurring: "monthly", label: "Studio" }
    ],
    invoices: [
      { id: "deposit", no: "GK-2026-001", clientId: "c1", projectId: "p1", kind: "deposit", amount: 500, issued: today, stamp: 0, payments: [{ net: 500 }], credited: false },
      { id: "balance", no: "GK-2026-002", clientId: "c1", projectId: "p1", kind: "balance", amount: 500, issued: today, stamp: 0, payments: [{ net: 500 }], credited: false }
    ],
    projects: [{
      id: "p1", clientId: "c1", pack: "test", stage: "delivered", shootDate: today, created: today,
      costs: [{ id: "direct", amount: 100, kind: "gear" }], mohamed: true, payout: null
    }]
  });
  const { GK } = app;
  const project = GK.store.get("projects", "p1");
  const row = GK.x.monthly(1, month)[0];
  const close = loadFinance(app).u.monthFigures(month);
  assert.equal(GK.m.costOf(project), 160);
  assert.equal(GK.m.profit(project), 840);
  assert.equal(GK.m.commission(project).amount, 252);
  assert.equal(row.projectCosts, 60);
  assert.equal(row.expenses, 0);
  assert.equal(row.out, 60);
  assert.equal(close.costs, 60);
  assert.equal(close.overheads, 0);
  assert.equal(close.outTot, 60);
});

test("project estimates are replaced only by explicitly linked actual expenses", () => {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const app = makeApp({
    clients: [{ id: "c1", brand: "Synthetic", wonOn: "2024-01-01" }],
    projects: [{
      id: "p1", clientId: "c1", pack: "test", stage: "delivered", shootDate: today, price: 1000,
      costs: [{ id: "estimate-1", kind: "gear", label: "Camera rental estimate", amount: 100 }]
    }],
    invoices: [{
      id: "paid", clientId: "c1", projectId: "p1", kind: "month", amount: 1000, stamp: 0,
      no: "GK-" + today.slice(0, 4) + "-001", issued: today, payments: [{ date: today, net: 1000, withheld: 0 }], credited: false
    }],
    expenses: [{ id: "actual-1", projectId: "p1", estimateId: "estimate-1", date: today, amount: 70, recurring: "none", label: "Camera rental actual" }]
  });
  const { GK } = app;
  const project = GK.store.get("projects", "p1");
  assert.equal(GK.m.estimatedCostOf(project), 100);
  assert.equal(GK.m.actualCostOf(project), 70);
  assert.equal(GK.m.costOf(project), 70);
  assert.equal(GK.m.profit(project), 930);
  assert.equal(GK.m.commission(project).amount, Math.round(930 * GK.m.commission(project).pct / 100));
  const stats = GK.x.clientStats()[0];
  assert.equal(stats.costs, 70);
  assert.equal(stats.profit, 930);
  assert.equal(stats.margin, 93);
  const monthRow = GK.x.monthly(1, month)[0];
  const close = loadFinance(app).u.monthFigures(month);
  assert.equal(monthRow.projectCosts, 70);
  assert.equal(close.costs, 70);
});

test("equal amounts do not reconcile estimates, while multiple linked and unmatched actuals remain additive", () => {
  const today = new Date().toISOString().slice(0, 10);
  const app = makeApp({
    projects: [{
      id: "p1", clientId: "c1", pack: "test",
      costs: [
        { id: "estimate-1", kind: "gear", amount: 100 },
        { id: "estimate-2", kind: "other", amount: 25 }
      ]
    }],
    expenses: [
      { id: "matched-a", projectId: "p1", estimateId: "estimate-1", date: today, amount: 40, recurring: "none" },
      { id: "matched-b", projectId: "p1", estimateId: "estimate-1", date: today, amount: 70, recurring: "none" },
      { id: "same-amount-unmatched", projectId: "p1", date: today, amount: 25, recurring: "none" },
      { id: "unmatched", projectId: "p1", date: today, amount: 10, recurring: "none" }
    ]
  });
  const { GK } = app;
  const project = GK.store.get("projects", "p1");
  assert.equal(GK.m.estimatedCostOf(project), 125);
  assert.equal(GK.m.actualCostOf(project), 145);
  assert.equal(GK.m.costOf(project), 170);
});

test("expense form offers an explicit estimate link and persists only the selected project estimate", () => {
  const app = makeApp({
    projects: [{ id: "p1", clientId: "c1", name: "Synthetic project", pack: "test", costs: [{ id: "estimate-1", kind: "gear", label: "Camera", amount: 100 }] }],
    expenses: [{ id: "expense-1", projectId: "p1", date: "2026-10-01", amount: 100, recurring: "none", label: "Camera rental" }]
  });
  loadFinance(app);
  const { actions, state } = loadFinanceExpenses(app, {
    "fi-ex-f-label": "Camera rental",
    "fi-ex-f-amount": "70",
    "fi-ex-f-date": new Date().toISOString().slice(0, 10),
    "fi-ex-f-cat": "gear",
    "fi-ex-f-rec": "none",
    "fi-ex-f-until": "",
    "fi-ex-f-vendor": "",
    "fi-ex-f-project": "p1",
    "fi-ex-f-estimate": "estimate-1",
    "fi-ex-f-link": "",
    "fi-ex-f-note": ""
  });
  actions["fi-ex-edit"]({ dataset: { id: "expense-1" } });
  assert.ok(state.fields["fi-ex-f-estimate"].options.some((option) => option[0] === "estimate-1"));
  actions["fi-ex-save"]({ dataset: { id: "expense-1" } });
  assert.equal(app.collections.expenses[0].estimateId, "estimate-1");
  assert.equal(app.GK.m.costOf(app.store.get("projects", "p1")), 70);
});

test("project overhead remains separate and invoices distinguish turnover from collected cash", () => {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const app = makeApp({
    projects: [{ id: "p1", clientId: "c1", pack: "test", costs: [{ id: "budget", amount: 200 }] }],
    expenses: [
      { id: "direct", projectId: "p1", date: today, amount: 30, recurring: "none" },
      { id: "overhead", projectId: "", date: today, amount: 20, recurring: "none" }
    ],
    invoices: [
      { id: "partial", clientId: "c1", projectId: "p1", no: "GK-" + today.slice(0, 4) + "-001", kind: "deposit", amount: 100, stamp: 0, issued: today, payments: [{ date: today, net: 40, withheld: 5 }], credited: false },
      { id: "credit", clientId: "c1", projectId: "p1", no: "GK-" + today.slice(0, 4) + "-002", kind: "credit", amount: -10, issued: today, payments: [], credited: false }
    ]
  });
  const { GK } = app;
  const project = GK.store.get("projects", "p1");
  const close = loadFinance(app).u.monthFigures(month);
  const row = GK.x.monthly(1, month)[0];
  assert.equal(GK.m.invoiceTurnover(GK.store.get("invoices", "partial")) + GK.m.invoiceTurnover(GK.store.get("invoices", "credit")), 90);
  assert.equal(GK.m.received(project), 45);
  assert.equal(GK.m.cashIn(project), 40);
  assert.equal(GK.m.invBalance(GK.store.get("invoices", "partial")), 55);
  assert.equal(close.costs, 30);
  assert.equal(close.overheads, 20);
  assert.equal(row.projectCosts, 30);
  assert.equal(row.expenses, 20);
});

test("forecast replaces a linked budget line with its scheduled actual expense", () => {
  const future = new Date();
  future.setDate(future.getDate() + 10);
  const scheduled = future.toISOString().slice(0, 10);
  const { GK } = makeApp({
    projects: [{
      id: "p1", clientId: "c1", pack: "test", name: "Synthetic shoot", stage: "shoot",
      shootDate: scheduled, costs: [{ id: "estimate-1", label: "Editor", amount: 100 }]
    }],
    expenses: [{
      id: "actual-1", projectId: "p1", estimateId: "estimate-1", date: scheduled,
      amount: 70, recurring: "none", label: "Editor actual"
    }]
  });
  const rows = GK.x.forecast(13);
  const items = rows.flatMap((row) => row.items);
  assert.equal(items.filter((item) => item.t === "Editor actual").reduce((sum, item) => sum + item.v, 0), 70);
  assert.equal(items.some((item) => item.t.includes("Synthetic shoot")), false);
});

test("recurring project expenses clamp month-end dates and stop at their end month", () => {
  const app = makeApp({
    projects: [{ id: "p1", clientId: "c1", pack: "test", costs: [{ id: "estimate", amount: 500 }] }],
    expenses: [{ id: "monthly", date: "2026-01-31", until: "2026-02", projectId: "p1", amount: 10, recurring: "monthly" }]
  });
  const { GK } = app;
  const expense = GK.m.projectExpenses({ id: "p1" }, "2026-02");
  assert.equal(expense.length, 1);
  assert.equal(expense[0].date, "2026-02-28");
  assert.equal(GK.m.projectExpenses({ id: "p1" }, "2026-03").length, 0);
  assert.equal(GK.x.monthly(1, "2026-02")[0].projectCosts, 10);
  assert.equal(loadFinance(app).u.monthFigures("2026-02").costs, 10);
});

test("legacy project price inference keeps credited original invoice prices", () => {
  const { GK } = makeApp({
    invoices: [
      { id: "deposit", projectId: "p1", kind: "deposit", amount: 500, credited: true },
      { id: "balance", projectId: "p1", kind: "balance", amount: 500, credited: false }
    ]
  });
  assert.equal(GK.m.projectPrice({ id: "p1", pack: "test", clientId: "c1" }), 1000);
});

test("MRR prefers contract or saved legacy invoice prices over catalogue changes", () => {
  const today = new Date().toISOString().slice(0, 10);
  const { GK } = makeApp({
    contracts: [
      { id: "legacy", clientId: "c1", pack: "monthly8", status: "active" },
      { id: "snapshot", clientId: "c2", pack: "monthly8", monthlyPrice: 2200, status: "active" }
    ],
    projects: [{ id: "legacy-month", contractId: "legacy", month: 1, pack: "monthly8" }],
    invoices: [{ id: "legacy-invoice", projectId: "legacy-month", kind: "month", amount: 2400, no: "", issued: "", payments: [] }]
  });
  assert.equal(GK.m.contractPrice(GK.store.get("contracts", "legacy")), 2400);
  assert.equal(GK.x.mrr(), 4600);
});

test("pipeline values exclude won leads while reporting won estimates separately from invoice revenue", () => {
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const { GK } = makeApp({
    leads: [
      { id: "open", stage: "accepted", price: 1000, currency: "TND" },
      { id: "legacy-open", stage: "proposal", price: 500, currency: "TND" },
      { id: "won", stage: "won", price: 1200, currency: "TND" }
    ],
    invoices: [{ id: "issued", no: "GK-" + year + "-001", clientId: "c1", kind: "deposit", amount: 500, issued: today, currency: "TND" }]
  });
  assert.deepEqual(
    { total: GK.x.pipelineValue().total, weighted: GK.x.pipelineValue().weighted },
    { total: 1500, weighted: 1050 }
  );
  assert.equal(GK.m.isOpen(GK.store.get("leads", "legacy-open")), true);
  assert.equal(GK.x.wonOpportunityValue(), 1200);
  assert.equal(GK.x.confirmedRevenue(year), 500);
});

test("local invoice sequence advances past existing records and prior reservations", () => {
  const storage = makeStorage();
  storage.setItem("gecko-ops-v01-demo", JSON.stringify({
    colls: { invoices: [{ no: "GK-2026-007" }] }
  }));
  const window = { GK: {} , addEventListener: () => {} };
  const context = {
    window, document: { addEventListener: () => {}, visibilityState: "visible" },
    localStorage: storage, console, Date, Math, Promise, JSON, Object, String, Number, RegExp,
    setTimeout: () => 0, clearTimeout: () => {}
  };
  vm.runInNewContext(utilSource, context);
  window.GK.i18n = { lang: () => "en" };
  window.GK.t = (key) => key;
  window.GK.me = () => null;
  vm.runInNewContext(storeSource, context);
  assert.equal(window.GK.store.reserveInvoiceNo("2026"), "GK-2026-008");
  assert.equal(window.GK.store.reserveInvoiceNo("2026"), "GK-2026-009");
});

test("won leads require an explicit client choice rather than same-name auto-merging", () => {
  const { GK, collections, context } = makeApp({
    clients: [{ id: "existing", brand: "Synthetic Brand" }],
    leads: [{ id: "lead", brand: "Synthetic Brand", stage: "proposal_sent", history: [], owner: "", pack: "" }]
  });
  const actions = {}, changes = {};
  let modal, openedClient;
  GK.u.val = () => "existing";
  GK.ui = {
    modal: (options) => { modal = options; },
    btn: () => "<button></button>",
    field: () => "<select></select>",
    toast: () => {},
    closeModal: () => {},
    render: () => {},
    go: () => {}
  };
  GK.view = () => {};
  GK.act = (name, handler) => { actions[name] = handler; };
  GK.change = (name, handler) => { changes[name] = handler; };
  GK.insight = { pipeline: () => "" };
  GK.pj = { openNew: (options) => { openedClient = options.clientId; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "src/modules/pipeline.js"), "utf8"), context);

  changes["pl-move"]({ dataset: { id: "lead" }, value: "won" });
  assert.equal(collections.clients.length, 1);
  assert.ok(modal);
  actions["pl-convert-existing"]({ dataset: { id: "lead" } });
  assert.equal(collections.clients.length, 1);
  assert.equal(openedClient, "existing");
});

test("creating a same-name client after a won lead requires a separate confirmation", () => {
  const app = makeApp({
    clients: [{ id: "existing", brand: "Synthetic Brand" }],
    leads: [{ id: "lead", brand: "Synthetic Brand", stage: "proposal_sent", history: [], owner: "", pack: "" }]
  });
  const { GK, collections, context } = app;
  const actions = {}, changes = {};
  let confirmation, openedClient;
  GK.ui = {
    modal: () => {},
    btn: () => "<button></button>",
    field: () => "<select></select>",
    confirm: (...args) => { confirmation = args; },
    toast: () => {},
    closeModal: () => {},
    render: () => {},
    go: () => {}
  };
  GK.view = () => {};
  GK.act = (name, handler) => { actions[name] = handler; };
  GK.change = (name, handler) => { changes[name] = handler; };
  GK.insight = { pipeline: () => "" };
  GK.pj = { openNew: (options) => { openedClient = options.clientId; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "src/modules/pipeline.js"), "utf8"), context);

  changes["pl-move"]({ dataset: { id: "lead" }, value: "won" });
  actions["pl-convert-new"]({ dataset: { id: "lead" } });
  assert.equal(collections.clients.length, 1);
  assert.ok(confirmation);
  confirmation[2]();
  assert.equal(collections.clients.length, 2);
  assert.equal(openedClient, "synthetic-1");
});

test("requesting won opens conversion without changing the lead, and cancelling keeps its stage", () => {
  const app = makeApp({ leads: [{ id: "lead", brand: "Synthetic", stage: "proposal_sent", history: [], owner: "", pack: "test" }] });
  const { GK, collections } = app;
  const { actions, changes, state } = loadPipeline(app);
  changes["pl-move"]({ dataset: { id: "lead" }, value: "won" });
  assert.equal(collections.leads[0].stage, "proposal_sent");
  assert.equal(collections.clients.length, 0);
  assert.ok(state.modal);
  actions["pl-convert-cancel"]({});
  assert.equal(collections.leads[0].stage, "proposal_sent");
});

test("a new lead cannot be created directly in the won stage", () => {
  const app = makeApp();
  const { GK, collections } = app;
  const { actions } = loadPipeline(app, { "pl-brand": "Synthetic", "pl-stage": "won" });
  actions["pl-save"]({ dataset: { id: "" } });
  assert.equal(collections.leads.length, 0);
  assert.equal(collections.clients.length, 0);
});

test("successful conversion records signed state and durable relationships, not a win", () => {
  const app = makeApp({
    clients: [{ id: "existing", brand: "Unrelated same-name record" }],
    leads: [{ id: "lead", brand: "Synthetic", stage: "proposal_sent", history: [], owner: "", pack: "test" }]
  });
  const { GK, collections } = app;
  const { actions, changes, state } = loadPipeline(app, { "pl-convert-client": "existing" });
  changes["pl-move"]({ dataset: { id: "lead" }, value: "won" });
  actions["pl-convert-existing"]({ dataset: { id: "lead", fields: "{}" } });

  assert.equal(collections.leads[0].stage, "signed");
  assert.equal(collections.leads[0].clientId, "existing");
  assert.equal(collections.clients.length, 1);
  assert.equal(GK.x.wonOpportunityValue(), 0);
  assert.equal(GK.m.isOpen(collections.leads[0]), true);
  assert.equal(state.opened[0].sourceLeadId, "lead");
});

test("conversion recovery reuses a client created before the lead link failed", () => {
  const app = makeApp({ leads: [{ id: "lead", brand: "Synthetic", stage: "accepted", history: [], owner: "", pack: "test" }] });
  const { GK, store, collections } = app;
  const { actions, changes } = loadPipeline(app);
  const patch = store.patch;
  let failLeadPatch = true;
  store.patch = (collection, id, fields, opts) => {
    if (collection === "leads" && failLeadPatch) { failLeadPatch = false; return null; }
    return patch(collection, id, fields, opts);
  };

  changes["pl-move"]({ dataset: { id: "lead" }, value: "won" });
  actions["pl-convert-new"]({ dataset: { id: "lead", fields: "{}" } });
  assert.equal(collections.clients.length, 1);
  assert.equal(collections.clients[0].sourceLeadId, "lead");
  assert.equal(collections.leads[0].stage, "accepted");
  assert.equal(collections.leads[0].clientId, undefined);

  actions["pl-convert-new"]({ dataset: { id: "lead", fields: "{}" } });
  assert.equal(collections.clients.length, 1);
  assert.equal(collections.leads[0].stage, "signed");
  assert.equal(collections.leads[0].clientId, collections.clients[0].id);
});

test("repeating conversion reuses its linked client and project", () => {
  const app = makeApp({
    clients: [{ id: "client", brand: "Synthetic", sourceLeadId: "lead" }],
    leads: [{ id: "lead", clientId: "client", projectId: "project", brand: "Synthetic", stage: "signed", history: [], owner: "", pack: "test" }],
    projects: [{ id: "project", clientId: "client", sourceLeadId: "lead", pack: "test", stage: "onboarding", price: 1000 }]
  });
  const { GK, collections } = app;
  const { changes, state } = loadPipeline(app);
  changes["pl-move"]({ dataset: { id: "lead" }, value: "won" });
  assert.equal(collections.clients.length, 1);
  assert.equal(collections.projects.length, 1);
  assert.equal(state.opened.length, 0);
  assert.equal(state.navigated[0].view, "projects");
  assert.equal(state.navigated[0].params.id, "project");
});

test("project creation stores its source lead and repeat creation reuses that project", () => {
  const app = makeApp({
    clients: [{ id: "client", brand: "Synthetic" }],
    leads: [{ id: "lead", clientId: "client", stage: "signed", history: [] }]
  });
  const { GK, collections } = app;
  const { actions, state } = loadProjects(app, {
    "pj-n-client": "client", "pj-n-pack": "test", "pj-n-name": "Synthetic project"
  });

  GK.pj.openNew({ clientId: "client", pack: "test", sourceLeadId: "lead" });
  actions["pj-new-save"]();
  assert.equal(collections.projects.length, 1);
  assert.equal(collections.projects[0].sourceLeadId, "lead");
  assert.equal(collections.leads[0].projectId, collections.projects[0].id);
  assert.equal(collections.invoices.length, 2);

  GK.pj.openNew({ clientId: "client", pack: "test", sourceLeadId: "lead" });
  actions["pj-new-save"]();
  assert.equal(collections.projects.length, 1);
  assert.equal(collections.invoices.length, 2);
  assert.equal(state.navigated[1].params.id, collections.projects[0].id);
});

test("legacy records without relationship fields require explicit client selection", () => {
  const app = makeApp({
    clients: [{ id: "legacy-client", brand: "Same Name" }],
    leads: [{ id: "legacy-lead", brand: "Same Name", stage: "signed", history: [], owner: "", pack: "test" }]
  });
  const { GK, collections } = app;
  const { actions, changes, state } = loadPipeline(app, { "pl-convert-client": "legacy-client" });
  changes["pl-move"]({ dataset: { id: "legacy-lead" }, value: "won" });
  assert.ok(state.modal);
  assert.equal(collections.leads[0].clientId, undefined);
  actions["pl-convert-existing"]({ dataset: { id: "legacy-lead", fields: "{}" } });
  assert.equal(collections.leads[0].clientId, "legacy-client");
  assert.equal(collections.clients.length, 1);
  assert.equal(collections.leads[0].stage, "signed");
});

test("required project payment advances a linked signed lead to won and payment reversal restores signed", () => {
  const today = new Date().toISOString().slice(0, 10);
  const app = makeApp({
    clients: [{ id: "client", brand: "Synthetic", sourceLeadId: "lead" }],
    leads: [{ id: "lead", clientId: "client", brand: "Synthetic", stage: "signed", history: [{ stage: "signed", at: today }], owner: "", pack: "test", price: 1000 }],
    projects: [{ id: "project", sourceLeadId: "lead", clientId: "client", pack: "test", price: 1000, stage: "onboarding" }],
    invoices: [{ id: "deposit", projectId: "project", clientId: "client", no: "GK-2026-001", kind: "deposit", amount: 500, stamp: 0, issued: today, due: "2099-01-01", payments: [] }]
  });
  const { GK, collections } = app;
  const actions = {};
  let amount = 100;
  GK.ui = {
    closeModal: () => {},
    toast: () => {},
    confirm: (_title, _body, callback) => { GK.confirmPaymentRemoval = callback; }
  };
  GK.u.val = (id) => ({ "fi-p-date": today, "fi-p-method": "transfer", "fi-p-ref": "" })[id] || "";
  GK.u.numVal = (id) => id === "fi-p-net" ? amount : 0;
  loadFinance(app, actions);

  actions["fi-pay-save"]({ dataset: { id: "deposit" } });
  assert.equal(collections.leads[0].stage, "signed");
  assert.equal(GK.x.wonOpportunityValue(), 0);
  assert.equal(GK.x.winRateIn(30, GK.u.addDays(today, 1)).rate, null);
  amount = 400;
  actions["fi-pay-save"]({ dataset: { id: "deposit" } });
  assert.equal(collections.leads[0].stage, "won");
  assert.equal(collections.clients[0].wonOn, today);
  assert.equal(GK.x.wonOpportunityValue(), 1000);
  assert.equal(GK.m.funnel(today).won, 1);
  assert.equal(GK.x.winRateIn(30, GK.u.addDays(today, 1)).rate, 100);

  actions["fi-pay-rm"]({ dataset: { id: "deposit", k: "1" } });
  GK.confirmPaymentRemoval();
  assert.equal(collections.leads[0].stage, "signed");
  assert.equal(collections.clients[0].wonOn, "");
  assert.equal(GK.x.wonOpportunityValue(), 0);
});

test("full-upfront offers do not qualify as won from a deposit alone", () => {
  const today = new Date().toISOString().slice(0, 10);
  const { GK, store, collections } = makeApp({
    clients: [{ id: "client", sourceLeadId: "lead" }],
    leads: [{ id: "lead", clientId: "client", stage: "signed", history: [] }],
    projects: [{ id: "project", sourceLeadId: "lead", clientId: "client", pack: "audit", price: 150 }],
    invoices: [{ id: "deposit", projectId: "project", clientId: "client", no: "GK-2026-001", kind: "deposit", amount: 75, stamp: 0, payments: [{ date: today, net: 75, withheld: 0 }] }]
  });
  assert.equal(GK.m.upfrontPaid(GK.store.get("projects", "project")), false);
  assert.equal(GK.m.syncLeadPayment("project").stage, "signed");
  assert.equal(GK.store.get("leads", "lead").stage, "signed");
  store.put("invoices", {
    id: "balance", projectId: "project", clientId: "client", no: "GK-2026-002", kind: "balance",
    amount: 75, stamp: 0, payments: [{ date: today, net: 75, withheld: 0 }]
  });
  assert.equal(GK.m.syncLeadPayment("project").stage, "won");
  assert.equal(collections.leads[0].stage, "won");
});
