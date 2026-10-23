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
    ca_open_day: ["Open {d}", "Ouvrir le {d}"],
    ca_day_none: ["Nothing on this day.", "Rien ce jour-là."], ca_day_add: ["Add a task for this day", "Ajouter une tâche ce jour-là"],
    ca_day_ph: ["What needs doing", "À faire"], ca_add: ["Add", "Ajouter"], ca_added: ["Task added", "Tâche ajoutée"],
    ca_drag_hint: ["Drag an item onto another day to move it.", "Glissez un élément sur un autre jour pour le déplacer."],
    ca_moved: ["Moved to {d}", "Déplacé au {d}"], ca_cant_move: ["This one can't be moved from here.", "Impossible de le déplacer d'ici."],
    ca_new_on: ["New on {d}", "Nouveau le {d}"], ca_n_event: ["Event", "Événement"], ca_n_task: ["Task", "Tâche"], ca_n_shoot: ["Shoot", "Tournage"], ca_n_lead: ["Follow-up", "Relance"], ca_n_project: ["Project", "Projet"],
    ca_f_title: ["Title", "Titre"], ca_f_time: ["Time", "Heure"], ca_f_who: ["Who", "Qui"], ca_f_project: ["Project", "Projet"], ca_f_lead: ["Lead", "Prospect"], ca_f_next: ["What to do", "À faire"],
    ca_ev_ph: ["Client call, location scout…", "Appel client, repérage…"], ca_save: ["Save", "Enregistrer"], ca_saved: ["Saved on {d}", "Enregistré le {d}"],
    ca_no_projects: ["No active project yet.", "Aucun projet actif."], ca_no_leads: ["No open lead yet.", "Aucun prospect ouvert."], ca_new_project_instead: ["New project instead", "Plutôt un nouveau projet"],
    ca_locked: ["waiting on scripts and deposit", "attend scripts et acompte"], ca_t_event: ["Events", "Événements"], ca_1_event: ["Event", "Événement"],
    ca_keys: ["Arrow keys move the day. Enter opens the week.", "Les flèches changent de jour. Entrée ouvre la semaine."]
  });

  var TYPES = ["event", "shoot", "task", "invoice", "delivery", "lead"];
  var ICON = { event: "calendar", shoot: "production", task: "tasks", invoice: "invoice", delivery: "deliveries", lead: "lead" };

  TK.css("gk-calendar-css", [
    ".ca-top{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}",
    ".ca-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}",
    ".ca-nav h2{margin:0 6px;font-size:16px;font-weight:600;white-space:nowrap}",
    ".ca-ib{all:unset;box-sizing:border-box;cursor:pointer;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;border:1px solid var(--line-2,var(--line));background:var(--s2,transparent);color:var(--tx,var(--ink))}",
    ".ca-ib .ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6}",
    ".ca-ib.prev .ic{transform:rotate(180deg)}",
    ".ca-ib:focus-visible,.ca-ev:focus-visible,.ca-dn:focus-visible,.ca-more:focus-visible{outline:2px solid var(--chroma);outline-offset:2px}",
    ".gk-dot.shoot,.ca-ev.shoot{--ca-c:var(--chroma)}.gk-dot.task,.ca-ev.task{--ca-c:var(--tx-3,var(--ink-3))}.gk-dot.invoice,.ca-ev.invoice{--ca-c:var(--gel-deep,var(--gel))}",
    ".gk-dot.event,.ca-ev.event{--ca-c:var(--tx)}.gk-dot.event{background:var(--ca-c)}",
    ".gk-dot.lead,.ca-ev.lead{--ca-c:var(--gel)}.gk-dot.delivery,.ca-ev.delivery{--ca-c:var(--chroma)}",
    ".gk-dot.shoot,.gk-dot.task,.gk-dot.invoice,.gk-dot.lead{background:var(--ca-c)}.gk-dot.delivery{background:transparent;border:2px solid var(--ca-c);box-sizing:border-box}",
    ".ca-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--s1,transparent)}",
    ".ca-wd{font-size:11px;letter-spacing:0;text-transform:none;color:var(--tx-3,var(--ink-3));padding:8px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}",
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


  // ---------- month: one ink card of big numbers on the pink and yellow band ----------
  TK.css("gk-cal2-css", [
    ".c2{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:0;background:linear-gradient(90deg,var(--b-pink) 0 50%,var(--b-yellow) 50% 100%);padding:clamp(16px,4vw,48px);position:relative;overflow:hidden;border:1.5px solid var(--b-ink);border-radius:var(--r-lg)}",
    ".c2-card{background:var(--b-ink);color:var(--b-white);border-radius:var(--r-lg);padding:clamp(16px,3vw,36px) clamp(12px,2.6vw,32px);position:relative;min-width:0;animation:c2in .45s var(--ease) both}",
    ".c2-card.fwd{animation-name:c2fwd}.c2-card.back{animation-name:c2back}",
    "@keyframes c2in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
    "@keyframes c2fwd{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}",
    "@keyframes c2back{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}",
    ".c2-mh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:clamp(10px,2vw,22px)}",
    ".c2-mh b{font-size:clamp(22px,3vw,34px);font-weight:700;letter-spacing:-.03em;line-height:1}",
    ".c2-mh span{font-family:var(--f-type);font-size:11px;letter-spacing:0;text-transform:none;opacity:.7}",
    ".c2-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));position:relative}",
    ".c2-wd{font-family:var(--f-type);font-weight:700;font-size:11px;letter-spacing:0;text-align:center;opacity:.6;padding-bottom:10px}",
    ".c2-row{display:contents}",
    ".c2-d{all:unset;box-sizing:border-box;cursor:pointer;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:clamp(52px,7.4vw,84px);border-top:1px solid rgba(252,250,245,.28);font-size:clamp(18px,2.6vw,32px);font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--b-white);transition:color .25s var(--ease)}",
    ".c2-d.first{border-top:0}",
    ".c2-d.we{color:rgba(252,250,245,.55)}.c2-d.out{color:rgba(252,250,245,.22)}",
    ".c2-d:not(.sel):hover .n{box-shadow:inset 0 -2px 0 currentColor!important}",
    ".c2-d:focus-visible{outline:2px solid var(--b-yellow);outline-offset:-2px}",
    ".c2-d.sel{color:var(--b-ink)}",
    ".c2-d.today:not(.sel) .n{box-shadow:inset 0 -2px 0 var(--b-yellow)!important}",
    ".c2-d .n{line-height:1;padding:0 2px}",
    ".c2-dots{display:flex;gap:3px;height:6px}",
    ".c2-dots i{width:6px;height:6px;border-radius:50%!important;background:var(--b-white)}",
    ".c2-dots i.event{background:var(--b-white);outline:1px solid var(--b-ink)}.c2-dots i.shoot{background:var(--b-pink)}.c2-dots i.task{background:var(--b-yellow)}.c2-dots i.delivery{background:transparent;border:1.5px solid var(--b-pink);box-sizing:border-box}",
    ".c2-d.sel .c2-dots i{background:var(--b-ink)}.c2-d.sel .c2-dots i.delivery{background:transparent;border-color:var(--b-ink)}",
    ".c2-d .n,.c2-dots{position:relative;z-index:2}",
    ".c2-ring{position:absolute;z-index:1;left:0;top:0;width:var(--c2w,48px);height:var(--c2w,48px);border-radius:50%!important;background:var(--b-white);transform:translate(var(--c2x,0),var(--c2y,0));transition:transform .42s cubic-bezier(.3,1.4,.5,1);pointer-events:none}",
    ".c2-d.drop{color:var(--b-ink)}.c2-d.drop::before{content:'';position:absolute;inset:4px;background:var(--b-pink);z-index:-1}",
    ".c2-side{padding:clamp(4px,2vw,20px) 0 0 clamp(16px,3vw,40px);display:flex;flex-direction:column;gap:12px;min-width:0;color:var(--b-ink)}",
    ".c2-big{font-size:clamp(64px,10vw,140px);font-weight:700;letter-spacing:-.05em;line-height:.85}",
    ".c2-wk{font-family:var(--f-type);font-weight:700;font-size:12px;letter-spacing:0;text-transform:none}",
    ".c2-list{display:flex;flex-direction:column;gap:6px}",
    ".c2-it{all:unset;box-sizing:border-box;cursor:grab;display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--b-white);color:var(--b-ink);border:1px solid var(--b-ink);animation:c2it .35s var(--ease) both;min-width:0}",
    ".c2-it:active{cursor:grabbing}.c2-it:hover{transform:translateX(3px)}",
    ".c2-it .ic{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7}",
    ".c2-it .tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".c2-it .ty{font-family:var(--f-type);font-size:10px;letter-spacing:0;text-transform:none;white-space:nowrap}",
    ".c2-it.done .tx{text-decoration:line-through;opacity:.55}.c2-it.late .ty{background:var(--b-ink);color:var(--b-white);padding:2px 4px}",
    "@keyframes c2it{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".c2-add{display:flex;gap:6px}.c2-add input{flex:1;min-width:0;height:40px;padding:0 12px;border:1px solid var(--b-ink);background:var(--b-white);color:var(--b-ink);font:inherit}",
    ".c2-add .btn{height:40px;background:var(--b-ink);color:var(--b-white);border-color:var(--b-ink)}",
    ".c2-new{display:flex;flex-wrap:wrap;gap:6px}.c2-new .btn{background:var(--b-white);color:var(--b-ink);border:1px solid var(--b-ink);animation:c2it .35s var(--ease) both}.c2-new .btn:hover{background:var(--b-ink);color:var(--b-white)}",
    ".c2-hint{font-family:var(--f-type);font-size:11px;letter-spacing:0;opacity:.75;margin:0}",
    ".c2-empty{margin:0;padding:14px 0;font-size:15px}",
    "@media (max-width:640px){.c2-mh span{display:none}}",
    "@media (max-width:860px){.c2{grid-template-columns:minmax(0,1fr);background:linear-gradient(180deg,var(--b-pink) 0 55%,var(--b-yellow) 55% 100%)}.c2-side{padding:20px 0 0}}",
    "@media (prefers-reduced-motion:reduce){.c2-card,.c2-it{animation:none}.c2-ring{transition:none}}"
  ].join("\n"));

  function P() { return ui.p("calendar"); }
  function td() { return u.today(); }
  function money() { var r = TK.role(); return r === "founder" || r === "sales"; }
  function phone() { try { return !!(window.matchMedia && window.matchMedia("(max-width: 640px)").matches); } catch (e) { return false; } }
  function mode() { var m0 = P().mode; return m0 === "month" || m0 === "week" || m0 === "agenda" ? m0 : "month"; }
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
      if (x.kind === "event") return out.push({ date: x.due, type: "event", id: x.id, title: (x.time ? x.time + " · " : "") + x.title, sub: x.who ? m.member(x.who).name : "", done: false, late: false });
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
  function selDay() {
    var a = anchor(), s0 = P().sel;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s0 || "") && s0.slice(0, 7) === a.slice(0, 7)) return s0;
    return td().slice(0, 7) === a.slice(0, 7) ? td() : a.slice(0, 8) + "01";
  }
  function dayPanel(d, evs) {
    var list = evs.filter(function (e) { return e.date === d; });
    var h = '<div class="c2-big">' + (+d.slice(8)) + '</div><div class="c2-wk">' + esc(u.fmtDate(d, { weekday: "long" }) + " · " + u.fmtMonth(d.slice(0, 7))) + "</div>";
    h += list.length ? '<div class="c2-list">' + list.map(function (e, i) {
      var lab = t("ca_1_" + e.type) + ": " + e.title;
      return '<button type="button" class="c2-it ' + e.type + (e.done ? " done" : "") + (e.late ? " late" : "") + '" draggable="true" data-a="ca-open" data-t="' + e.type + '" data-id="' + esc(e.id) + '" aria-label="' + esc(lab) + '" style="animation-delay:' + (i * 50) + 'ms">' +
        ui.icon(ICON[e.type]) + '<span class="tx">' + esc(e.title) + '</span><span class="ty">' + esc(e.late ? t("ca_overdue") : t("ca_1_" + e.type)) + "</span></button>";
    }).join("") + "</div>" + '<p class="c2-hint">' + esc(t("ca_drag_hint")) + "</p>" : '<p class="c2-empty">' + esc(t("ca_day_none")) + "</p>";
    var kinds = newKinds();
    if (kinds.length) h += '<div class="c2-wk" style="margin-top:6px">' + esc(t("ca_new_on", { d: u.fmtDate(d, { day: "numeric", month: "short" }) })) + '</div><div class="c2-new">' + kinds.map(function (k, i) {
      return '<button type="button" class="btn sm" data-a="ca2-new" data-k="' + k + '" style="animation-delay:' + (i * 40) + 'ms">' + ui.icon(k === "project" ? "projects" : ICON[k]) + "<span>" + esc(t("ca_n_" + k)) + "</span></button>";
    }).join("") + "</div>";
    return h;
  }
  function monthView(evs) {
    var a = anchor(), first = a.slice(0, 8) + "01", ym = a.slice(0, 7), sel = selDay(), today = td();
    var start = u.weekStart(first), lastDay = u.addDays(u.month(u.addDays(first, 32)) + "-01", -1), end = u.addDays(u.weekStart(lastDay), 6);
    var map = byDay(evs.filter(function (e) { return e.date >= start && e.date <= end; }));
    var dir = P().dir || "", h = '<section class="c2" id="c2">';
    h += '<div class="c2-card ' + (dir > 0 ? "fwd" : dir < 0 ? "back" : "") + '"><div class="c2-mh"><b>' + esc(u.fmtMonth(ym)) + '</b><span>' + esc(t("ca_keys")) + "</span></div>";
    h += '<div class="c2-g" role="grid" aria-label="' + esc(u.fmtMonth(ym)) + '"><i class="c2-ring" aria-hidden="true"></i>' + weekdays().map(function (w) { return '<div class="c2-wd" role="columnheader">' + esc(w.slice(0, 1)) + "</div>"; }).join("");
    for (var d = start, i = 0; d <= end; d = u.addDays(d, 1), i++) {
      var list = map[d] || [], wd = i % 7, kinds = {};
      list.forEach(function (e) { kinds[e.type] = 1; });
      h += '<button type="button" role="gridcell" class="c2-d' + (i < 7 ? " first" : "") + (wd >= 5 ? " we" : "") + (d.slice(0, 7) !== ym ? " out" : "") + (d === today ? " today" : "") + (d === sel ? " sel" : "") + '" data-a="ca2-sel" data-v="' + d + '" aria-label="' + esc(u.fmtDate(d, { weekday: "long", day: "numeric", month: "long" }) + (list.length ? " · " + itemsLabel(list.length) : "")) + '"' + (d === today ? ' aria-current="date"' : "") + (d === sel ? ' aria-selected="true"' : ' aria-selected="false"') + ' tabindex="' + (d === sel ? 0 : -1) + '">' +
        '<span class="n">' + (+d.slice(8)) + '</span><span class="c2-dots" aria-hidden="true">' + Object.keys(kinds).slice(0, 4).map(function (k) { return '<i class="' + k + '"></i>'; }).join("") + "</span></button>";
    }
    h += "</div></div>";
    h += '<div class="c2-side" id="c2-side" aria-live="polite">' + dayPanel(sel, evs) + "</div></section>";
    P().dir = "";
    return h;
  }
  /** Slide the white circle under the selected day. */
  function placeRing(animate) {
    var g = document.querySelector(".c2-g"), ring = g && g.querySelector(".c2-ring"), cell = g && g.querySelector(".c2-d.sel");
    if (!ring || !cell) { if (ring) ring.style.opacity = "0"; return; }
    var w = Math.min(cell.offsetHeight - 10, cell.offsetWidth - 6);
    if (!animate) ring.style.transition = "none";
    ring.style.setProperty("--c2w", w + "px");
    ring.style.setProperty("--c2x", (cell.offsetLeft + (cell.offsetWidth - w) / 2) + "px");
    ring.style.setProperty("--c2y", (cell.offsetTop + (cell.offsetHeight - w) / 2) + "px");
    ring.style.opacity = "1";
    if (!animate) { void ring.offsetWidth; ring.style.transition = ""; }
  }
  function select(d, focus) {
    var a = anchor();
    if (d.slice(0, 7) !== a.slice(0, 7)) { P().dir = d > a ? 1 : -1; P().sel = d; ui.go("calendar", { d: d.slice(0, 8) + "01", mode: "month", sel: d }); if (focus) setTimeout(function () { var b = document.querySelector('.c2-d[data-v="' + d + '"]'); if (b) b.focus(); }, 0); return; }
    P().sel = d;
    var cells = document.querySelectorAll(".c2-d");
    for (var i = 0; i < cells.length; i++) {
      var on = cells[i].getAttribute("data-v") === d;
      cells[i].classList.toggle("sel", on); cells[i].setAttribute("aria-selected", on ? "true" : "false"); cells[i].tabIndex = on ? 0 : -1;
      if (on && focus) cells[i].focus();
    }
    placeRing(true);
    var side = document.getElementById("c2-side"); if (side) side.innerHTML = dayPanel(d, events());
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
      if (md !== "month") h += insight(everything);
      h += '<div class="ca-top"><div class="ca-nav">' +
        '<button type="button" class="ca-ib prev" data-a="ca-step" data-v="-1" aria-label="' + esc(t("ca_prev")) + '">' + ui.icon("chevron") + "</button>" +
        '<button type="button" class="ca-ib" data-a="ca-step" data-v="1" aria-label="' + esc(t("ca_next")) + '">' + ui.icon("chevron") + "</button>" +
        ui.btn(t("ca_today"), "ca-today", { cls: "sm" }) + '<h2 aria-live="polite">' + esc(title(md)) + "</h2></div>" +
        TK.seg("ca-mode", [["month", t("ca_month")], ["week", t("ca_week")], ["agenda", t("ca_agenda")]], md, t("ca_view")) + "</div>";
      h += TK.chips("ca-type", types().map(function (k) { return { v: k, label: t("ca_t_" + k), on: !o[k], dot: k, n: counts[k] || 0 }; }), t("ca_types"));
      h += md === "month" ? monthView(all) : md === "week" ? weekView(all) : agendaView(all);
      return h;
    },
    after: function () { if (mode() === "month") { placeRing(false); bindMonth(); } },
    count: function () { return ""; }
  });

  // month interactions: keys, drag to move, resize
  var dragged = null;
  function bindMonth() {
    var root = document.getElementById("c2"); if (!root || root._b) return; root._b = 1;
    root.addEventListener("keydown", function (ev) {
      var cell = ev.target.closest && ev.target.closest(".c2-d"); if (!cell) return;
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
      if (step) { ev.preventDefault(); select(u.addDays(cell.getAttribute("data-v"), step), true); }
      else if (ev.key === "Enter" && P().sel === cell.getAttribute("data-v")) { ev.preventDefault(); ui.go("calendar", { d: cell.getAttribute("data-v"), mode: "week" }); }
    });
    root.addEventListener("dragstart", function (ev) { var it = ev.target.closest && ev.target.closest(".c2-it"); if (!it) return; dragged = { t: it.getAttribute("data-t"), id: it.getAttribute("data-id") }; try { ev.dataTransfer.setData("text/plain", dragged.id); ev.dataTransfer.effectAllowed = "move"; } catch (e) {} });
    root.addEventListener("dragover", function (ev) { var c = ev.target.closest && ev.target.closest(".c2-d"); if (!c || !dragged) return; ev.preventDefault(); clearDrop(); c.classList.add("drop"); });
    root.addEventListener("dragleave", function (ev) { var c = ev.target.closest && ev.target.closest(".c2-d"); if (c) c.classList.remove("drop"); });
    root.addEventListener("drop", function (ev) { var c = ev.target.closest && ev.target.closest(".c2-d"); clearDrop(); if (!c || !dragged) return; ev.preventDefault(); move(dragged, c.getAttribute("data-v")); dragged = null; });
    root.addEventListener("dragend", function () { clearDrop(); dragged = null; });
  }
  function clearDrop() { var x = document.querySelectorAll(".c2-d.drop"); for (var i = 0; i < x.length; i++) x[i].classList.remove("drop"); }
  function move(it, d) {
    var ok = false;
    if ((it.t === "task" || it.t === "event") && m.can("tasks")) { S.patch("tasks", it.id, { due: d }); ok = true; }
    else if (it.t === "shoot" && m.can("projects.edit")) { var p = m.project(it.id); if (p && m.canShoot(p)) { S.patch("projects", it.id, { shootDate: d }); ok = true; } }
    else if (it.t === "lead" && money() && m.can("leads")) { S.patch("leads", it.id, { nextDate: d }); ok = true; }
    if (!ok) return ui.toast(t("ca_cant_move"));
    P().sel = d; ui.toast(t("ca_moved", { d: u.fmtDate(d, { weekday: "short", day: "numeric", month: "short" }) })); ui.render(true);
  }
  function newKinds() {
    var k = [];
    if (m.can("tasks")) k.push("event", "task");
    if (m.can("projects.edit")) k.push("shoot");
    if (money() && m.can("leads")) k.push("lead");
    if (m.can("projects.create") && GK.pj) k.push("project");
    return k;
  }
  function teamOpts() { return [["", "—"]].concat(S.all("team").sort(u.by("name")).map(function (x) { return [x.id, x.name]; })); }
  function openNew(k) {
    var d = selDay(), dl = u.fmtDate(d, { weekday: "long", day: "numeric", month: "long" }), me = TK.me(), body = "", foot;
    if (k === "project") return GK.pj.openNew({});
    if (k === "event" || k === "task") {
      body = ui.field({ id: "c2-f-title", label: t("ca_f_title"), placeholder: k === "event" ? t("ca_ev_ph") : t("ca_day_ph") }) + '<div class="form">' +
        (k === "event" ? ui.field({ id: "c2-f-time", label: t("ca_f_time"), type: "time" }) : "") +
        ui.field({ id: "c2-f-who", label: t("ca_f_who"), type: "select", value: me.id || "", options: teamOpts() }) + "</div>";
    } else if (k === "shoot") {
      var ps = S.all("projects").filter(function (p) { return p.stage !== "retention"; }).sort(u.by(function (p) { return m.projectLabel(p); }));
      body = ps.length ? ui.field({ id: "c2-f-proj", label: t("ca_f_project"), type: "select", options: ps.map(function (p) { return [p.id, m.projectLabel(p) + (m.canShoot(p) ? "" : " · " + t("ca_locked"))]; }) }) : '<p style="margin:0">' + esc(t("ca_no_projects")) + "</p>";
      body += '<div class="row"><button type="button" class="link small" data-a="ca2-new" data-k="project">' + esc(t("ca_new_project_instead")) + "</button></div>";
      if (!ps.length) foot = ui.btn(t("cancel"), "close", { cls: "ghost" });
    } else if (k === "lead") {
      var ls = S.all("leads").filter(function (l) { return l.stage !== "won" && l.stage !== "lost"; }).sort(u.by("brand"));
      body = ls.length ? ui.field({ id: "c2-f-lead", label: t("ca_f_lead"), type: "select", options: ls.map(function (l) { return [l.id, l.brand]; }) }) + ui.field({ id: "c2-f-next", label: t("ca_f_next") }) : '<p style="margin:0">' + esc(t("ca_no_leads")) + "</p>";
      if (!ls.length) foot = ui.btn(t("cancel"), "close", { cls: "ghost" });
    }
    ui.modal({ title: t("ca_n_" + k), label: dl, body: body, foot: foot || ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("ca_save"), "ca2-save", { cls: "primary", data: { k: k } }) });
    setTimeout(function () { var f = document.getElementById("c2-f-title") || document.getElementById("c2-f-proj") || document.getElementById("c2-f-lead"); if (f) f.focus(); }, 30);
  }
  function save(k) {
    var d = selDay();
    if (k === "event" || k === "task") {
      if (!m.can("tasks")) return;
      var title = u.val("c2-f-title").trim();
      if (!title) { u.focus("c2-f-title"); return ui.toast(t("required")); }
      var rec = { id: u.uid("t"), projectId: "", title: title.slice(0, 200), who: u.val("c2-f-who"), due: d, done: false, doneOn: "" };
      if (k === "event") { rec.kind = "event"; rec.time = u.val("c2-f-time"); }
      S.put("tasks", rec);
    } else if (k === "shoot") {
      var p = m.project(u.val("c2-f-proj"));
      if (!p || !m.can("projects.edit")) return;
      if (!m.canShoot(p)) return ui.toast(t("gate_shoot"));
      S.patch("projects", p.id, { shootDate: d });
    } else if (k === "lead") {
      var id = u.val("c2-f-lead"); if (!id || !m.can("leads")) return;
      var ch = { nextDate: d }, nx = u.val("c2-f-next").trim(); if (nx) ch.next = nx.slice(0, 200);
      S.patch("leads", id, ch);
    }
    ui.closeModal(true); P().sel = d;
    ui.toast(t("ca_saved", { d: u.fmtDate(d, { weekday: "short", day: "numeric", month: "short" }) })); ui.render(true);
  }
  GK.act("ca2-new", function (el) { var k = el.getAttribute("data-k"); if (k === "project") ui.closeModal(true); openNew(k); });
  GK.act("ca2-save", function (el) { save(el.getAttribute("data-k")); });
  GK.act("ca2-sel", function (el) {
    var d = el.getAttribute("data-v");
    if (P().sel === d && selDay() === d) return ui.go("calendar", { d: d, mode: phone() ? "agenda" : "week" });
    select(d, false);
  });
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (document.getElementById("c2")) placeRing(false); }, 120); });

  function shift(n) {
    var md = mode(), a = anchor();
    if (md === "month") { var x = new Date(a.slice(0, 8) + "15T12:00:00"); x.setMonth(x.getMonth() + n); return u.iso(x).slice(0, 8) + "01"; }
    return u.addDays(a, (md === "week" ? 7 : 30) * n);
  }
  GK.act("ca-step", function (el) { P().dir = +el.getAttribute("data-v"); P().sel = ""; ui.go("calendar", { d: shift(+el.getAttribute("data-v")), mode: mode() }); });
  GK.act("ca-today", function () { P().sel = td(); ui.go("calendar", { d: td(), mode: mode() }); });
  GK.act("ca-mode", function (el) { ui.go("calendar", { mode: el.getAttribute("data-v") }); });
  GK.act("ca-day", function (el) { ui.go("calendar", { d: el.getAttribute("data-v"), mode: phone() ? "agenda" : "week" }); });
  GK.act("ca-type", function (el) {
    var k = el.getAttribute("data-v"), o = Object.assign({}, off());
    o[k] = !o[k];
    ui.go("calendar", { off: o, mode: mode() });
  });
  GK.act("ca-open", function (el) {
    var k = el.getAttribute("data-t"), id = el.getAttribute("data-id"), nav = TK.nav();
    if (k === "task" || k === "event") return ui.go("tasks", { open: id, focusPanel: true });
    if (k === "shoot" || k === "delivery") return ui.go("projects", { id: id });
    if (k === "lead") return ui.go("pipeline", { id: id });
    if (k === "invoice") {
      var inv = S.get("invoices", id);
      if (nav.indexOf("finance") > -1) return ui.go("finance", { tab: "invoices", invoiceId: id });
      if (inv && inv.projectId && m.project(inv.projectId)) return ui.go("projects", { id: inv.projectId });
      return ui.go("clients", { id: inv ? inv.clientId : "", tab: "invoices" });
    }
  });
})(window.GK);
