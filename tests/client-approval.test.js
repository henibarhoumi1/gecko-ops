"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

function makeApp() {
  const project = {
    id: "project-1",
    clientId: "client-1",
    pack: "test",
    stage: "editing",
    angles: [{ id: "angle-1", name: "Proof" }],
    reels: [{
      id: "reel-1",
      creativeRevisionId: "revision-2",
      hooks: [
        { id: "hook-1", text: "Current hook", status: "approved", v: 2, sourceRevisionId: "revision-2", clientOk: false },
        { id: "hook-2", text: "Other hook", status: "approved", v: 1, sourceRevisionId: "revision-1", clientOk: false }
      ]
    }],
    carousels: []
  };
  const share = {
    id: "share-1",
    clientId: "client-1",
    snapshot: {
      projects: [{
        id: "project-1",
        reels: [{
          id: "reel-1",
          files: [
            { key: "reel-1:hook-1", code: "SYN_H1_v2", status: "approved", version: 2, revisionId: "revision-2" },
            { key: "reel-1:hook-2", code: "SYN_H2_v1", status: "approved", version: 1, revisionId: "revision-1" }
          ]
        }]
      }]
    }
  };
  const collections = {
    projects: [project], clients: [{ id: "client-1", brand: "Synthetic" }], shares: [share], feedback: [], ideas: [],
    invoices: [], contracts: [], expenses: [], leads: [], team: [], tasks: [], boards: [], quotes: []
  };
  const store = {
    backend: "local", readOnly: false,
    all: (name) => collections[name] || [],
    get: (name, id) => (collections[name] || []).find((item) => item.id === id) || null,
    patch: (name, id, partial) => {
      const row = (collections[name] || []).find((item) => item.id === id);
      return row ? Object.assign(row, partial) : null;
    }
  };
  const handlers = { actions: {}, changes: {}, views: {} };
  const window = { GK: { store } };
  const document = { addEventListener: () => {}, getElementById: () => null, createElement: () => ({}) };
  const context = { window, document, console, Date, Math, Promise, JSON, Object, String, Number, RegExp, Array };
  vm.runInNewContext(source("src/core/util.js"), context);
  const GK = window.GK;
  GK.i18n = { lang: () => "en", add: () => {} };
  GK.t = (key, vars) => Object.keys(vars || {}).reduce((out, k) => out.replace("{" + k + "}", vars[k]), key);
  GK.me = () => null;
  GK.view = (name, view) => { handlers.views[name] = view; };
  GK.act = (name, handler) => { handlers.actions[name] = handler; };
  GK.change = () => {};
  GK.ui = {
    toast: () => {}, modal: () => {}, confirm: () => {}, btn: () => "", field: () => "",
    go: () => {}, closeModal: () => {}, modalOpen: () => false, attrs: () => "",
    pill: () => "", empty: () => {}, render: () => {}
  };
  vm.runInNewContext(source("src/core/model.js"), context);
  GK.portal = {};
  vm.runInNewContext(source("src/modules/portal_snapshot.js"), context);
  vm.runInNewContext(source("src/modules/portal_pages.js"), context);
  return { GK, store, collections, project, share };
}

function feedback(kind, meta, overrides) {
  const payload = encodeURIComponent(JSON.stringify(meta));
  return Object.assign({
    id: "feedback-1",
    clientId: "client-1",
    shareId: "share-1",
    projectId: "project-1",
    target: "reel:reel-1",
    kind,
    text: (kind === "changes" ? "Please adjust the final shot." : "Approved.") + "\n\n[[gecko-file:v1:" + payload + "]]"
  }, overrides || {});
}

const currentMeta = {
  projectId: "project-1", reelId: "reel-1", fileKey: "reel-1:hook-1", version: 2, revisionId: "revision-2"
};

test("client approval updates only the exact file and current creative revision", () => {
  const app = makeApp();
  const result = app.GK.portal.applyFileFeedback(feedback("approve", currentMeta));
  assert.equal(result.ok, true);
  assert.equal(app.project.reels[0].hooks[0].clientOk, true);
  assert.equal(app.project.reels[0].hooks[0].status, "approved");
  assert.equal(app.project.reels[0].hooks[1].clientOk, false);
  assert.equal(app.project.reels[0].creativeRevisionId, "revision-2");
  assert.equal(app.share.snapshot.projects[0].reels[0].files[0].clientOk, true);
});

test("requested changes move only the targeted file to revise and clear client approval", () => {
  const app = makeApp();
  app.project.reels[0].hooks[0].clientOk = true;
  const result = app.GK.portal.applyFileFeedback(feedback("changes", currentMeta));
  assert.equal(result.ok, true);
  assert.equal(app.project.reels[0].hooks[0].status, "revise");
  assert.equal(app.project.reels[0].hooks[0].clientOk, false);
  assert.equal(app.project.reels[0].hooks[0].note, "Please adjust the final shot.");
  assert.equal(app.project.reels[0].hooks[1].status, "approved");
  assert.equal(app.share.snapshot.projects[0].reels[0].files[0].status, "revise");
});

test("feedback for an older revision cannot approve a newer file version", () => {
  const app = makeApp();
  const old = Object.assign({}, currentMeta, { version: 1, revisionId: "revision-1" });
  const result = app.GK.portal.applyFileFeedback(feedback("approve", old));
  assert.equal(result.ok, false);
  assert.equal(app.project.reels[0].hooks[0].clientOk, false);
});

test("multiple deliverables in one reel remain isolated by file key", () => {
  const app = makeApp();
  const other = Object.assign({}, currentMeta, { fileKey: "reel-1:hook-2", version: 1, revisionId: "revision-1" });
  assert.equal(app.GK.portal.applyFileFeedback(feedback("approve", other)).ok, true);
  assert.equal(app.project.reels[0].hooks[0].clientOk, false);
  assert.equal(app.project.reels[0].hooks[1].clientOk, true);
});

test("duplicate approval feedback is idempotent", () => {
  const app = makeApp();
  const f = feedback("approve", currentMeta);
  assert.equal(app.GK.portal.applyFileFeedback(f).unchanged, undefined);
  const result = app.GK.portal.applyFileFeedback(f);
  assert.equal(result.ok, true);
  assert.equal(result.unchanged, true);
  assert.equal(app.project.reels[0].hooks[0].clientOk, true);
});

test("legacy feedback without an exact file and revision relationship stays unapplied", () => {
  const app = makeApp();
  const legacy = { kind: "approve", target: "reel:reel-1", projectId: "project-1", shareId: "share-1", clientId: "client-1", text: "Looks good." };
  assert.equal(app.GK.portal.resolveFileFeedback(legacy), null);
  assert.equal(app.GK.portal.applyFileFeedback(legacy).ok, false);
  assert.equal(app.project.reels[0].hooks[0].clientOk, false);
});

test("legacy published snapshots without file identities cannot receive inferred approvals", () => {
  const app = makeApp();
  app.share.snapshot.projects[0].reels[0].files[0] = { code: "SYN_H1_v2", status: "approved" };
  assert.equal(app.GK.portal.resolveFileFeedback(feedback("approve", currentMeta)), null);
});

test("file-only shares allow feedback on a reel without enabling script feedback", () => {
  const app = makeApp();
  const targets = app.GK.portal.feedbackTargets({
    sections: { files: true, scripts: false },
    projects: [{ reels: [{ id: "reel-1" }] }]
  });
  assert.deepEqual(Array.from(targets["reel:reel-1"]), ["approve", "changes"]);
  assert.equal(targets["idea:idea-1"], undefined);
});
