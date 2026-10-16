/* GECKO Ops · portal: the client-safe snapshot. A client page renders ONLY from what this builds.
   Never include costs, profit, commission, payout, internal notes, logs, payments, other clients or team names. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, m = GK.m, S = GK.store;
  var P = GK.portal = GK.portal || {};
  var SI = function (s) { return m.STAGES.indexOf(s); };
  var UNPAID = ["issued", "partial", "overdue"];

  function first(s) { return String(s || "").trim().split(/\s+/)[0] || ""; }
  function link(l) { return /^https?:\/\//i.test(l || "") ? l : ""; }
  function round2(n) { return Math.round((+n || 0) * 100) / 100; }

  /** Random token: 10 lowercase letters + digits, no punctuation, not already used. */
  P.newToken = function () {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789", tok;
    do {
      tok = "";
      var buf = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(10)) : null;
      for (var i = 0; i < 10; i++) tok += chars[(buf ? buf[i] : Math.floor(Math.random() * 256)) % chars.length];
    } while (S.get("shares", tok));
    return tok;
  };
  P.linkFor = function (token) {
    var base = String(m.company().appUrl || "").replace(/#.*$/, "");
    var shareToken = S.backend === "supabase" ? S.shareToken(token) : token;
    return shareToken ? base + "#cl-" + shareToken : "";
  };

  /** Projects a share covers: one project, or all of the client's current ones (the latest closed one if none is running). */
  P.scope = function (share) {
    var all = S.all("projects").filter(function (p) { return p.clientId === share.clientId; });
    if (share.projectId) return all.filter(function (p) { return p.id === share.projectId; });
    var cur = all.filter(function (p) { return p.stage !== "retention"; }).sort(u.by(function (p) { return SI(p.stage); }));
    if (cur.length) return cur;
    return all.sort(u.by(function (p) { return p.shootDate || ""; }, "desc")).slice(0, 1);
  };
  function ideaOfReel(r) { return S.all("ideas").filter(function (i) { return i.reelId && i.reelId === r.id; })[0] || null; }
  /** What could be shown as a script: reels with a script (idea shared, or no idea at all) and shared ideas not yet in a reel. */
  P.scriptCandidates = function (share) {
    var ps = P.scope(share), ids = ps.map(function (p) { return p.id; }), out = [];
    ps.forEach(function (p) {
      (p.reels || []).forEach(function (r, ri) {
        var idea = ideaOfReel(r), txt = r.script || (idea && idea.script) || "";
        if (!txt) return;
        if (idea && !idea.shareOk) return;
        var a = (p.angles || []).filter(function (x) { return x.id === r.angleId; })[0];
        out.push({ key: "reel:" + r.id, label: (a ? a.name : "—") + " · " + (r.mode === "I" ? t("po_indirect") : t("po_direct")) + (r.hooks && r.hooks[0] ? " · " + r.hooks[0].text : ""), project: p.name });
      });
    });
    S.all("ideas").forEach(function (i) {
      if (!i.shareOk || i.reelId || ids.indexOf(i.projectId) < 0) return;
      out.push({ key: "idea:" + i.id, label: i.title || i.hook || "—", project: (m.project(i.projectId) || {}).name || "" });
    });
    return out;
  };
  function scriptOn(share, key) {
    var ids = share.scriptIds;
    return !Array.isArray(ids) ? true : ids.indexOf(key) > -1;
  }

  function hasResults(p) { return m.files(p).some(function (f) { var r = f.item.results; return f.kind === "hook" && r && (r.cpp != null && r.cpp !== "" || r.hook != null && r.hook !== ""); }); }
  function needsOf(p) {
    var out = [], si = SI(p.stage);
    function add(kind, extra) {
      var o = Object.assign({ kind: kind, project: p.name }, extra || {});
      var key = { plan: "po_need_plan", deposit: "po_need_deposit", balance: "po_need_balance", month: "po_need_month", invoice: "po_need_invoice", product: "po_need_product", results: "po_need_results" }[kind];
      var amt = o.amount != null ? u.money(o.amount, o.amount % 1 ? 2 : 0) : "";
      o.text = t(key, { name: p.name, amt: amt, no: o.no || "", date: o.date ? u.fmtDate(o.date, { weekday: "long", day: "numeric", month: "long" }) : "" }).replace(/\.\./g, ".");
      out.push(o);
    }
    if (si <= SI("plan") && !p.planApproved) add("plan");
    m.invoicesOf(p).filter(function (i) { return i.no && UNPAID.indexOf(m.invStatus(i)) > -1; }).sort(u.by("issued")).forEach(function (i) {
      add({ deposit: 1, balance: 1, month: 1 }[i.kind] ? i.kind : "invoice", { no: i.no, amount: round2(m.invBalance(i)), due: i.due || "", late: m.invStatus(i) === "overdue" });
    });
    if (si <= SI("shoot") && p.shootDate && p.shootDate >= u.today()) add("product", { date: p.shootDate });
    if (p.stage === "delivered" && !hasResults(p)) add("results");
    return out;
  }
  function timelineOf(p) {
    var si = SI(p.stage), inv = m.invoicesOf(p).filter(function (i) { return i.no; });
    function paidDate(kinds) {
      var ds = [];
      inv.forEach(function (i) { if (kinds.indexOf(i.kind) > -1 && m.invIsPaid(i)) (i.payments || []).forEach(function (x) { ds.push(x.date); }); });
      return ds.sort().pop() || "";
    }
    var monthly = m.pack(p.pack).monthly;
    var up = paidDate(monthly ? ["month"] : ["deposit"]), bal = monthly ? "" : paidDate(["balance"]);
    var tl = [
      { key: "kickoff", label: t("cm_tl_kickoff"), date: "", done: si > 0 },
      { key: "plan", label: t("cm_tl_plan"), date: p.planApprovedOn || "", done: !!p.planApproved },
      { key: "upfront", label: t(monthly ? "cm_tl_month" : "cm_tl_deposit"), date: up, done: !!up },
      { key: "shoot", label: t("cm_tl_shoot"), date: p.shootDate || "", done: si > SI("shoot") },
      { key: "edit", label: t("cm_tl_edit"), date: "", done: si > SI("edit") }
    ];
    if (!monthly) tl.push({ key: "balance", label: t("cm_tl_balance"), date: bal, done: !!bal });
    tl.push({ key: "delivered", label: t("cm_tl_delivered"), date: "", done: si >= SI("delivered") });
    tl.push({ key: "testing", label: t("cm_tl_testing"), date: "", done: si > SI("testing") });
    tl.push({ key: "report", label: t("cm_tl_report"), date: "", done: si >= SI("done") });
    return tl;
  }

  /** The snapshot. `share` supplies clientId, projectId, sections, boardIds, scriptIds. */
  P.buildSnapshot = function (share) {
    var c = m.client(share.clientId); if (!c) return null;
    var co = m.company(), sec = share.sections || {};
    var ps = P.scope(share), unlocked;
    var snap = {
      v: 2,
      brand: { name: c.brand },
      contact: { name: first(c.contact) },
      company: { name: co.name, phone: co.phone, email: co.email, instagram: co.instagram },
      lang: GK.i18n.lang(),
      title: share.title || "",
      sections: { plan: !!sec.plan, scripts: !!sec.scripts, files: !!sec.files, timeline: !!sec.timeline, invoices: !!sec.invoices, boards: !!sec.boards },
      projects: [], invoices: [], boards: []
    };
    ps.forEach(function (p) {
      var pk = m.pack(p.pack);
      unlocked = m.canFiles(p);
      var o = {
        id: p.id, name: p.name, pack: pk.name, monthly: !!pk.monthly, stage: p.stage, stageIdx: SI(p.stage), shootDate: p.shootDate || "",
        planApproved: !!p.planApproved, planApprovedOn: p.planApprovedOn || "", unlocked: unlocked,
        progress: { done: m.progress(p).done, total: m.progress(p).total },
        angles: [], reels: [], carousels: [], ideas: [], needs: needsOf(p), timeline: sec.timeline ? timelineOf(p) : []
      };
      var angleName = function (id) { var a = (p.angles || []).filter(function (x) { return x.id === id; })[0]; return a ? a.name : ""; };
      if (sec.plan || sec.scripts || sec.files) {
        o.angles = (p.angles || []).map(function (a) { return { name: a.name, why: a.why || "" }; });
      }
      if (sec.plan || sec.scripts || sec.files) {
        (p.reels || []).forEach(function (r) {
          var idea = ideaOfReel(r), txt = r.script || (idea && idea.script) || "";
          var shared = !!txt && !(idea && !idea.shareOk) && scriptOn(share, "reel:" + r.id);
          var files = m.files(p).filter(function (f) { return f.reel && f.reel.id === r.id; });
          var rr = {
            id: r.id, angle: angleName(r.angleId), mode: r.mode === "I" ? "Indirect" : "Direct",
            hooks: (r.hooks || []).map(function (h) { return { text: h.text, status: h.status || "todo" }; })
          };
          if (sec.scripts && shared) { rr.script = txt; if (idea) rr.ideaId = idea.id; }
          if (sec.files) rr.files = files.map(function (f) { return {
            code: f.code, key: f.key, reelId: r.id, version: +f.item.v || 1,
            revisionId: f.item.sourceRevisionId || r.creativeRevisionId || "",
            status: f.item.status || "todo", drive: unlocked ? link(f.item.drive || r.drive) : "", clientOk: !!f.item.clientOk
          }; });
          o.reels.push(rr);
        });
        (p.carousels || []).forEach(function (cr) {
          var f = m.files(p).filter(function (x) { return x.item === cr; })[0];
          o.carousels.push({ id: cr.id, angle: angleName(cr.angleId), title: cr.title || "", status: cr.status || "todo", code: f ? f.code : "", drive: unlocked && sec.files ? link(cr.drive) : "", clientOk: !!cr.clientOk });
        });
      }
      if (sec.scripts) {
        S.all("ideas").forEach(function (i) {
          if (!i.shareOk || i.reelId || i.projectId !== p.id || !scriptOn(share, "idea:" + i.id)) return;
          o.ideas.push({ id: i.id, title: i.title || "", hook: i.hook || "", concept: i.concept || "", script: i.script || "", mode: i.mode === "I" ? "Indirect" : "Direct" });
        });
      }
      snap.projects.push(o);
    });
    var pids = ps.map(function (p) { return p.id; });
    if (sec.invoices) {
      S.all("invoices").filter(function (i) { return i.no && pids.indexOf(i.projectId) > -1; }).sort(u.by("issued", "desc")).forEach(function (i) {
        var st = m.invStatus(i);
        snap.invoices.push({ no: i.no, label: i.label || "", project: i.projectId, kind: i.kind, amount: round2(i.amount), total: round2(m.invTotal(i)), status: st, issued: i.issued || "", due: i.due || "", balance: st === "credited" || st === "credit" ? 0 : round2(m.invBalance(i)) });
      });
    }
    if (sec.boards && typeof GK.boardSVG === "function") {
      (share.boardIds || []).forEach(function (id) {
        var b = S.get("boards", id);
        if (!b || b.clientId !== share.clientId) return;
        var svg = ""; try { svg = String(GK.boardSVG(b) || ""); } catch (e) {}
        if (svg && svg.length < 150000) snap.boards.push({ title: b.title || "", svg: svg });
      });
    }
    return snap;
  };

  P.feedbackTargets = function (snapshot) {
    var targets = { other: ["comment", "approve", "changes"] };
    if (snapshot.sections && snapshot.sections.plan) targets.plan = ["approve", "changes"];
    if (snapshot.sections && (snapshot.sections.scripts || snapshot.sections.files)) (snapshot.projects || []).forEach(function (project) {
      (project.reels || []).forEach(function (reel) {
        if (snapshot.sections.files && reel.id) targets["reel:" + reel.id] = ["approve", "changes"];
        if (snapshot.sections.scripts && reel.id) targets[(reel.ideaId ? "idea:" + reel.ideaId : "reel:" + reel.id)] = ["approve", "changes"];
      });
      if (snapshot.sections.scripts) (project.ideas || []).forEach(function (idea) {
        if (idea.id) targets["idea:" + idea.id] = ["approve", "changes"];
      });
    });
    return targets;
  };

  /** Check a snapshot for anything that must never reach a client. Returns a list of hits (empty = clean). */
  var BAD_WORDS = /cost|profit|commission|payout|withheld|mohamed/i;
  var BAD_KEYS = /^(costs?|profit|commission|payout|notes?|log|payments|withheld|mohamed|owner|salary|rate|rates)$/i;
  P.check = function (snap) {
    var hits = [];
    (function walk(v, path) {
      if (v == null) return;
      if (typeof v === "string") { if (BAD_WORDS.test(v)) hits.push(path + ' contains "' + (BAD_WORDS.exec(v) || [""])[0] + '"'); return; }
      if (typeof v !== "object") return;
      if (Array.isArray(v)) { v.forEach(function (x, i) { walk(x, path + "[" + i + "]"); }); return; }
      Object.keys(v).forEach(function (k) {
        if (BAD_KEYS.test(k) || BAD_WORDS.test(k)) hits.push(path + "." + k + " (field)");
        walk(v[k], path + "." + k);
      });
    })(snap, "snapshot");
    return hits;
  };
  /** Build a snapshot for every client in the current data and check them all. Returns {count, hits}. */
  P.selfTest = function () {
    var hits = [], n = 0;
    S.all("clients").forEach(function (c) {
      var share = { clientId: c.id, projectId: "", sections: { plan: 1, scripts: 1, files: 1, timeline: 1, invoices: 1, boards: 1 }, boardIds: S.all("boards").filter(function (b) { return b.clientId === c.id; }).map(function (b) { return b.id; }) };
      var s = P.buildSnapshot(share); if (!s) return;
      n++; P.check(s).forEach(function (h) { hits.push(c.brand + ": " + h); });
    });
    return { count: n, hits: hits };
  };
})(window.GK);
