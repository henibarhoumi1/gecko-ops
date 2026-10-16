/* GECKO Ops · module: calendar
   Month, week and agenda views (agenda is the default on a phone) of what has a date:
   project shoots, task due dates, invoice due dates (founder and sales), delivery dates when a project carries one
   (deliveryDate / deliverBy, optional), and lead follow-ups (founder and sales).
   Colour by type uses tokens only and is always paired with an icon and a label. Clicking an item opens it. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, TK = GK.tk;

  GK.i18n.add({
    ca_title: ["Calendar", "Calendrier"], ca_accent: ["", ""],
    ca_sub: ["Shoots, due dates and follow-ups in one place. Click anything to open it.", "Tournages, échéances et relances au même endroit. Cliquez pour ouvrir."],
    ca_month: ["Month", "Mois"], ca_week: ["Week", "Semaine"], ca_agenda: ["Agenda", "Agenda"], ca_view: ["View", "Affichage"],
    ca_prev: ["Previous", "Précédent"], ca_next: ["Next", "Suivant"], ca_today: ["Today", "Aujourd'hui"],
    ca_types: ["Show", "Afficher"],
    ca_t_shoot: ["Shoots", "Tournages"], ca_t_task: ["Tasks", "Tâches"], ca_t_invoice: ["Invoices due", "Factures à échéance"],
    ca_t_delivery: ["Deliveries", "Livraisons"], ca_t_lead: ["Follow-ups", "Relances"],
    ca_1_shoot: ["Shoot", "Tournage"], ca_1_task: ["Task", "Tâche"], ca_1_invoice: ["Invoice due", "Facture à échéance"], ca_1_delivery: ["Delivery", "Livraison"], ca_1_lead: ["Follow-up", "Relance"],
    ca_more: ["+{n} more", "+{n} de plus"], ca_n_items: ["{n} items", "{n} éléments"], ca_1_item: ["1 item", "1 élément"],
    ca_week_of: ["Week of {d}", "Semaine du {d}"], ca_from: ["Next 30 days from {d}", "30 jours à partir du {d}"],
    ca_overdue: ["Overdue", "En retard"], ca_nothing: ["Nothing dated in this period.", "Rien de daté sur cette période."],
    ca_k_shoots: ["Shoots, next 7 days", "Tournages, 7 jours"], ca_k_shoots_n: ["next: {d}", "prochain : {d}"], ca_k_none: ["none planned", "aucun prévu"],
    ca_k_tasks: ["Tasks due, next 7 days", "Tâches, 7 jours"], ca_k_tasks_n: ["{n} overdue", "{n} en retard"],
    ca_k_inv: ["Invoices due, next 7 days", "Factures, 7 jours"], ca_k_inv_n: ["{n} invoices · {o} overdue", "{n} factures · {o} en retard"], ca_k_inv_n1: ["1 invoice · {o} overdue", "1 facture · {o} en retard"],
    ca_k_leads: ["Follow-ups, next 7 days", "Relances, 7 jours"], ca_k_leads_n: ["{n} late", "{n} en retard"],
    ca_k_mine: ["My tasks, next 7 days", "Mes tâches, 7 jours"],
    ca_done: ["done", "faite"], ca_paid_left: ["{amt} left", "reste {amt}"],
    ca_open_day: ["Open {d}", "Ouvrir le {d}"]
  });

  var TYPES = ["shoot", "task", "invoice", "delivery", "lead"];
  var ICON = { shoot: "production", task: "tasks", invoice: "invoice", delivery: "deliveries", lead: "lead" };

  TK.css("gk-calendar-css", [
    ".ca-top{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}",
    ".ca-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}",
    ".ca-nav h2{margin:0 6px;font-size:16px;font-weight:600;white-space:nowrap}",
    ".ca-ib{all:unset;box-sizing:border-box;cursor:pointer;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;border:1px solid var(--line-2,var(--line));background:var(--s2,transparent);color:var(--tx,var(--ink))}",
    ".ca-ib .ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6}",
    ".ca-ib.prev .ic{transform:rotate(180deg)}",
    ".ca-ib:focus-visible,.ca-ev:focus-visible,.ca-dn:focus-visible,.ca-more:focus-visible{outline:2px solid var(--chroma);outline-offset:2px}",
    ".gk-dot.shoot,.ca-ev.shoot{--ca-c:var(--chroma)}.gk-dot.task,.ca-ev.task{--ca-c:var(--tx-3,var(--ink-3))}.gk-dot.invoice,.ca-ev.invoice{--ca-c:var(--gel-deep,var(--gel))}",
    ".gk-dot.lead,.ca-ev.lead{--ca-c:var(--gel)}.gk-dot.delivery,.ca-ev.delivery{--ca-c:var(--chroma)}",
    ".gk-dot.shoot,.gk-dot.task,.gk-dot.invoice,.gk-dot.lead{background:var(--ca-c)}.gk-dot.delivery{background:transparent;border:2px solid var(--ca-c);box-sizing:border-box}",
    ".ca-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--s1,transparent)}",
    ".ca-wd{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3,var(--ink-3));padding:8px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}",
    ".ca-cell{min-height:112px;padding:6px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:3px;min-width:0}",
    ".ca-cell.out{background:var(--s2,var(--line-2))}.ca-cell.out .ca-dn{color:var(--tx-3,var(--ink-3))}",
    ".ca-dn{all:unset;cursor:pointer;align-self:flex-start;min-width:26px;height:26px;border-radius:999px;display:grid;place-items:center;font-size:12px;font-variant-numeric:tabular-nums;color:var(--tx-2,var(--ink-2))}",
    ".ca-cell.today .ca-dn,.ca-colh.today .ca-dn{background:var(--chroma);color:var(--bounce,var(--bg));font-weight:600}",
    ".ca-cell.today{box-shadow:inset 0 0 0 2px var(--chroma)}",
    ".ca-ev{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:5px;min-width:0;width:100%;padding:2px 6px 2px 4px;border-radius:6px;border-left:3px solid var(--ca-c);background:var(--s2,var(--line-2));font-size:12px;line-height:1.35;color:var(--tx,var(--ink))}",
    ".ca-ev.delivery{border-left-style:dashed}",
    ".ca-ev:hover{background:var(--s3,var(--line))}",
    ".ca-ev .ic{width:12px;height:12px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;color:var(--tx-3,var(--ink-3))}",
    ".ca-ev .tx{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}",
    ".ca-ev.done .tx{text-decoration:line-through;color:var(--tx-3,var(--ink-3))}",
    ".ca-ev.late .tx{color:var(--gel-deep,var(--ink));font-weight:600}",
    ".ca-more{all:unset;cursor:pointer;font-size:11px;color:var(--chroma);padding:0 4px}",
    ".ca-dots{display:none;gap:3px;flex-wrap:wrap;padding:0 2px}",
    ".ca-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}",
    ".ca-col{display:flex;flex-direction:column;gap:4px;min-width:0;border:1px solid var(--line);border-radius:16px;padding:8px;background:var(--s1,transparent);min-height:200px}",
    ".ca-col.today{border-color:var(--chroma)}",
    ".ca-col .ca-ev{align-items:flex-start}.ca-col .ca-ev .tx{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.ca-col .ca-ev .ic{margin-top:2px}",
    ".ca-colh{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx-2,var(--ink-2));padding-bottom:4px}",
    ".ca-ag .ca-ev{padding:8px 10px;font-size:13px;gap:8px}",
    ".ca-ag .ca-ev .ic{width:16px;height:16px}",
    ".ca-ag .ca-ev .ty{margin-left:auto;font-size:11px;color:var(--tx-3,var(--ink-3));white-space:nowrap;padding-left:8px}",
    ".ca-ag-day{display:flex;flex-direction:column;gap:4px}",
    ".ca-ag-day.today .gk-daylab{color:var(--chroma)}",
    "@media (max-width:860px){.ca-week{grid-template-columns:minmax(0,1fr)}.ca-col{min-height:0}.ca-ag .ca-ev{flex-wrap:wrap}.ca-ag .ca-ev .tx{white-space:normal;flex:1 1 60%}}",
    "@media (max-width:640px){.ca-cell{min-height:58px;padding:3px;align-items:center}.ca-cell .ca-ev,.ca-cell .ca-more{display:none}.ca-dots{display:flex;justify-content:center}.ca-wd{padding:6px 2px;text-align:center;font-size:10px}}"
  ].join("\n"));

  function P() { return ui.p("calendar"); }
  function td() { return u.today(); }
  function money() { var r = TK.role(); return r === "founder" || r === "sales"; }
  function phone() { try { return !!(window.matchMedia && window.matchMedia("(max-width: 640px)").matches); } catch (e) { return false; } }
  function mode() { var m0 = P().mode; return m0 === "month" || m0 === "week" || m0 === "agenda" ? m0 : (phone() ? "agenda" : "month"); }
  function anchor() { var d = P().d; return /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d : td(); }
  function off() { return P().off || {}; }
  function allowed(type) { return (type !== "invoice" && type !== "lead") || money(); }
  function hasDelivery() { return S.all("projects").some(function (p) { return /^\d{4}-\d{2}-\d{2}/.test(p.deliveryDate || p.deliverBy || ""); }); }
  function types() { return TYPES.filter(function (k) { return allowed(k) && (k !== "delivery" || hasDelivery()); }); }

  /** Every dated item the viewer may see: {date, type, id, title, sub, done, late} */
  function events(ignoreFilter) {
    var out = [], today = td();
    S.all("projects").forEach(function (p) {
      if (p.shootDate) out.push({ date: p.shootDate, type: "shoot", id: p.id, title: m.brand(p.clientId) + " · " + p.name, sub: m.pack(p.pack).name, done: p.stage === "retention", late: false });
      var dd = p.deliveryDate || p.deliverBy || "";
      if (/^\d{4}-\d{2}-\d{2}/.test(dd)) out.push({ date: dd.slice(0, 10), type: "delivery", id: p.id, title: m.brand(p.clientId) + " · " + p.name, sub: t("st_" + p.stage), done: m.STAGES.indexOf(p.stage) >= m.STAGES.indexOf("delivered"), late: false });
    });
    S.all("tasks").forEach(function (x) {
      if (!x.due) return;
      var p = x.projectId ? m.project(x.projectId) : null;
      out.push({ date: x.due, type: "task", id: x.id, title: x.title, sub: (x.who ? m.member(x.who).name : "") + (p ? " · " + m.projectLabel(p) : ""), done: !!x.done, late: !x.done && x.due < today });
    });
    if (money()) {
      S.all("invoices").forEach(function (i) {
        if (!i.no || !i.due || i.kind === "credit" || i.credited) return;
        var st = m.invStatus(i);
        out.push({ date: i.due, type: "invoice", id: i.id, title: i.no + " · " + m.brand(i.clientId), sub: st === "paid" ? t("inv_paid") : t("ca_paid_left", { amt: u.money(m.invBalance(i)) }), done: st === "paid", late: st === "overdue" });
      });
      S.all("leads").forEach(function (l) {
        if (!l.nextDate || l.stage === "won" || l.stage === "lost") return;
        out.push({ date: l.nextDate, type: "lead", id: l.id, title: l.brand, sub: l.next || t("ls_" + l.stage), done: false, late: l.nextDate < today });
      });
    }
    var o = ignoreFilter ? {} : off();
    return out.filter(function (e) { return !o[e.type]; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || String(a.title).localeCompare(String(b.title)); });
  }
  function byDay(list) { var o = {}; list.forEach(function (e) { (o[e.date] = o[e.date] || []).push(e); }); return o; }

  function ev(e, withType) {
    var lab = t("ca_1_" + e.type) + ": " + e.title + (e.sub ? " · " + e.sub : "") + " · " + u.fmtDate(e.date, { weekday: "long", day: "numeric", month: "long" });
    return '<button type="button" class="ca-ev ' + e.type + (e.done ? " done" : "") + (e.late ? " late" : "") + '" data-a="ca-open" data-t="' + e.type + '" data-id="' + esc(e.id) + '" title="' + esc(lab) + '" aria-label="' + esc(lab) + '">' +
      ui.icon(ICON[e.type]) + '<span class="tx">' + esc(e.title) + (withType && e.sub ? ' <span class="muted small">· ' + esc(e.sub) + "</span>" : "") + "</span>" +
      (withType ? '<span class="ty">' + esc(t("ca_1_" + e.type)) + (e.done ? " · " + esc(t("ca_done")) : "") + "</span>" : "") + "</button>";
  }
  function weekdays() {
    var out = []; for (var i = 0; i < 7; i++) out.push(u.fmtDate(u.addDays("2024-01-01", i), { weekday: "short" }));
    return out;
  }
  function itemsLabel(n) { return n === 1 ? t("ca_1_item") : t("ca_n_items", { n: n }); }

  // ---------- views ----------
  function monthView(evs) {
    var a = anchor(), first = a.slice(0, 8) + "01", ym = a.slice(0, 7);
    var start = u.weekStart(first), lastDay = u.addDays(u.month(u.addDays(first, 32)) + "-01", -1), end = u.addDays(u.weekStart(lastDay), 6);
    var map = byDay(evs.filter(function (e) { return e.date >= start && e.date <= end; })), today = td();
    var h = '<div class="ca-grid" role="grid" aria-label="' + esc(u.fmtMonth(ym)) + '"><div role="row" style="display:contents">' + weekdays().map(function (w) { return '<div class="ca-wd" role="columnheader">' + esc(w) + "</div>"; }).join("") + "</div>";
    for (var d = start, i = 0; d <= end; d = u.addDays(d, 1), i++) {
      if (i % 7 === 0) h += (i ? "</div>" : "") + '<div role="row" style="display:contents">';
      var list = map[d] || [], shown = list.slice(0, 3);
      var dl = u.fmtDate(d, { weekday: "long", day: "numeric", month: "long" });
      h += '<div class="ca-cell' + (d.slice(0, 7) !== ym ? " out" : "") + (d === today ? " today" : "") + '" role="gridcell">' +
        '<button type="button" class="ca-dn" data-a="ca-day" data-v="' + d + '" aria-label="' + esc(dl + (list.length ? " · " + itemsLabel(list.length) : "")) + '"' + (d === today ? ' aria-current="date"' : "") + ">" + (+d.slice(8)) + "</button>" +
        shown.map(function (e) { return ev(e); }).join("") +
        (list.length > shown.length ? '<button type="button" class="ca-more" data-a="ca-day" data-v="' + d + '">' + esc(t("ca_more", { n: list.length - shown.length })) + "</button>" : "") +
        (list.length ? '<span class="ca-dots" aria-hidden="true">' + list.slice(0, 4).map(function (e) { return '<i class="gk-dot ' + e.type + '"></i>'; }).join("") + "</span>" : "") +
        "</div>";
    }
    return h + "</div></div>";
  }
  function weekView(evs) {
    var start = u.weekStart(anchor()), map = byDay(evs), today = td(), h = '<div class="ca-week">';
    for (var i = 0; i < 7; i++) {
      var d = u.addDays(start, i), list = map[d] || [];
      h += '<section class="ca-col' + (d === today ? " today" : "") + '" aria-label="' + esc(u.fmtDate(d, { weekday: "long", day: "numeric", month: "long" })) + '">' +
        '<div class="ca-colh' + (d === today ? " today" : "") + '"><span class="ca-dn" aria-hidden="true">' + (+d.slice(8)) + "</span>" + esc(u.fmtDate(d, { weekday: "long" })) + "</div>" +
        (list.length ? list.map(function (e) { return ev(e); }).join("") : '<span class="small muted">—</span>') + "</section>";
    }
    return h + "</div>";
  }
  function agendaView(evs) {
    var a = anchor(), end = u.addDays(a, 29), today = td();
    var late = a <= today ? evs.filter(function (e) { return e.late && e.date < a; }) : [];
    var map = byDay(evs.filter(function (e) { return e.date >= a && e.date <= end; }));
    var days = Object.keys(map).sort();
    var h = '<section class="panel ca-ag" style="gap:0">';
    if (late.length) h += '<div class="ca-ag-day"><div class="gk-daylab"><span>' + esc(t("ca_overdue")) + "</span><span>" + late.length + "</span></div>" + late.map(function (e) { return ev(e, true); }).join("") + "</div>";
    if (!days.length && !late.length) h += ui.empty(t("ca_nothing"));
    days.forEach(function (d) {
      h += '<div class="ca-ag-day' + (d === today ? " today" : "") + '"><div class="gk-daylab"><span>' + esc(TK.dayLabel(d)) + "</span><span>" + map[d].length + "</span></div>" + map[d].map(function (e) { return ev(e, true); }).join("") + "</div>";
    });
    return h + "</section>";
  }

  function insight(all) {
    var today = td(), wk = u.addDays(today, 7), my = TK.me();
    function within(e) { return e.date >= today && e.date <= wk; }
    var shoots = all.filter(function (e) { return e.type === "shoot" && within(e); });
    var items = [{ label: t("ca_k_shoots"), value: shoots.length, note: shoots.length ? t("ca_k_shoots_n", { d: TK.dayLabel(shoots[0].date) }) : t("ca_k_none") }];
    var tasks = S.all("tasks").filter(function (x) { return !x.done && x.due; });
    if (money()) {
      items.push({ label: t("ca_k_tasks"), value: tasks.filter(function (x) { return x.due >= today && x.due <= wk; }).length, note: t("ca_k_tasks_n", { n: tasks.filter(function (x) { return x.due < today; }).length }) });
      var inv = S.all("invoices").filter(function (i) { return i.no && i.due && i.due <= wk && ["issued", "partial", "overdue"].indexOf(m.invStatus(i)) > -1; });
      var od = inv.filter(function (i) { return m.invStatus(i) === "overdue"; }).length;
      items.push({ label: t("ca_k_inv"), value: u.money(u.sum(inv, m.invBalance)), note: t(inv.length === 1 ? "ca_k_inv_n1" : "ca_k_inv_n", { n: inv.length, o: od }) });
      var leads = S.all("leads").filter(function (l) { return l.nextDate && l.nextDate <= wk && l.stage !== "won" && l.stage !== "lost"; });
      items.push({ label: t("ca_k_leads"), value: leads.filter(function (l) { return l.nextDate >= today; }).length, note: t("ca_k_leads_n", { n: leads.filter(function (l) { return l.nextDate < today; }).length }) });
    } else {
      var mine = tasks.filter(function (x) { return x.who === my.id; });
      items.push({ label: t("ca_k_mine"), value: mine.filter(function (x) { return x.due >= today && x.due <= wk; }).length, note: t("ca_k_tasks_n", { n: mine.filter(function (x) { return x.due < today; }).length }) });
      items.push({ label: t("ca_k_tasks"), value: tasks.filter(function (x) { return x.due >= today && x.due <= wk; }).length, note: t("ca_k_tasks_n", { n: tasks.filter(function (x) { return x.due < today; }).length }) });
    }
    return TK.kpis(items);
  }

  function title(md) {
    var a = anchor();
    if (md === "month") return u.fmtMonth(a.slice(0, 7));
    if (md === "week") return t("ca_week_of", { d: u.fmtDate(u.weekStart(a), { day: "numeric", month: "long" }) });
    return t("ca_from", { d: u.fmtDate(a, { day: "numeric", month: "long" }) });
  }

  GK.view("calendar", {
    render: function () {
      var md = mode(), all = events(), o = off();
      // counts per type in the visible period (ignoring the type filter) for the chips
      var everything = events(true);
      var a = anchor(), from, to;
      if (md === "month") { from = u.weekStart(a.slice(0, 8) + "01"); to = u.addDays(from, 41); }
      else if (md === "week") { from = u.weekStart(a); to = u.addDays(from, 6); }
      else { from = a; to = u.addDays(a, 29); }
      var counts = {}; everything.forEach(function (e) { if (e.date >= from && e.date <= to) counts[e.type] = (counts[e.type] || 0) + 1; });
      var h = ui.head({ label: t("nav_calendar"), title: t("ca_title"), accent: t("ca_accent"), sub: esc(t("ca_sub")), actions: ui.sample() });
      h += insight(everything);
      h += '<div class="ca-top"><div class="ca-nav">' +
        '<button type="button" class="ca-ib prev" data-a="ca-step" data-v="-1" aria-label="' + esc(t("ca_prev")) + '">' + ui.icon("chevron") + "</button>" +
        '<button type="button" class="ca-ib" data-a="ca-step" data-v="1" aria-label="' + esc(t("ca_next")) + '">' + ui.icon("chevron") + "</button>" +
        ui.btn(t("ca_today"), "ca-today", { cls: "sm" }) + '<h2 aria-live="polite">' + esc(title(md)) + "</h2></div>" +
        TK.seg("ca-mode", [["month", t("ca_month")], ["week", t("ca_week")], ["agenda", t("ca_agenda")]], md, t("ca_view")) + "</div>";
      h += TK.chips("ca-type", types().map(function (k) { return { v: k, label: t("ca_t_" + k), on: !o[k], dot: k, n: counts[k] || 0 }; }), t("ca_types"));
      h += md === "month" ? monthView(all) : md === "week" ? weekView(all) : agendaView(all);
      return h;
    },
    count: function () { return ""; }
  });

  function shift(n) {
    var md = mode(), a = anchor();
    if (md === "month") { var x = new Date(a.slice(0, 8) + "15T12:00:00"); x.setMonth(x.getMonth() + n); return u.iso(x).slice(0, 8) + "01"; }
    return u.addDays(a, (md === "week" ? 7 : 30) * n);
  }
  GK.act("ca-step", function (el) { ui.go("calendar", { d: shift(+el.getAttribute("data-v")), mode: mode() }); });
  GK.act("ca-today", function () { ui.go("calendar", { d: td(), mode: mode() }); });
  GK.act("ca-mode", function (el) { ui.go("calendar", { mode: el.getAttribute("data-v") }); });
  GK.act("ca-day", function (el) { ui.go("calendar", { d: el.getAttribute("data-v"), mode: phone() ? "agenda" : "week" }); });
  GK.act("ca-type", function (el) {
    var k = el.getAttribute("data-v"), o = Object.assign({}, off());
    o[k] = !o[k];
    ui.go("calendar", { off: o, mode: mode() });
  });
  GK.act("ca-open", function (el) {
    var k = el.getAttribute("data-t"), id = el.getAttribute("data-id"), nav = TK.nav();
    if (k === "task") return ui.go("tasks", { open: id, focusPanel: true });
    if (k === "shoot" || k === "delivery") return ui.go("projects", { id: id });
    if (k === "lead") return ui.go("pipeline", { id: id });
    if (k === "invoice") {
      var inv = S.get("invoices", id);
      if (nav.indexOf("finance") > -1) return ui.go("finance", { tab: "invoices", invoiceId: id });
      if (inv && inv.projectId && m.project(inv.projectId)) return ui.go("projects", { id: inv.projectId });
      return ui.go("clients", { id: inv ? inv.clientId : "" });
    }
  });
})(window.GK);
