/* GECKO Ops · data store.
   One in-memory cache, three backends behind it:
     demo   sample data, kept in this browser only (never written to the shared store)
     local  live data in this browser (localStorage), when no shared store is reachable
     shared live data in the page's shared database (claude.ai artifact `db`), seen by the whole team
   A future website swaps "shared" for a hosted backend (see README: Supabase adapter) without touching modules.
   Modules only call: all, get, put, patch, remove, config, setConfig, onChange. */
(function (GK) {
  "use strict";
  var u = GK.u;
  var COLLS = ["team", "clients", "leads", "outreach", "contracts", "projects", "invoices", "tasks", "msgs", "ideas", "boards", "shares", "feedback", "expenses", "quotes"];
  var KEY = { demo: "gecko-ops-v01-demo", live: "gecko-ops-v01-live", mode: "gecko-ops-v01-mode", as: "gecko-ops-v01-as" };
  var LOG_MAX = 30, MSG_WINDOW = 400;

  var cache = {}, cfg = null, listeners = [], db = null, user = null, unsubs = [];
  var inflight = {}, queued = {};
  COLLS.forEach(function (c) { cache[c] = {}; });

  var S = {
    COLLS: COLLS,
    mode: "demo",          // "demo" | "live"
    backend: "local",      // "local" | "shared"
    readOnly: false,
    sharedAvailable: false,
    sharedLive: false,     // the shared store already holds a live workspace
    viewer: { id: null, isOwner: false, canEdit: false, canWrite: null },
    ready: false
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
    if (!saveKey) return;
    var k = saveKey; saveKey = null;
    try { localStorage.setItem(k, JSON.stringify(snapshotLocal())); }
    catch (e) { GK.ui && GK.ui.toast(GK.t("write_failed")); }
  }
  function saveLocal() {
    if (S.backend !== "local") return;
    var k = S.mode === "demo" ? KEY.demo : KEY.live;
    if (saveKey && saveKey !== k) writeLocal();
    saveKey = k; clearTimeout(saveTimer); saveTimer = setTimeout(writeLocal, 150);
  }
  S.flush = writeLocal;
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
    else saveLocal();
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
    var o = u.clone(obj); if (!o.id) o.id = u.uid(coll.slice(0, 1));
    stampLog(o, opts && opts.log);
    cache[coll][o.id] = o; persist(coll, o.id, o); changed(); return o;
  };
  /** Merge top-level fields into a record. */
  S.patch = function (coll, id, partial, opts) {
    if (!guard()) return null;
    var cur = cache[coll][id]; if (!cur) return null;
    var o = u.clone(cur); for (var k in partial) if (Object.prototype.hasOwnProperty.call(partial, k)) o[k] = u.clone(partial[k]);
    stampLog(o, opts && opts.log);
    cache[coll][id] = o; persist(coll, id, o); changed(); return o;
  };
  S.remove = function (coll, id) {
    if (!guard()) return;
    if (!cache[coll][id]) return;
    delete cache[coll][id]; persist(coll, id, null); changed();
  };
  /** Config is admin-only in the shared store (Settings). */
  S.setConfig = function (partial) {
    if (!guard()) return null;
    var o = u.clone(cfg || GK.m.defaultConfig());
    for (var k in partial) if (Object.prototype.hasOwnProperty.call(partial, k)) o[k] = u.clone(partial[k]);
    cfg = o;
    if (S.backend === "shared") sharedWrite("config/app", u.clone(o)); else saveLocal();
    changed(); return o;
  };

  // ---------- who am I ----------
  /** The team member this viewer is. Demo: whoever "Working as" picks. Local live: the founder. Shared: the member claimed by this viewer's id. */
  GK.me = function () {
    var team = S.all("team");
    if (S.mode === "demo") { var as = u.lsGet(KEY.as, null); return S.get("team", as) || team.find(function (m) { return m.role === "founder"; }) || team[0] || null; }
    if (S.backend === "shared") return S.viewer.id ? team.find(function (m) { return m.userId === S.viewer.id; }) || null : null;
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

  // ---------- modes ----------
  function useDemo() {
    writeLocal();
    S.mode = "demo"; S.backend = "local"; S.readOnly = false;
    var saved = u.lsGet(KEY.demo, null);
    if (saved && saved.config && saved.config.version === 1 && saved.config.seedV === 3) loadInto(saved);
    else { loadInto(GK.seed()); saveLocal(); }
  }
  function useLocalLive() {
    writeLocal();
    S.mode = "live"; S.backend = "local"; S.readOnly = false;
    loadInto(u.lsGet(KEY.live, null));
  }
  function useSharedLive() {
    writeLocal();
    S.mode = "live"; S.backend = "shared";
    S.readOnly = S.viewer.canWrite === false;
    subscribeShared();
  }
  function stopShared() { unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = []; }

  S.showDemo = function () { stopShared(); u.lsSet(KEY.mode, "demo"); useDemo(); changed(); };
  S.resetDemo = function () { u.lsDel(KEY.demo); if (S.mode === "demo") { useDemo(); changed(); } };
  /** Back to live data if a live workspace exists (shared first, then this browser). */
  S.hasLive = function () { return S.sharedLive || !!u.lsGet(KEY.live, null); };
  S.showLive = function () {
    u.lsSet(KEY.mode, "live");
    if (S.sharedLive && db) useSharedLive(); else useLocalLive();
    changed();
  };
  /** Create an empty live workspace and make this viewer its founder. */
  S.startLive = function (founderName) {
    writeLocal();
    var conf = GK.m.defaultConfig();
    var name = founderName || "Heni";
    u.lsSet(KEY.mode, "live");
    if (db && S.viewer.canWrite !== false) {
      S.mode = "live"; S.backend = "shared"; S.readOnly = false;
      cfg = conf; S.sharedLive = true;
      sharedWrite("config/app", u.clone(conf));
      var me = { id: "m" + (S.viewer.id || "founder").replace(/[^A-Za-z0-9]/g, "").slice(-16), name: name, role: "founder", userId: S.viewer.id };
      sharedWrite("team/" + me.id, me);
      subscribeShared();
      cache.team[me.id] = me;
    } else {
      S.mode = "live"; S.backend = "local"; S.readOnly = false;
      loadInto({ config: conf, colls: { team: [{ id: "mfounder", name: name, role: "founder" }] } });
      saveLocal();
    }
    changed();
  };

  /** Start up: render from what is known at once, then connect the shared store when the page runs on claude.ai. */
  S.boot = function (done) {
    var pref = u.lsGet(KEY.mode, null);
    var finished = false;
    function finish() { if (finished) return; finished = true; S.ready = true; done(); }
    var claude = window.claude && typeof window.claude.use === "function" ? window.claude : null;
    if (!claude) {
      if (pref === "live" && u.lsGet(KEY.live, null)) useLocalLive(); else useDemo();
      return finish();
    }
    // Show something quickly if the host is slow; the shared store can still switch us to live.
    var fallback = setTimeout(function () { if (pref === "live" && u.lsGet(KEY.live, null)) useLocalLive(); else useDemo(); finish(); }, 4000);
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
      if (S.sharedLive && pref !== "demo") useSharedLive();
      else if (!finished) { if (pref === "live" && u.lsGet(KEY.live, null)) useLocalLive(); else useDemo(); }
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
