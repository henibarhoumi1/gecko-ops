/* GECKO Ops · data store.
   One in-memory cache behind three modes:
     demo     local prototype data persisted only in this browser
     shared   legacy claude.ai artifact database
     supabase authenticated website workspace, with server-enforced scope
   Modules only call: all, get, put, patch, remove, config, setConfig, onChange. */
(function (GK) {
  "use strict";
  var u = GK.u;
  var COLLS = ["team", "clients", "leads", "outreach", "contracts", "projects", "invoices", "tasks", "msgs", "ideas", "boards", "shares", "feedback", "expenses", "quotes"];
  var KEY = { demo: "gecko-ops-v01-demo", mode: "gecko-ops-v01-mode", as: "gecko-ops-v01-as" };
  var LOG_MAX = 30, MSG_WINDOW = 400;

  var cache = {}, cfg = null, listeners = [], db = null, user = null, unsubs = [], assignmentRows = [];
  var inflight = {}, queued = {};
  COLLS.forEach(function (c) { cache[c] = {}; });

  var S = {
    COLLS: COLLS,
    mode: "demo",          // local prototype ("demo") | remote workspace ("live")
    backend: "local",      // "local" | "shared" | "supabase"
    readOnly: false,
    sharedAvailable: false,
    sharedLive: false,     // the shared store already holds a live workspace
    viewer: { id: null, isOwner: false, canEdit: false, canWrite: null },
    ready: false,
    authState: "demo",
    workspaceId: null,
    workspaceRole: null,
    publicShare: null
  };

  // ---------- change notification (coalesced to one render per frame) ----------
  var pending = false;
  function changed() {
    if (pending) return; pending = true;
    (window.requestAnimationFrame || setTimeout)(function () { pending = false; listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); });
  }
  S.onChange = function (fn) { listeners.push(fn); };

  // ---------- reads ----------
  S.all = function (coll) { var o = cache[coll] || {}; return Object.keys(o).map(function (k) { return o[k]; }); };
  S.get = function (coll, id) { return id && cache[coll] ? cache[coll][id] || null : null; };
  S.config = function () { return cfg; };

  // ---------- local persistence ----------
  function snapshotLocal() { var o = { config: cfg, colls: {} }; COLLS.forEach(function (c) { o.colls[c] = S.all(c); }); return o; }
  // Local saves are batched, but the target key is fixed when the change is made and pending saves are
  // flushed before any mode switch and when the page is hidden or closed.
  var saveKey = null, saveTimer = null;
  function writeLocal() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!saveKey) return true;
    var k = saveKey; saveKey = null;
    try { localStorage.setItem(k, JSON.stringify(snapshotLocal())); return true; }
    catch (e) { GK.ui && GK.ui.toast(GK.t("write_failed")); return false; }
  }
  function saveLocal() {
    if (S.backend !== "local") return;
    var k = KEY.demo;
    if (saveKey && saveKey !== k) writeLocal();
    saveKey = k; clearTimeout(saveTimer); saveTimer = setTimeout(writeLocal, 150);
  }
  S.flush = writeLocal;
  S.localRecordCount = function () {
    return COLLS.reduce(function (n, coll) { return n + S.all(coll).length; }, 0);
  };
  S.clearLocalRecords = function () {
    if (S.backend !== "local" || S.readOnly) return null;
    writeLocal();
    var previous = snapshotLocal(), count = S.localRecordCount();
    var next = { config: cfg || GK.m.defaultConfig(), colls: {} };
    COLLS.forEach(function (coll) { cache[coll] = {}; next.colls[coll] = []; });
    cfg = next.config;
    clearTimeout(saveTimer); saveTimer = null; saveKey = null;
    try {
      localStorage.setItem(KEY.demo, JSON.stringify(next));
    } catch (error) {
      loadInto(previous);
      return null;
    }
    changed();
    return { count: count, collections: COLLS.slice() };
  };
  S.reserveInvoiceNo = function (year) {
    if (S.backend !== "local") throw new Error("Collision-safe invoice numbering is only available in local prototype mode.");
    var max = 0, pattern = new RegExp("^GK-" + year + "-(\\d+)$");
    function scan(rows) {
      (rows || []).forEach(function (i) {
        var match = pattern.exec(i && i.no || "");
        if (match) max = Math.max(max, +match[1]);
      });
    }
    scan(S.all("invoices"));
    try {
      var saved = localStorage.getItem(KEY.demo);
      if (saved) {
        var data = JSON.parse(saved);
        scan(data && data.colls && data.colls.invoices);
      }
      var key = "gecko-ops-v01-invoice-sequence-" + year;
      var last = +localStorage.getItem(key) || 0;
      var next = Math.max(max, last) + 1;
      localStorage.setItem(key, String(next));
      return "GK-" + year + "-" + String(next).padStart(3, "0");
    } catch (e) {
      throw new Error("Could not reserve an invoice number: " + (e && e.message ? e.message : "local storage is unavailable."));
    }
  };
  S.reserveQuoteNo = function (year) {
    if (S.backend !== "local") throw new Error("Collision-safe quote numbering is only available in local prototype mode.");
    var max = 0, pattern = new RegExp("^Q-" + year + "-(\\d+)$");
    function scan(rows) {
      (rows || []).forEach(function (q) {
        var match = pattern.exec(q && q.no || "");
        if (match) max = Math.max(max, +match[1]);
      });
    }
    scan(S.all("quotes"));
    try {
      var saved = localStorage.getItem(KEY.demo);
      if (saved) {
        var data = JSON.parse(saved);
        scan(data && data.colls && data.colls.quotes);
      }
      var key = "gecko-ops-v01-quote-sequence-" + year;
      var last = +localStorage.getItem(key) || 0;
      var next = Math.max(max, last) + 1;
      localStorage.setItem(key, String(next));
      return "Q-" + year + "-" + String(next).padStart(3, "0");
    } catch (e) {
      throw new Error("Could not reserve a quote number: " + (e && e.message ? e.message : "local storage is unavailable."));
    }
  };
  window.addEventListener("pagehide", writeLocal);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") writeLocal(); });
  function loadInto(data) {
    COLLS.forEach(function (c) { cache[c] = {}; ((data && data.colls && data.colls[c]) || []).forEach(function (x) { if (x && x.id) cache[c][x.id] = x; }); });
    cfg = (data && data.config) || null;
  }

  // ---------- shared writes: one write at a time per document, latest value wins ----------
  function docPath(coll, id) { return coll + "/" + id; }
  function sharedWrite(path, body) {
    if (inflight[path]) { queued[path] = { body: body }; return; }
    inflight[path] = true;
    var ref = db.doc(path);
    var op = body === null ? ref.delete() : ref.set(body);
    var tries = 0;
    function done() {
      inflight[path] = false;
      if (queued[path]) { var q = queued[path]; delete queued[path]; sharedWrite(path, q.body); }
    }
    function fail(e) {
      var code = e && e.code;
      if (code === "unavailable" && tries++ < 1) {
        return setTimeout(function () { (body === null ? ref.delete() : ref.set(body)).then(done, fail); }, 400 + Math.random() * 800);
      }
      inflight[path] = false; delete queued[path];
      if (code === "invalid_argument" || code === "revoked" || code === "not_granted") { S.readOnly = true; GK.ui && GK.ui.toast(GK.t("read_only")); }
      else if (code === "quota_exceeded") { GK.ui && GK.ui.toast(GK.t("quota_full")); }
      else { GK.ui && GK.ui.toast(GK.t("write_failed")); }
      changed();
    }
    op.then(done, fail);
  }

  function persist(coll, id, obj) {
    if (S.backend === "shared") sharedWrite(docPath(coll, id), obj ? u.clone(obj) : null);
    else if (S.backend === "supabase") remotePersist(coll, id, obj);
    else saveLocal();
  }
  function remoteError(error) {
    var message = error && error.message ? error.message : "Unknown backend error.";
    if (GK.ui) GK.ui.toast("Save failed: " + message);
    if (S.workspaceId) loadWorkspace().catch(function (reloadError) {
      if (GK.ui) GK.ui.toast("Workspace reload failed: " + (reloadError && reloadError.message ? reloadError.message : "Unknown backend error."));
    });
  }
  function rpc(name, args) {
    if (!GK.supabase || !S.workspaceId) return Promise.reject(new Error("An authenticated workspace is required."));
    return GK.supabase.rpc(name, Object.assign({ p_workspace_id: S.workspaceId }, args || {}));
  }
  function remotePersist(coll, id, obj) {
    if (coll === "team" || coll === "shares") {
      remoteError(new Error("Use the dedicated membership or client-share operation."));
      return;
    }
    var operation;
    if (coll === "feedback") {
      operation = rpc("add_team_client_feedback", {
        p_share_id: obj.shareId, p_project_id: obj.projectId || null, p_kind: obj.kind,
        p_target: obj.target, p_text: obj.text || ""
      });
    } else if (obj === null) {
      operation = rpc("delete_workspace_record", { p_collection: coll, p_id: id });
    } else {
      operation = rpc("put_workspace_record", { p_collection: coll, p_id: id, p_data: u.clone(obj) });
    }
    operation.then(function (result) {
      if (coll === "feedback" && result) {
        delete cache.feedback[id];
        obj.id = result;
        cache.feedback[result] = obj;
      }
      changed();
    }, remoteError);
  }
  function guard() {
    if (S.readOnly) { GK.ui && GK.ui.toast(GK.t("read_only")); return false; }
    return true;
  }
  function stampLog(obj, text) {
    if (!text) return;
    var me = GK.me();
    obj.log = (obj.log || []).concat([{ at: u.nowStamp(), who: me ? me.id : "", text: String(text).slice(0, 160) }]).slice(-LOG_MAX);
  }

  // ---------- writes ----------
  /** Insert or replace a whole record. Returns the stored copy. opts.log adds one activity line. */
  S.put = function (coll, obj, opts) {
    if (!guard()) return null;
    if (S.backend === "supabase" && (coll === "team" || coll === "shares")) {
      remoteError(new Error("This operation must use the secure membership/share workflow."));
      return null;
    }
    var o = u.clone(obj); if (!o.id) o.id = u.uid(coll.slice(0, 1));
    stampLog(o, opts && opts.log);
    if (S.backend === "supabase" && coll === "feedback") {
      return rpc("add_team_client_feedback", {
        p_share_id: o.shareId, p_project_id: o.projectId || null,
        p_kind: o.kind, p_target: o.target, p_text: o.text || ""
      }).then(function (id) {
        o.id = id; cache.feedback[id] = o; changed(); return o;
      }, function (error) { remoteError(error); throw error; });
    }
    cache[coll][o.id] = o; persist(coll, o.id, o); changed(); return o;
  };
  /** Merge top-level fields into a record. */
  S.patch = function (coll, id, partial, opts) {
    if (!guard()) return null;
    var cur = cache[coll][id]; if (!cur) return null;
    var o = u.clone(cur); for (var k in partial) if (Object.prototype.hasOwnProperty.call(partial, k)) o[k] = u.clone(partial[k]);
    stampLog(o, opts && opts.log);
    if (S.backend === "supabase" && coll === "shares") {
      if (Object.prototype.hasOwnProperty.call(partial, "enabled")) {
        if (partial.enabled) return S.enableClientShare(id);
        S.revokeClientShare(id);
        return Object.assign({}, cur, { enabled: false });
      }
      cache[coll][id] = o; changed();
      var targets = o.feedbackTargets || {};
      return rpc("update_client_share", {
        p_share_id: id, p_snapshot: o.snapshot || null,
        p_feedback_targets: targets, p_expires_at: o.expiresAt || null,
        p_publish: Object.prototype.hasOwnProperty.call(partial, "snapshot")
      }).then(function () { changed(); return o; }, function (error) { remoteError(error); return null; });
    }
    cache[coll][id] = o; persist(coll, id, o); changed(); return o;
  };
  S.remove = function (coll, id) {
    if (!guard()) return;
    if (!cache[coll][id]) return;
    if (S.backend === "supabase" && coll === "shares") return S.revokeClientShare(id);
    if (S.backend === "supabase" && coll === "team") {
      return rpc("remove_workspace_member", { p_member_id: id }).then(function () {
        delete cache.team[id]; changed();
      }).catch(remoteError);
    }
    delete cache[coll][id]; persist(coll, id, null); changed();
  };
  /** Config is admin-only in the shared store (Settings). */
  S.setConfig = function (partial) {
    if (!guard()) return null;
    var o = u.clone(cfg || GK.m.defaultConfig());
    for (var k in partial) if (Object.prototype.hasOwnProperty.call(partial, k)) o[k] = u.clone(partial[k]);
    cfg = o;
    if (S.backend === "shared") sharedWrite("config/app", u.clone(o));
    else if (S.backend === "supabase") {
      // Non-founders see a trimmed config, so they save only the shared keys they own, one at a time.
      if (S.workspaceRole && S.workspaceRole !== "founder") Object.keys(partial).forEach(function (k) {
        rpc("set_workspace_config_key", { p_key: k, p_value: u.clone(partial[k]) }).then(changed, remoteError);
      });
      else rpc("set_workspace_config", { p_data: u.clone(o) }).then(changed, remoteError);
    }
    else saveLocal();
    changed(); return o;
  };

  // ---------- who am I ----------
  /** The team member this viewer is. Demo: whoever "Working as" picks. Local live: the founder. Shared: the member claimed by this viewer's id. */
  GK.me = function () {
    var team = S.all("team");
    if (S.mode === "demo") { var as = u.lsGet(KEY.as, null); return S.get("team", as) || team.find(function (m) { return m.role === "founder"; }) || team[0] || null; }
    if (S.backend === "shared" || S.backend === "supabase") return S.viewer.id ? team.find(function (m) { return m.userId === S.viewer.id; }) || null : null;
    var asL = u.lsGet(KEY.as + "-live", null);
    return S.get("team", asL) || team.find(function (m) { return m.role === "founder"; }) || team[0] || null;
  };
  S.workAs = function (memberId) { u.lsSet(S.mode === "demo" ? KEY.as : KEY.as + "-live", memberId); changed(); };
  /** Shared mode: a viewer with no team record must join before using the page. */
  S.needsJoin = function () { return S.mode === "live" && S.backend === "shared" && !S.readOnly && !!S.viewer.id && !GK.me(); };
  /** Join as an existing unclaimed member, or as a new one. */
  S.join = function (name, role, claimId) {
    var id = S.viewer.id;
    if (claimId && S.get("team", claimId)) return S.patch("team", claimId, { userId: id }, { log: "joined" });
    return S.put("team", { id: "m" + id.replace(/[^A-Za-z0-9]/g, "").slice(-16), name: name, role: role, userId: id });
  };

  // ---------- shared subscription ----------
  function subscribeShared() {
    unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = [];
    COLLS.forEach(function (c) { cache[c] = {}; });
    function onErr(e) {
      if (e && (e.code === "revoked" || e.code === "not_granted")) { S.readOnly = true; changed(); }
      else console.warn("GECKO Ops: subscription stopped", e && e.code);
    }
    unsubs.push(db.doc("config/app").onSnapshot(function (snap) {
      if (snap.exists) cfg = u.clone(snap.data()); changed();
    }, onErr));
    // A client page only needs the shared pages; the rest of the workspace is never downloaded for it.
    COLLS.filter(function (c) { return !(GK.ui && GK.ui.clientToken) || c === "shares"; }).forEach(function (c) {
      var q = c === "msgs" ? db.collection(c).orderBy("at", "desc").limit(MSG_WINDOW) : db.collection(c);
      unsubs.push(q.onSnapshot(function (snap) {
        var next = {};
        snap.docs.forEach(function (d) { if (d.exists) next[d.id] = u.clone(d.data()); });
        // keep this page's newer values that are still waiting to be sent
        Object.keys(queued).forEach(function (p) { var parts = p.split("/"); if (parts[0] === c) { if (queued[p].body) next[parts[1]] = queued[p].body; else delete next[parts[1]]; } });
        cache[c] = next; changed();
      }, onErr));
    });
  }

  function collectionsFor(role) {
    if (role === "founder") return COLLS.slice();
    if (role === "sales") return ["team", "clients", "leads", "outreach", "contracts", "projects", "tasks", "msgs", "ideas", "boards", "shares", "feedback", "quotes"];
    if (role === "editor") return ["team", "clients", "projects", "tasks", "msgs", "ideas", "boards"];
    if (role === "assistant") return ["team", "clients", "projects", "tasks", "msgs", "boards"];
    return [];
  }
  function emptyCache() { COLLS.forEach(function (c) { cache[c] = {}; }); }
  function loadWorkspace() {
    return GK.supabase.session().then(function (session) {
      if (!session || !session.user) {
        emptyCache(); cfg = null; assignmentRows = []; S.workspaceId = null; S.workspaceRole = null;
        S.authState = "login"; S.readOnly = true; changed();
        throw new Error("Sign-in required.");
      }
      S.viewer = { id: session.user.id, isOwner: false, canEdit: true, canWrite: true };
      return GK.supabase.rpc("get_my_workspaces", {}).then(function (workspaces) {
        emptyCache(); cfg = null; assignmentRows = [];
        if (!workspaces || !workspaces.length) {
          S.workspaceId = null; S.workspaceRole = null; S.authState = "no-workspace";
          S.mode = "live"; S.backend = "supabase"; S.readOnly = true;
          changed(); return;
        }
        var remembered = sessionStorage.getItem("gecko-ops-workspace");
        var workspace = workspaces.find(function (w) { return w.id === remembered; }) || workspaces[0];
        S.workspaceId = workspace.id; S.workspaceRole = workspace.role;
        sessionStorage.setItem("gecko-ops-workspace", workspace.id);
        S.mode = "live"; S.backend = "supabase"; S.readOnly = false; S.authState = "loading";
        var reads = collectionsFor(workspace.role).map(function (coll) {
          return GK.supabase.rpc("get_workspace_records", { p_workspace_id: workspace.id, p_collection: coll })
            .then(function (rows) {
              (rows || []).forEach(function (record) { if (record && record.id) cache[coll][record.id] = record; });
            });
        });
        reads.push(GK.supabase.rpc("get_workspace_config", { p_workspace_id: workspace.id })
          .then(function (data) { cfg = data || {}; }));
        if (workspace.role === "founder") reads.push(GK.supabase.rpc("get_workspace_assignments", { p_workspace_id: workspace.id })
          .then(function (rows) { assignmentRows = rows || []; }));
        return Promise.all(reads).then(function () { S.authState = "ready"; changed(); });
      });
    }).catch(function (error) {
      emptyCache(); cfg = null; S.workspaceId = null; S.workspaceRole = null;
      S.authState = "login"; S.readOnly = true;
      S.authError = error && error.message ? error.message : "Workspace data could not be loaded.";
      changed();
      throw error;
    });
  }
  S.loadPublicShare = function (token) {
    S.publicShare = null;
    if (!GK.supabase || !GK.supabase.configured()) return Promise.resolve(null);
    return GK.supabase.rpc("get_public_client_share", { p_token: token }, true).then(function (share) {
      S.publicShare = share ? Object.assign({ id: token, token: token }, share) : null;
      changed(); return S.publicShare;
    });
  };
  /** Founder only: copy a downloaded backup into the signed-in workspace. Clients go first, then projects, then the rest. Team and shares are not copied: people join by invite, client links are published again. */
  S.restoreBackup = function (backup, onStep) {
    if (S.backend !== "supabase" || S.workspaceRole !== "founder") return Promise.reject(new Error("Only a founder can restore into the workspace."));
    if (!backup || !backup.colls || typeof backup.colls !== "object") return Promise.reject(new Error("This file is not a Gecko Ops backup."));
    var order = ["clients", "projects"].concat(COLLS.filter(function (c) { return ["clients", "projects", "team", "shares", "feedback"].indexOf(c) < 0; }));
    var jobs = [];
    order.forEach(function (coll) {
      (Array.isArray(backup.colls[coll]) ? backup.colls[coll] : []).forEach(function (o) {
        if (o && o.id) jobs.push([coll, o]);
      });
    });
    var done = 0, failed = 0;
    var chain = backup.config ? rpc("set_workspace_config", { p_data: u.clone(backup.config) }).catch(function () { failed++; }) : Promise.resolve();
    jobs.forEach(function (j) {
      chain = chain.then(function () {
        return rpc("put_workspace_record", { p_collection: j[0], p_id: String(j[1].id), p_data: u.clone(j[1]) })
          .then(function () { done++; }, function () { failed++; })
          .then(function () { if (onStep) onStep(done + failed, jobs.length); });
      });
    });
    return chain.then(loadWorkspace).then(function () { changed(); return { done: done, failed: failed, total: jobs.length }; });
  };
  S.createWorkspace = function (name) {
    return GK.supabase.rpc("create_workspace", { p_name: name }).then(loadWorkspace);
  };
  S.acceptInvite = function (token, name) {
    return GK.supabase.rpc("accept_workspace_invite", { p_token: token, p_display_name: name }).then(loadWorkspace);
  };
  S.createInvite = function (email, role) {
    return rpc("invite_workspace_member", { p_email: email, p_role: role });
  };
  S.assignments = function () { return assignmentRows.slice(); };
  S.setAssignment = function (type, entityId, memberId, assigned) {
    if (type !== "client" && type !== "project") return Promise.reject(new Error("Invalid assignment type."));
    var name = type === "client" ? "assign_client_member" : "assign_project_member";
    var args = type === "client"
      ? { p_client_id: entityId, p_member_id: memberId, p_assigned: !!assigned }
      : { p_project_id: entityId, p_member_id: memberId, p_assigned: !!assigned };
    return rpc(name, args).then(function () {
      assignmentRows = assignmentRows.filter(function (row) {
        return !(row.type === type && row.entityId === entityId && row.memberId === memberId);
      });
      if (assigned) assignmentRows.push({ type: type, entityId: entityId, memberId: memberId });
      changed();
    });
  };
  S.signIn = function (email, password) {
    return GK.supabase.signIn(email, password).then(loadWorkspace).then(function () { changed(); });
  };
  S.signUp = function (email, password, name) {
    return GK.supabase.signUp(email, password, name).then(function (result) {
      if (!result || !result.access_token) {
        S.authMessage = "Check your email to confirm the account, then sign in.";
        S.authState = "login"; changed(); return result;
      }
      return loadWorkspace().then(function () { changed(); return result; });
    });
  };
  S.signOut = function () {
    function clear() {
      emptyCache(); cfg = null; assignmentRows = []; S.workspaceId = null; S.workspaceRole = null;
      sessionStorage.removeItem("gecko-ops-share-tokens");
      S.viewer = { id: null, isOwner: false, canEdit: false, canWrite: false };
      S.authState = "login"; S.readOnly = true; changed();
    }
    return GK.supabase.signOut().then(clear, function (error) { clear(); throw error; });
  };
  function rememberShareToken(id, token) {
    var tokens;
    try { tokens = JSON.parse(sessionStorage.getItem("gecko-ops-share-tokens") || "{}"); }
    catch (e) { tokens = {}; }
    tokens[id] = token;
    sessionStorage.setItem("gecko-ops-share-tokens", JSON.stringify(tokens));
  }
  S.shareToken = function (id) {
    var tokens;
    try { tokens = JSON.parse(sessionStorage.getItem("gecko-ops-share-tokens") || "{}"); }
    catch (e) { return ""; }
    return tokens[id] || "";
  };
  S.createClientShare = function (share, snapshot, feedbackTargets) {
    return rpc("create_client_share", {
      p_client_id: share.clientId, p_project_id: share.projectId || null,
      p_snapshot: snapshot, p_feedback_targets: feedbackTargets,
      p_expires_at: share.expiresAt || null
    }).then(function (created) {
      var saved = Object.assign({}, share, {
        id: created.id, token: created.token, snapshot: snapshot,
        feedbackTargets: feedbackTargets, enabled: true,
        publishedAt: new Date().toISOString(), created: new Date().toISOString()
      });
      cache.shares[saved.id] = saved;
      rememberShareToken(saved.id, created.token);
      changed(); return saved;
    });
  };
  S.rotateClientShare = function (id) {
    return rpc("rotate_client_share_token", { p_share_id: id }).then(function (token) {
      rememberShareToken(id, token); changed(); return token;
    });
  };
  S.enableClientShare = function (id) {
    return rpc("enable_client_share", { p_share_id: id }).then(function (token) {
      rememberShareToken(id, token);
      if (cache.shares[id]) cache.shares[id].enabled = true;
      changed(); return cache.shares[id];
    }).catch(function (error) { remoteError(error); return null; });
  };
  S.revokeClientShare = function (id) {
    return rpc("revoke_client_share", { p_share_id: id }).then(function () {
      if (cache.shares[id]) cache.shares[id].enabled = false;
      changed();
      return true;
    }).catch(function (error) { remoteError(error); return false; });
  };
  S.submitClientFeedback = function (token, kind, target, text, projectId) {
    return GK.supabase.rpc("submit_client_feedback", {
      p_token: token, p_kind: kind, p_target: target, p_text: text || "",
      p_project_id: projectId || null
    }, true);
  };

  // ---------- modes ----------
  function useDemo() {
    writeLocal();
    S.mode = "demo"; S.backend = "local"; S.readOnly = false;
    var saved = u.lsGet(KEY.demo, null);
    if (saved && typeof saved === "object" && saved.colls && typeof saved.colls === "object") loadInto(saved);
    else {
      loadInto({ config: GK.m.defaultConfig(), colls: {} });
      saveLocal();
    }
  }
  function useSharedLive() {
    writeLocal();
    S.mode = "live"; S.backend = "shared";
    S.readOnly = S.viewer.canWrite === false;
    subscribeShared();
  }
  function stopShared() { unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = []; }

  S.showDemo = function () { stopShared(); u.lsSet(KEY.mode, "demo"); useDemo(); changed(); };
  S.resetDemo = function () {
    if (S.mode !== "demo") return null;
    return S.clearLocalRecords();
  };
  /** Live data is shared remotely or held by the authenticated Supabase workspace, never browser-local. */
  S.hasLive = function () { return S.sharedLive || (S.backend === "supabase" && S.authState === "ready"); };
  S.showLive = function () {
    u.lsSet(KEY.mode, "live");
    if (GK.supabase && GK.supabase.configured()) {
      S.mode = "live"; S.backend = "supabase"; S.readOnly = true; S.authState = "login";
      loadWorkspace().catch(function (error) { S.authError = error.message; changed(); });
    } else if (S.sharedLive && db) { useSharedLive(); changed(); }
    else if (GK.ui) GK.ui.toast("Live workspace requires a configured Supabase backend. The local workspace remains available.");
  };
  /** Go live. On claude.ai the workspace is the artifact's shared database (the owner becomes the founder);
      with Supabase it is the signed-in workspace. */
  S.startLive = function (name) {
    if (GK.supabase && GK.supabase.configured()) return S.showLive();
    if (!db || S.viewer.canWrite === false) return S.showLive();
    writeLocal();
    var conf = GK.m.defaultConfig();
    u.lsSet(KEY.mode, "live");
    S.mode = "live"; S.backend = "shared"; S.readOnly = false;
    cfg = conf; S.sharedLive = true;
    sharedWrite("config/app", u.clone(conf));
    var me = { id: "m" + (S.viewer.id || "founder").replace(/[^A-Za-z0-9]/g, "").slice(-16), name: name || "Owner", role: "founder", userId: S.viewer.id };
    sharedWrite("team/" + me.id, me);
    cache.team[me.id] = me;
    subscribeShared();
    changed();
  };

  /** Start up: render from what is known at once, then connect the shared store when the page runs on claude.ai. */
  S.boot = function (done) {
    var pref = u.lsGet(KEY.mode, null);
    var finished = false;
    function finish() { if (finished) return; finished = true; S.ready = true; done(); }
    if (GK.ui && GK.ui.clientToken && GK.supabase && GK.supabase.configured()) {
      S.mode = "live"; S.backend = "supabase"; S.readOnly = true;
      S.loadPublicShare(GK.ui.clientToken).then(finish, function (error) {
        S.publicShare = null; S.authError = error.message; finish();
      });
      return;
    }
    if (GK.supabase && GK.supabase.configured()) {
      S.mode = "live"; S.backend = "supabase"; S.readOnly = true; S.authState = "login";
      GK.supabase.session().then(function (session) {
        if (!session) { finish(); return; }
        return loadWorkspace().then(finish);
      }).catch(function (error) {
        S.authError = error.message; S.authState = "login"; finish();
      });
      return;
    }
    var claude = window.claude && typeof window.claude.use === "function" ? window.claude : null;
    if (!claude) {
      useDemo();
      return finish();
    }
    // Show something quickly if the host is slow; the shared store can still switch us to live.
    var fallback = setTimeout(function () { useDemo(); finish(); }, 4000);
    Promise.all([claude.use("db").catch(function () { return null; }), claude.use("user").catch(function () { return null; })]).then(function (r) {
      db = r[0]; user = r[1];
      S.sharedAvailable = !!db;
      var who = user ? Promise.all([user.id(), user.isOwner(), user.canEdit(), user.can("data.write")]) : Promise.resolve([null, false, false, null]);
      return who.then(function (w) {
        S.viewer = { id: w[0], isOwner: !!w[1], canEdit: !!w[2], canWrite: w[3] };
        if (!db) return null;
        return db.doc("config/app").get().then(function (s) { return s.exists ? s.data() : null; }, function () { return null; });
      });
    }).then(function (shared) {
      clearTimeout(fallback);
      S.sharedLive = !!(shared && shared.live);
      if (S.sharedLive) useSharedLive();
      else if (db && S.viewer.isOwner && S.viewer.canWrite !== false) {
        // First open by the owner: the shared workspace starts for real, no sample step.
        return S.profileNames([S.viewer.id]).then(function (n) { S.startLive(n[S.viewer.id] || ""); if (!finished) finish(); });
      }
      else if (!finished) useDemo();
      if (finished) changed(); else finish();
    }, function () {
      clearTimeout(fallback);
      if (!finished) { useDemo(); finish(); }
    });
  };

  /** User profile names (shared mode). Never stored: resolved for display only. */
  S.profileNames = function (ids) {
    if (!user || !ids.length) return Promise.resolve({});
    return user.profiles(ids).then(function (ps) { var o = {}; ids.forEach(function (id) { o[id] = (ps[id] && ps[id].name) || ""; }); return o; }, function () { return {}; });
  };

  GK.store = S;
})(window.GK);
