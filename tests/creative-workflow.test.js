"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
function source(file) { return fs.readFileSync(path.join(root, file), "utf8"); }

function makeCreativeApp(initial) {
  const collections = Object.assign({
    boards: [], clients: [], contracts: [], expenses: [], ideas: [], invoices: [], leads: [], projects: [], team: [], tasks: []
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
    remove: (name, id) => {
      const rows = collections[name] || [], index = rows.findIndex((item) => item.id === id);
      if (index >= 0) rows.splice(index, 1);
    },
    config: () => null,
    assignments: () => []
  };
  const handlers = { actions: {}, changes: {}, views: {} };
  const document = {
    head: { appendChild: () => {} },
    getElementById: () => null,
    createElement: () => ({ id: "", textContent: "" }),
    addEventListener: () => {},
    querySelectorAll: () => []
  };
  const window = { GK: { store } };
  const context = {
    window, document, console, Date, Math, Promise, JSON, Object, String, Number, RegExp, Array,
    setTimeout: () => 0, clearTimeout: () => 0
  };
  vm.runInNewContext(source("src/core/util.js"), context);
  const GK = window.GK;
  GK.i18n = { lang: () => "en", add: () => {} };
  GK.t = (key, vars) => Object.keys(vars || {}).reduce((out, k) => out.replace("{" + k + "}", vars[k]), key);
  GK.me = () => null;
  GK.view = (name, view) => { handlers.views[name] = view; };
  GK.act = (name, handler) => { handlers.actions[name] = handler; };
  GK.change = (name, handler) => { handlers.changes[name] = handler; };
  GK.tk = { css: () => {} };
  GK.ui = {
    toast: () => {}, modal: () => {}, confirm: () => {}, btn: () => "", field: () => "",
    go: () => {}, closeModal: () => {}, modalOpen: () => false, attrs: () => "",
    filePill: () => "", pill: () => "", stagePill: () => "", meter: () => "", empty: () => ""
  };
  GK.insight = { studio: () => "", projects: () => "" };
  vm.runInNewContext(source("src/core/model.js"), context);
  vm.runInNewContext(source("src/core/metrics.js"), context);
  vm.runInNewContext(source("src/modules/studio.js"), context);
  vm.runInNewContext(source("src/modules/studio_detail.js"), context);
  vm.runInNewContext(source("src/modules/production.js"), context);
  return { GK, store, collections, handlers, context };
}

function validIdea(overrides) {
  return Object.assign({
    id: "idea-1", title: "Synthetic creative", stage: "script", clientId: "client-1", projectId: "project-1",
    angle: "Product proof", angleId: "", objective: "Generate product inquiries", audience: "First-time buyers",
    creativeType: "brand", offer: "", objection: "", proof: "", cta: "",
    concept: "Show how the product fits into a real morning routine.",
    hook: "A morning routine can be simpler.", script: "Try it today.",
    scenes: [{ id: "scene-1", v: "Product beside a morning coffee", x: "Start with the first step.", s: 4, silent: false }],
    mode: "D", format: "9x16", refs: [], revisions: [], handoffs: []
  }, overrides || {});
}

function baseData(idea, extra) {
  return Object.assign({
    clients: [{ id: "client-1", brand: "Synthetic Client", code: "SYN" }],
    projects: [{ id: "project-1", clientId: "client-1", stage: "onboarding", angles: [], reels: [] }],
    ideas: [idea]
  }, extra || {});
}

test("creative readiness requires a complete brief and a usable scene", () => {
  const app = makeCreativeApp(baseData(validIdea({
    clientId: "", angle: "", objective: "", audience: "", concept: "", hook: "", format: "square",
    scenes: [{ v: "A visual only", x: "", silent: false }]
  })));
  const gaps = app.GK.studio.h.readyGaps(app.store.get("ideas", "idea-1"));
  for (const key of ["st_g_client", "st_g_angle", "st_g_objective", "st_g_audience", "st_g_concept", "st_g_hook", "st_g_format", "st_g_scene"]) {
    assert.ok(gaps.includes(key), "missing readiness reason: " + key);
  }
  app.store.patch("ideas", "idea-1", { scenes: [{ v: "A visual-only B-roll shot", x: "", silent: true }] });
  assert.ok(!app.GK.studio.h.readyGaps(app.store.get("ideas", "idea-1")).includes("st_g_scene"));
});

test("conditional brief requirements depend on creative type", () => {
  const app = makeCreativeApp(baseData(validIdea({ creativeType: "offer" })));
  let gaps = app.GK.studio.h.readyGaps(app.store.get("ideas", "idea-1"));
  assert.ok(gaps.includes("st_g_offer"));
  assert.ok(gaps.includes("st_g_cta"));
  app.store.patch("ideas", "idea-1", { offer: "Free delivery", cta: "Order today", creativeType: "brand" });
  gaps = app.GK.studio.h.readyGaps(app.store.get("ideas", "idea-1"));
  assert.ok(!gaps.includes("st_g_offer"));
  assert.ok(!gaps.includes("st_g_cta"));
  app.store.patch("ideas", "idea-1", { creativeType: "objection", objection: "", proof: "", cta: "" });
  gaps = app.GK.studio.h.readyGaps(app.store.get("ideas", "idea-1"));
  assert.ok(gaps.includes("st_g_objection"));
  assert.ok(gaps.includes("st_g_proof"));
  assert.ok(gaps.includes("st_g_cta"));
});

test("incomplete creative cannot be approved", () => {
  const app = makeCreativeApp(baseData(validIdea({ objective: "" })));
  assert.equal(app.GK.studio.h.approveCurrent("idea-1"), null);
  const idea = app.store.get("ideas", "idea-1");
  assert.equal(idea.stage, "script");
  assert.equal((idea.revisions || []).length, 0);
});

test("approval snapshots stay stable when the editable idea changes", () => {
  const app = makeCreativeApp(baseData(validIdea()));
  const approved = app.GK.studio.h.approveCurrent("idea-1");
  const revision = app.GK.studio.h.selectedRevision(approved);
  assert.equal(approved.stage, "ready");
  assert.ok(revision.id);
  app.store.patch("ideas", "idea-1", {
    hook: "A changed draft hook",
    scenes: [{ id: "scene-1", v: "Changed draft visual", x: "Changed VO", s: 8, silent: false }]
  });
  assert.equal(revision.snapshot.hook, "A morning routine can be simpler.");
  assert.equal(revision.snapshot.scenes[0].v, "Product beside a morning coffee");
});

test("handoff uses approved content, preserves structured scenes, and is idempotent", () => {
  const app = makeCreativeApp(baseData(validIdea()));
  const idea = app.GK.studio.h.approveCurrent("idea-1");
  const revision = app.GK.studio.h.selectedRevision(idea);
  app.store.patch("ideas", "idea-1", { hook: "Unapproved draft hook", script: "Unapproved draft script" });
  let result = app.GK.studio.h.handoff(app.store.get("ideas", "idea-1"), app.store.get("projects", "project-1"), revision);
  assert.ok(result && !result.existing);
  assert.equal(result.reel.sourceIdeaId, "idea-1");
  assert.equal(result.reel.creativeRevisionId, revision.id);
  assert.equal(result.reel.hooks[0].sourceRevisionId, revision.id);
  assert.equal(result.reel.hooks[0].text, revision.snapshot.hook);
  assert.equal(result.reel.scenes[0].v, revision.snapshot.scenes[0].v);
  assert.ok(result.reel.script.includes(revision.snapshot.scenes[0].v));
  assert.ok(!result.reel.script.includes("Unapproved"));
  assert.equal(result.reel.productionScenes[0].done, false);

  const duplicate = app.GK.studio.h.handoff(app.store.get("ideas", "idea-1"), app.store.get("projects", "project-1"), revision);
  assert.equal(duplicate.existing, true);
  assert.equal(app.store.get("projects", "project-1").reels.length, 1);
});

test("new approved revision reuses the reel, retains history and does not move hook results", () => {
  const app = makeCreativeApp(baseData(validIdea({
    scenes: [
      { id: "scene-1", v: "First visual", x: "First line", s: 4, silent: false },
      { id: "scene-2", v: "Closing product shot", x: "", s: 3, silent: true }
    ]
  })));
  let idea = app.GK.studio.h.approveCurrent("idea-1");
  const firstRevision = app.GK.studio.h.selectedRevision(idea);
  const first = app.GK.studio.h.handoff(idea, app.store.get("projects", "project-1"), firstRevision);
  const project = app.store.get("projects", "project-1");
  project.reels[0].productionScenes = [{ id: "scene-1", done: true }, { id: "scene-2", done: true }];
  project.reels[0].hooks[0].results = { hook: 24, ctr: 1.7, cpp: 6.2 };
  app.store.patch("projects", project.id, { reels: project.reels });

  app.store.patch("ideas", idea.id, {
    hook: "A new approved hook",
    scenes: [
      { id: "scene-1", v: "Revised visual", x: "Revised VO", s: 5, silent: false },
      { id: "scene-2", v: "Closing product shot", x: "", s: 3, silent: true }
    ]
  });
  idea = app.GK.studio.h.approveCurrent("idea-1");
  const nextRevision = app.GK.studio.h.selectedRevision(idea);
  const second = app.GK.studio.h.handoff(idea, app.store.get("projects", "project-1"), nextRevision);
  const reels = app.store.get("projects", "project-1").reels;
  assert.equal(reels.length, 1);
  assert.equal(second.reel.creativeRevisionId, nextRevision.id);
  assert.equal(second.reel.creativeHistory.length, 1);
  assert.equal(second.reel.creativeHistory[0].revisionId, firstRevision.id);
  assert.equal(second.reel.creativeHistory[0].snapshot.hook, firstRevision.snapshot.hook);
  assert.equal(second.reel.productionScenes[0].done, false);
  assert.equal(second.reel.productionScenes[1].done, true);
  assert.equal(second.reel.hooks.length, 2);
  assert.equal(second.reel.hooks[0].results.cpp, 6.2);
  assert.equal(second.reel.hooks[0].text, firstRevision.snapshot.hook);
  assert.equal(second.reel.hooks[1].sourceRevisionId, nextRevision.id);
  const measured = app.GK.x.hooks().find((x) => x.text === firstRevision.snapshot.hook);
  assert.equal(measured.cpp, 6.2);
  assert.equal(measured.angle, "Product proof");
  assert.equal(first.reel.creativeSnapshot.hook, firstRevision.snapshot.hook);
});

test("a changed creative angle gets a separate reel so old result attribution stays put", () => {
  const app = makeCreativeApp(baseData(validIdea()));
  let idea = app.GK.studio.h.approveCurrent("idea-1");
  const firstRevision = app.GK.studio.h.selectedRevision(idea);
  const first = app.GK.studio.h.handoff(idea, app.store.get("projects", "project-1"), firstRevision);
  const project = app.store.get("projects", "project-1");
  project.reels[0].hooks[0].results = { hook: 18, ctr: 1.1, cpp: 8 };
  app.store.patch("projects", project.id, { reels: project.reels });

  app.store.patch("ideas", idea.id, { angle: "Customer objection", hook: "A different angle" });
  idea = app.GK.studio.h.approveCurrent("idea-1");
  const nextRevision = app.GK.studio.h.selectedRevision(idea);
  const second = app.GK.studio.h.handoff(idea, app.store.get("projects", "project-1"), nextRevision);
  const updated = app.store.get("projects", "project-1");
  assert.equal(updated.reels.length, 2);
  assert.equal(first.reel.angleId, updated.reels[0].angleId);
  assert.equal(updated.reels[0].hooks[0].results.cpp, 8);
  assert.equal(second.reel.angleId, updated.reels[1].angleId);
  assert.notEqual(second.reel.angleId, updated.reels[0].angleId);
});

test("scene checklist persists separately from the approved creative snapshot", () => {
  const app = makeCreativeApp(baseData(validIdea()));
  const idea = app.GK.studio.h.approveCurrent("idea-1");
  const entry = app.GK.studio.h.selectedRevision(idea);
  app.GK.studio.h.handoff(idea, app.store.get("projects", "project-1"), entry);
  const snapshot = JSON.stringify(entry.snapshot);
  app.handlers.changes["pr-scene-check"]({
    dataset: { p: "project-1", r: app.store.get("projects", "project-1").reels[0].id, id: "scene-1", i: "0" },
    checked: true
  });
  const reel = app.store.get("projects", "project-1").reels[0];
  assert.equal(reel.productionScenes[0].done, true);
  assert.equal(JSON.stringify(entry.snapshot), snapshot);
  assert.equal(reel.creativeSnapshot.scenes[0].v, "Product beside a morning coffee");
});

test("handoff updates the idea's board association but preserves unrelated board links", () => {
  const idea = validIdea({ projectId: "old-project", boardId: "board-1" });
  const app = makeCreativeApp(baseData(idea, {
    projects: [
      { id: "old-project", clientId: "client-1", stage: "onboarding", angles: [], reels: [] },
      { id: "project-1", clientId: "client-1", stage: "onboarding", angles: [], reels: [] }
    ],
    boards: [{ id: "board-1", ideaId: "idea-1", clientId: "client-1", projectId: "old-project", items: [] }]
  }));
  const approved = app.GK.studio.h.approveCurrent("idea-1");
  app.GK.studio.h.handoff(approved, app.store.get("projects", "project-1"), app.GK.studio.h.selectedRevision(approved));
  assert.equal(app.store.get("boards", "board-1").projectId, "project-1");

  const secondIdea = validIdea({ id: "idea-2", projectId: "project-1", boardId: "board-2" });
  app.store.put("ideas", secondIdea);
  app.store.put("boards", { id: "board-2", ideaId: "idea-2", clientId: "client-1", projectId: "unrelated-project", items: [] });
  const secondApproved = app.GK.studio.h.approveCurrent("idea-2");
  app.GK.studio.h.handoff(secondApproved, app.store.get("projects", "project-1"), app.GK.studio.h.selectedRevision(secondApproved));
  assert.equal(app.store.get("boards", "board-2").projectId, "unrelated-project");
});

test("legacy ideas and reels remain readable and can be linked without losing results", () => {
  const legacy = validIdea({
    id: "legacy-idea", reelId: "legacy-reel", projectId: "project-1",
    revisions: undefined, handoffs: undefined
  });
  const app = makeCreativeApp(baseData(legacy, {
    projects: [{
      id: "project-1", clientId: "client-1", stage: "onboarding",
      angles: [{ id: "angle-1", name: "Product proof" }],
      reels: [{
        id: "legacy-reel", angleId: "angle-1", script: "Old production script", drive: "",
        hooks: [{ id: "legacy-hook", text: "A morning routine can be simpler.", status: "approved", v: 2, clientOk: true, results: { hook: 30, ctr: 2, cpp: 5 } }]
      }]
    }]
  }));
  assert.equal(app.GK.studio.h.selectedRevision(legacy), null);
  assert.ok(app.GK.studio.h.readyGaps({ id: "partial", scenes: null, refs: null }).length);
  const approved = app.GK.studio.h.approveCurrent("legacy-idea");
  const result = app.GK.studio.h.handoff(approved, app.store.get("projects", "project-1"), app.GK.studio.h.selectedRevision(approved));
  assert.equal(app.store.get("projects", "project-1").reels.length, 1);
  assert.equal(result.reel.hooks[0].results.cpp, 5);
  assert.equal(result.reel.hooks[0].clientOk, true);
  assert.equal(result.reel.creativeHistory[0].legacy, true);
  assert.equal(app.GK.x.hooks()[0].cpp, 5);
});
