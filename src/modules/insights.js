/* GECKO Ops · insight strips (V03, DESIGN section 5). Each main view starts with 3 or 4 KPI tiles plus at most one decision card.
   Every number is computed from the store (GK.x helpers in core/metrics.js). Tiles a role cannot see are left out, never shown as zero.
   The views call GK.insight.<view>() right under their page header; each returns "" when there is nothing the viewer may see. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, X = GK.x;

  GK.i18n.add({
    ins_label: ["Insights", "Repères"], ins_pts: ["pts", "pts"], ins_days: ["{n} days", "{n} jours"], ins_day_1: ["1 day", "1 jour"],
    ins_vs30: ["vs 30 days ago", "vs il y a 30 jours"], ins_vs90: ["vs the 90 days before", "vs les 90 jours d'avant"], ins_vs_before: ["vs {v} before", "vs {v} avant"],
    ins_vs_week: ["vs last week", "vs la semaine dernière"], ins_vs_12: ["12 months, vs the 12 before", "12 mois, vs les 12 d'avant"], ins_vs_last_m: ["vs last month", "vs mois dernier"],
    ins_target: ["target {v}", "objectif {v}"], ins_new_90: ["new in 90 days", "nouveaux en 90 jours"],
    // pipeline
    ins_pl_w: ["Weighted pipeline", "Prospection pondérée"], ins_pl_w_of: ["of {a} if every lead signs", "sur {a} si tout signe"],
    ins_pl_win: ["Win rate, 90 days", "Taux de signature, 90 jours"], ins_pl_win_n: ["{w} won, {l} lost", "{w} gagné(s), {l} perdu(s)"], ins_pl_win_none: ["Nothing closed in 90 days", "Rien de clos en 90 jours"],
    ins_pl_cycle: ["Days, lead to close", "Jours, du prospect à la signature"], ins_pl_cycle_all: ["days on average, all {n} wins so far", "jours en moyenne, les {n} signatures"], ins_pl_cycle_d: ["days on average, {n} won in 180 days", "jours en moyenne, {n} signé(s) en 180 jours"], ins_pl_cycle_none: ["No lead won yet", "Aucune signature pour l'instant"],
    ins_pl_cold: ["Leads going cold", "Prospects qui refroidissent"], ins_pl_cold_n: ["of {o} open · target 0", "sur {o} en cours · objectif 0"],
    ins_pl_dec_t: ["{brand} is going cold", "{brand} refroidit"],
    ins_pl_dec_w1: ["{pack} at {price}, at the {stage} stage. Follow-up was due {d}, {n} days ago.", "{pack} à {price}, à l'étape {stage}. La relance était due le {d}, il y a {n} jours."],
    ins_pl_dec_w2: ["{pack} at {price}, at the {stage} stage. Nothing has moved for {n} days and no next date is set.", "{pack} à {price}, à l'étape {stage}. Rien n'a bougé depuis {n} jours et aucune date n'est fixée."],
    ins_pl_dec_r: ["Send the follow-up today and set a date; no answer in a week, log it as lost with the reason.", "Envoyez la relance aujourd'hui et fixez une date ; sans réponse sous une semaine, passez-le en perdu avec la raison."],
    ins_open_lead: ["Open lead", "Voir le prospect"],
    // clients
    ins_cl_active: ["Active clients", "Clients actifs"], ins_cl_active_of: ["of {n} on file", "sur {n} au total"],
    ins_cl_conc: ["Top client share", "Part du 1er client"], ins_cl_conc_n: ["{brand} · {a}", "{brand} · {a}"],
    ins_cl_risk: ["Clients at risk", "Clients à risque"], ins_cl_risk_n: ["{a} late payer, {b} quiet 45+ days", "{a} en retard de paiement, {b} sans nouvelle depuis 45 jours+"],
    ins_cl_ltv: ["Avg value per client", "Valeur moy. par client"],
    ins_cl_dec_late: ["{brand} pays late", "{brand} paie en retard"], ins_cl_dec_quiet: ["{brand} has gone quiet", "{brand} ne donne plus de nouvelles"],
    ins_cl_dec_late_w: ["{inv} is {n} days overdue, {a} still to collect.", "{inv} a {n} jours de retard, {a} encore à encaisser."],
    ins_cl_dec_quiet_w: ["Nothing open and no activity for {n} days. Last seen {d}.", "Rien d'ouvert et aucune activité depuis {n} jours. Dernier signe le {d}."],
    ins_cl_dec_late_r: ["Call them today; no new files until it is paid.", "Appelez-les aujourd'hui ; pas de nouveaux fichiers avant paiement."],
    ins_cl_dec_quiet_r: ["Send the last results and propose the next round.", "Envoyez les derniers résultats et proposez la prochaine série."],
    ins_open_client: ["Open client", "Voir le client"],
    // projects and production
    ins_pj_time: ["On time", "Dans les temps"], ins_pj_time_n: ["{l} late of {n} active", "{l} en retard sur {n} actifs"], ins_pj_time_none: ["No active project", "Aucun projet actif"],
    ins_pj_review: ["Files in review", "Fichiers en relecture"], ins_pj_review_n: ["{a} of {t} approved", "{a} sur {t} validés"], ins_pj_review_rev: ["{r} sent back for changes", "{r} renvoyé(s) en retouches"],
    ins_pj_block: ["Blocked by payment", "Bloqués (paiement)"], ins_pj_block_n: ["{a} still to collect · target 0", "{a} encore à encaisser · objectif 0"], ins_pj_block_c: ["of {n} active · target 0", "sur {n} actifs · objectif 0"],
    ins_pj_shoot: ["Shoots, next 7 days", "Tournages, 7 prochains jours"],
    ins_pj_dec_late: ["{p} is running late", "{p} prend du retard"], ins_pj_dec_late_shoot: ["The shoot date ({d}) passed and it is still at {stage}.", "La date de tournage ({d}) est passée et il en est encore à {stage}."],
    ins_pj_dec_late_del: ["The delivery date ({d}) passed and it is still at {stage}.", "La date de livraison ({d}) est passée et il en est encore à {stage}."],
    ins_pj_dec_late_r: ["Reset the date with the client or add a hand to the edit.", "Refixez la date avec le client ou ajoutez du renfort au montage."],
    ins_pj_dec_block: ["{p} is blocked", "{p} est bloqué"], ins_pj_dec_block_w: ["{g}. Shoot {d}.", "{g}. Tournage {d}."], ins_pj_dec_block_w2: ["{g}.", "{g}."],
    ins_pj_dec_block_r: ["Clear the gate before planning more work on it.", "Levez le blocage avant de planifier plus de travail."],
    ins_pj_dec_rev: ["{n} files of {p} wait for your review", "{n} fichiers de {p} attendent votre relecture"], ins_pj_dec_rev_w: ["{a} of {t} files approved so far. Nothing ships until you decide.", "{a} fichiers sur {t} validés. Rien ne part tant que vous n'avez pas décidé."],
    ins_pj_dec_rev_r: ["Approve or send back with one clear note.", "Validez ou renvoyez avec une note claire."],
    ins_open_project: ["Open project", "Voir le projet"], ins_review: ["Review", "Relire"],
    // deliveries
    ins_dv_wait: ["Waiting for client approval", "En attente de validation client"], ins_dv_wait_n: ["of {a} approved files", "sur {a} fichiers validés"],
    ins_dv_days: ["Days to approval", "Jours avant validation"], ins_dv_days_none: ["No approval timed yet", "Aucune validation chronométrée"], ins_dv_days_n: ["{n} timed", "{n} mesurée(s)"],
    ins_dv_lock: ["Locked, waiting on payment", "Bloqués, en attente de paiement"], ins_dv_lock_n: ["{a} to collect · target 0", "{a} à encaisser · objectif 0"], ins_dv_lock_c: ["files held until paid · target 0", "fichiers retenus jusqu'au paiement · objectif 0"],
    ins_dv_ready: ["Ready to send", "Prêts à envoyer"], ins_dv_ready_n: ["projects with every file approved", "projets avec tous les fichiers validés"],
    ins_dv_dec_lock: ["{p}: {n} approved files are locked", "{p} : {n} fichiers validés sont bloqués"], ins_dv_dec_lock_w: ["{inv} ({a}) is {n} days overdue.", "{inv} ({a}) a {n} jours de retard."], ins_dv_dec_lock_w2: ["The balance of {a} is not paid yet.", "Le solde de {a} n'est pas encore payé."],
    ins_dv_dec_lock_r: ["Chase it today; the files go out the moment it is paid.", "Relancez aujourd'hui ; les fichiers partent dès le paiement."],
    ins_dv_dec_wait: ["{p}: {n} files wait for the client's yes", "{p} : {n} fichiers attendent le oui du client"], ins_dv_dec_wait_w: ["Approved on our side, not signed off by {brand} yet.", "Validés chez nous, pas encore acceptés par {brand}."],
    ins_dv_dec_wait_r: ["Send the delivery message on WhatsApp and ask for a yes.", "Envoyez le message de livraison sur WhatsApp et demandez un oui."],
    ins_open_invoice: ["Open invoice", "Voir la facture"], ins_copy_msg: ["Copy delivery message", "Copier le message de livraison"],
    // finance
    ins_fi_in: ["Received this month", "Encaissé ce mois"], ins_fi_out: ["Outstanding", "Reste à encaisser"], ins_fi_out_n: ["{a} overdue", "{a} en retard"], ins_fi_out_ok: ["nothing overdue", "rien en retard"],
    ins_fi_margin: ["Margin, last 90 days", "Marge, 90 derniers jours"], ins_fi_margin_none: ["No project with cash and costs yet", "Aucun projet avec encaissement et coûts"],
    ins_fi_cap: ["Cap used", "Plafond utilisé"], ins_fi_cap_n: ["{a} headroom of {b}", "{a} de marge sur {b}"], ins_fi_cap_pace: ["vs {v} of the year gone", "vs {v} de l'année écoulée"],
    ins_fi_dec_t: ["Chase {no} from {brand}", "Relancer {no} chez {brand}"], ins_fi_dec_w: ["{a} is {n} days overdue (due {d}).", "{a} a {n} jours de retard (échéance le {d})."],
    ins_fi_dec_r: ["Send the WhatsApp reminder today; hold the final files until it is paid.", "Envoyez le rappel WhatsApp aujourd'hui ; retenez les fichiers finaux jusqu'au paiement."],
    ins_fi_cap_t: ["You are close to the yearly cap", "Vous approchez du plafond annuel"], ins_fi_cap_w: ["{a} of {b} used, {h} left for the rest of {y}.", "{a} sur {b} utilisés, {h} de marge pour le reste de {y}."],
    ins_fi_cap_r: ["Route studio and talent extras to the client directly and check with the accountant.", "Faites facturer les extras studio et talents directement par eux et vérifiez avec le comptable."],
    ins_fi_cap_b: ["Open the cap tab", "Voir le plafond"],
    // team
    ins_tm_open: ["Open tasks", "Tâches ouvertes"], ins_tm_open_late: ["{n} late", "{n} en retard"], ins_tm_open_ok: ["none late", "aucune en retard"],
    ins_tm_busy: ["Busiest", "Le plus chargé"], ins_tm_light: ["Lightest", "Le plus léger"], ins_tm_person: ["{n} open · {l} late", "{n} ouvertes · {l} en retard"],
    ins_tm_comm: ["Commission owed", "Commission due"], ins_tm_comm_n: ["{a} paid so far", "{a} déjà payés"], ins_tm_done: ["Done, 7 days", "Faites, 7 jours"],
    ins_tm_dec_t: ["{who} has {n} overdue tasks", "{who} a {n} tâches en retard"], ins_tm_dec_t1: ["{who} has an overdue task", "{who} a une tâche en retard"],
    ins_tm_dec_w: ["Oldest: \"{title}\", due {d}. {open} open in total.", "La plus ancienne : « {title} », pour le {d}. {open} ouvertes au total."],
    ins_tm_dec_r: ["Ask for a new date or move it to {other}, who has the lightest load.", "Demandez une nouvelle date ou confiez-la à {other}, le moins chargé."],
    ins_tm_dec_r1: ["Ask for a new date or close it.", "Demandez une nouvelle date ou clôturez-la."], ins_open_task: ["Open task", "Voir la tâche"],
    // studio
    ins_st_play: ["Ideas in play", "Idées en cours"], ins_st_play_n: ["{a} idea · {b} concept · {c} script · {d} ready", "{a} idée · {b} concept · {c} script · {d} prêtes"], ins_st_new: ["new this week, vs last week", "nouvelles cette semaine, vs la précédente"],
    ins_st_ready: ["Ready to shoot", "Prêtes à tourner"], ins_st_ready_n: ["ready, not in a reel yet", "prêtes, pas encore dans un reel"],
    ins_st_hit: ["Hit rate of shot ideas", "Taux de réussite des idées tournées"], ins_st_hit_n: ["{w} winners of {s} shot", "{w} gagnantes sur {s} tournées"], ins_st_hit_none: ["Nothing shot yet", "Rien de tourné pour l'instant"], ins_st_hit_unm: ["{s} shot, none measured yet", "{s} tournées, aucune mesurée"],
    ins_st_stale: ["Stale ideas", "Idées en sommeil"], ins_st_stale_n: ["untouched 14+ days · target 0", "intactes depuis 14 jours+ · objectif 0"],
    ins_st_dec_stale: ["\"{title}\" has sat untouched for {n} days", "« {title} » dort depuis {n} jours"], ins_st_dec_stale_w: ["At the {stage} stage{brand}. Owner: {owner}.", "À l'étape {stage}{brand}. Responsable : {owner}."],
    ins_st_dec_stale_r: ["Move it on this week or park it so the board stays honest.", "Faites-la avancer cette semaine ou mettez-la en pause pour garder le tableau honnête."],
    ins_st_dec_ready: ["\"{title}\" is ready and waiting for a shoot", "« {title} » est prête et attend un tournage"], ins_st_dec_ready_w: ["Hook and script are done{brand}. {n} ideas are ready in total.", "Hook et script sont faits{brand}. {n} idées sont prêtes au total."],
    ins_st_dec_ready_r: ["Put it in the next shoot plan.", "Mettez-la dans le prochain plan de tournage."], ins_open_idea: ["Open idea", "Voir l'idée"]
  });

  // ---------- small helpers ----------
  function me() { return GK.me() || { id: "", name: "", role: "founder" }; }
  function td() { return u.today(); }
  function d(n) { return u.addDays(td(), n); }
  function founder() { return m.isFounder(); }
  function dayWord(n) { n = Math.round(n); return n === 1 ? t("ins_day_1") : t("ins_days", { n: n }); }
  /** Percent change, null when there is no base to compare with. */
  function pctChange(now, before) { var x = before ? (now - before) / Math.abs(before) * 100 : null; return x != null && Math.abs(x) > 300 ? null : x; }
  /** Delta options for a count: percent against the previous period, or "+n" when the previous period was empty. */
  function cmpCount(now, before) {
    if (before) return { delta: pctChange(now, before) };
    return now > 0 ? { delta: "+" + now, deltaTone: "up" } : {};
  }
  /** Delta options for a change measured in percentage points. */
  function cmpPts(now, before) {
    if (now == null || before == null) return {};
    var r = Math.round(now - before);
    return { delta: (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r) + " " + t("ins_pts"), deltaTone: r > 0 ? "up" : r < 0 ? "down" : "" };
  }
  /** Delta options for a change measured in days. */
  function cmpDays(now, before) {
    if (now == null || before == null) return {};
    var r = Math.round(now - before);
    return { delta: (r > 0 ? "+" : r < 0 ? "−" : "") + dayWord(Math.abs(r)), deltaTone: r > 0 ? "up" : r < 0 ? "down" : "" };
  }
  /** The strip: the tiles in a KPI grid, then the decision card. Empty when there is nothing to show. */
  function strip(tiles, dec) {
    tiles = tiles.filter(Boolean);
    if (!tiles.length && !dec) return "";
    return '<section aria-label="' + esc(t("ins_label")) + '" style="display:grid;gap:16px;min-width:0">' +
      (tiles.length ? ui.kpis(tiles) : "") + (dec || "") + "</section>";
  }
  /** Weekly series: fn(from, to) for the `n` weeks ending `endOffset` days from today. */
  function weekly(n, fn, endOffset) {
    var out = [], end = endOffset || 0;
    for (var i = n - 1; i >= 0; i--) out.push(fn(d(end - i * 7 - 7), d(end - i * 7)));
    return out;
  }

  // ---------- pipeline ----------
  GK.insight = {};
  GK.insight.pipeline = function () {
    var today = td(), pv = X.pipelineAt(today), prev = X.pipelineAt(d(-30)), open = S.all("leads").filter(m.isOpen);
    var w90 = X.winRateIn(90), w90p = X.winRateIn(90, d(-90)), cold = X.coldLeads(7);
    var cyc = X.leadCycle(180), cycP = X.leadCycle(180, d(-180)), allTime = false;
    if (cyc.days == null) { cyc = X.leadCycle(0); allTime = true; }
    var spark = []; for (var i = 7; i >= 0; i--) spark.push(X.pipelineAt(d(-i * 7)).weighted);
    var tiles = [
      { label: t("ins_pl_w"), icon: "pipeline", value: u.money(pv.weighted), delta: pctChange(pv.weighted, prev.weighted), deltaLabel: prev.weighted ? t("ins_vs30") : null, hint: t("ins_pl_w_of", { a: u.money(pv.total) }), spark: spark },
      Object.assign({ label: t("ins_pl_win"), icon: "trend", value: w90.rate == null ? "—" : u.pct(w90.rate), hint: w90.rate == null ? t("ins_pl_win_none") : t("ins_pl_win_n", { w: w90.won, l: w90.lost }) },
        w90.rate != null && w90p.rate != null ? Object.assign(cmpPts(w90.rate, w90p.rate), { deltaLabel: t("ins_vs_before", { v: u.pct(w90p.rate) }) }) : {}),
      Object.assign({ label: t("ins_pl_cycle"), icon: "clock", value: cyc.days == null ? "—" : u.dec(cyc.days, 1), hint: cyc.days == null ? t("ins_pl_cycle_none") : allTime ? t("ins_pl_cycle_all", { n: cyc.n }) : t("ins_pl_cycle_d", { n: cyc.n }), good: "down" },
        !allTime && cyc.days != null && cycP.days != null ? Object.assign(cmpDays(cyc.days, cycP.days), { deltaLabel: t("ins_vs_before", { v: dayWord(cycP.days) }) }) : {}),
      { label: t("ins_pl_cold"), icon: "alert", value: String(cold.length), hint: t("ins_pl_cold_n", { o: open.length }) }
    ];
    var dec = "";
    if (cold.length) {
      var c = cold[0], l = c.lead, pk = m.pack(l.pack), late = c.late > 0;
      dec = ui.decision({
        title: t("ins_pl_dec_t", { brand: l.brand }), icon: "alert", tone: "urgent",
        why: late ? t("ins_pl_dec_w1", { pack: pk.name, price: u.money(pk.price), stage: t("ls_" + l.stage), d: u.fmtDate(l.nextDate), n: c.late }) : t("ins_pl_dec_w2", { pack: pk.name, price: u.money(pk.price), stage: t("ls_" + l.stage), n: c.idle }),
        recommend: l.next || t("ins_pl_dec_r"), action: { label: t("ins_open_lead"), a: "pl-open", data: { id: l.id }, cls: "primary sm" }
      });
    }
    return strip(tiles, dec);
  };

  // ---------- clients ----------
  GK.insight.clients = function () {
    var clients = S.all("clients"), money = founder(), today = td();
    var openWork = clients.filter(X.clientHasOpenWork), act = openWork.length;
    var new90 = clients.filter(function (c) { var s = X.clientSince(c); return s && s >= d(-90); }).length;
    var spark = X.months(6).map(function (ym) { var end = ym + "-31"; return clients.filter(function (c) { var s = X.clientSince(c); return s && s <= end; }).length; });
    var risks = X.clientRisks(45), lateN = risks.filter(function (r) { return r.kind === "late"; }).length;
    var tiles = [
      { label: t("ins_cl_active"), icon: "clients", value: String(act), delta: new90 ? "+" + new90 : null, deltaTone: "up", deltaLabel: new90 ? t("ins_new_90") : null, hint: t("ins_cl_active_of", { n: clients.length }), spark: spark }
    ];
    if (money) {
      var cc = X.concentration(), top = cc.cur, topC = top ? m.client(top.id) : null;
      tiles.push(Object.assign({ label: t("ins_cl_conc"), icon: "pipeline", value: top ? u.pct(top.share) : "—", good: "down", hint: top ? t("ins_cl_conc_n", { brand: topC ? topC.brand : "—", a: u.money(top.amount) }) : null },
        top && cc.prev && cc.prev.n >= 3 ? Object.assign(cmpPts(top.share, cc.prev.share), { deltaLabel: t("ins_vs_12") }) : {}));
    }
    tiles.push({ label: t("ins_cl_risk"), icon: "alert", value: String(risks.length), hint: t("ins_cl_risk_n", { a: lateN, b: risks.length - lateN }) });
    if (money) {
      var ltv = X.avgLtv(), ltvP = X.avgLtv(d(-90));
      var sp = X.months(6).map(function (ym) { return X.avgLtv(ym + "-31") || 0; });
      tiles.push({ label: t("ins_cl_ltv"), icon: "cash", value: ltv == null ? "—" : u.money(ltv), delta: ltv != null && ltvP ? pctChange(ltv, ltvP) : null, deltaLabel: ltvP ? t("ins_vs90") : null, spark: sp });
    }
    var dec = "";
    if (risks.length) {
      var r = risks[0], c = r.client, late = r.kind === "late";
      dec = ui.decision({
        title: t(late ? "ins_cl_dec_late" : "ins_cl_dec_quiet", { brand: c.brand }), icon: late ? "invoice" : "clients", tone: late ? "urgent" : "",
        why: late ? t("ins_cl_dec_late_w", { inv: r.inv.no, n: r.late, a: u.money(r.amount) }) : t("ins_cl_dec_quiet_w", { n: r.idle, d: u.fmtDate(X.clientLastActivity(c)) }),
        recommend: t(late ? "ins_cl_dec_late_r" : "ins_cl_dec_quiet_r"), action: { label: t("ins_open_client"), a: "cl-open", data: { id: c.id }, cls: late ? "primary sm" : "sm" }
      });
    }
    return strip(tiles, dec);
  };

  // ---------- projects and production ----------
  GK.insight.projects = function (mode) {
    var today = td(), money = founder() || me().role === "sales", prod = mode === "production";
    var active = S.all("projects").filter(function (p) { return p.stage !== "retention"; });
    var late = active.filter(function (p) { return X.projectLate(p); });
    var fc = X.fileCounts(active), blocked = active.filter(function (p) { return m.gates(p).length; });
    var next7 = X.shootsIn(today, d(7)), prev7 = X.shootsIn(d(-7), d(-1));
    var onTimePct = active.length ? (active.length - late.length) / active.length * 100 : null;
    var owedBlocked = u.sum(blocked, function (p) { return u.sum(S.all("invoices").filter(function (i) { return i.projectId === p.id && i.no && !i.credited && i.kind !== "credit"; }), m.invBalance); });
    var spark = weekly(8, function (a, b) { return X.shootsIn(a, b).length; }, 21);
    var tTime = Object.assign({ label: t("ins_pj_time"), icon: "check", value: onTimePct == null ? "—" : u.pct(onTimePct), hint: active.length ? t("ins_pj_time_n", { l: late.length, n: active.length }) : t("ins_pj_time_none") },
      onTimePct == null ? {} : Object.assign(cmpPts(onTimePct, 90), { deltaLabel: t("ins_target", { v: "90%" }) }));
    var tReview = { label: t("ins_pj_review"), icon: "production", value: String(fc.review), hint: fc.revise ? t("ins_pj_review_rev", { r: fc.revise }) : t("ins_pj_review_n", { a: fc.approved, t: fc.total }),
      spark: [fc.todo, fc.edit, fc.review, fc.revise, fc.approved] };
    var tBlock = { label: t("ins_pj_block"), icon: "alert", value: String(blocked.length), hint: money && blocked.length && owedBlocked > 0 ? t("ins_pj_block_n", { a: u.money(owedBlocked) }) : t("ins_pj_block_c", { n: active.length }) };
    var tShoot = Object.assign({ label: t("ins_pj_shoot"), icon: "calendar", value: String(next7.length), spark: spark }, cmpCount(next7.length, prev7.length), prev7.length || next7.length ? { deltaLabel: t("ins_vs_week") } : {});
    var tiles = prod ? [tReview, tTime, tBlock, tShoot] : [tTime, tReview, tBlock, tShoot];

    var dec = "";
    var lp = late.sort(u.by(function (p) { return p.shootDate || "9999"; }))[0];
    if (lp && !prod) {
      var kind = X.projectLate(lp), dt = kind === "shoot" ? lp.shootDate : String(lp.deliveryDate || lp.deliverBy).slice(0, 10);
      dec = ui.decision({ title: t("ins_pj_dec_late", { p: m.projectLabel(lp) }), icon: "alert", tone: "urgent", why: t(kind === "shoot" ? "ins_pj_dec_late_shoot" : "ins_pj_dec_late_del", { d: u.fmtDate(dt), stage: t("st_" + lp.stage) }),
        recommend: t("ins_pj_dec_late_r"), action: { label: t("ins_open_project"), a: "ins-go", data: { v: "projects", id: lp.id }, cls: "primary sm" } });
    } else if (prod && founder() && fc.review) {
      var best = null, bn = 0;
      active.forEach(function (p) { var n = m.files(p).filter(function (f) { return f.item.status === "review"; }).length; if (n > bn) { bn = n; best = p; } });
      if (best) {
        var pg = m.progress(best);
        dec = ui.decision({ title: t("ins_pj_dec_rev", { n: bn, p: m.projectLabel(best) }), icon: "production", why: t("ins_pj_dec_rev_w", { a: pg.done, t: pg.total }), recommend: t("ins_pj_dec_rev_r"),
          action: { label: t("ins_review"), a: "pr-pick", data: { id: best.id }, cls: "primary sm" } });
      }
    } else if (blocked.length && (founder() || me().role === "sales")) {
      var bp = blocked.sort(u.by(function (p) { return p.shootDate || "9999"; }))[0], g = m.gates(bp)[0];
      dec = ui.decision({ title: t("ins_pj_dec_block", { p: m.projectLabel(bp) }), icon: "alert", tone: "urgent",
        why: bp.shootDate ? t("ins_pj_dec_block_w", { g: g.replace(/\.$/, ""), d: u.fmtDate(bp.shootDate) }) : t("ins_pj_dec_block_w2", { g: g.replace(/\.$/, "") }), recommend: t("ins_pj_dec_block_r"),
        action: { label: t("ins_open_project"), a: "ins-go", data: { v: "projects", id: bp.id }, cls: "primary sm" } });
    }
    return strip(tiles, dec);
  };

  // ---------- deliveries ----------
  GK.insight.deliveries = function () {
    var money = founder(), STAGES = ["editing", "client_review", "revisions", "delivered"];
    var list = S.all("projects").filter(function (p) { return STAGES.indexOf(p.stage) > -1; });
    var wait = 0, appr = 0, lockedN = 0, ready = 0, lockedBy = [], waitBy = [];
    list.forEach(function (p) {
      var fs = m.files(p), ap = fs.filter(function (f) { return f.item.status === "approved"; }), ok = ap.filter(function (f) { return f.item.clientOk; });
      appr += ap.length; wait += ap.length - ok.length;
      if (p.stage === "editing" && fs.length && ap.length === fs.length) ready++;
      if (!m.canFiles(p) && ap.length) { lockedN += ap.length; lockedBy.push({ p: p, n: ap.length }); }
      if (ap.length - ok.length > 0 && m.canFiles(p)) waitBy.push({ p: p, n: ap.length - ok.length });
    });
    var owed = u.sum(lockedBy, function (x) { return u.sum(S.all("invoices").filter(function (i) { return i.projectId === x.p.id && i.no && !i.credited && i.kind !== "credit"; }), m.invBalance); });
    var ad = X.approvalDays(90), adP = X.approvalDays(90, d(-90));
    var tiles = [
      { label: t("ins_dv_wait"), icon: "eye", value: String(wait), hint: t("ins_dv_wait_n", { a: appr }) },
      Object.assign({ label: t("ins_dv_days"), icon: "clock", value: ad.days == null ? "—" : u.dec(ad.days, 1), hint: ad.days == null ? t("ins_dv_days_none") : t("ins_dv_days_n", { n: ad.n }), good: "down" },
        ad.days != null && adP.days != null && ad.src === adP.src ? Object.assign(cmpDays(ad.days, adP.days), { deltaLabel: t("ins_vs_before", { v: dayWord(adP.days) }), hint: null }) : {}),
      { label: t("ins_dv_lock"), icon: "alert", value: String(lockedN), hint: money && owed > 0 ? t("ins_dv_lock_n", { a: u.money(owed) }) : t("ins_dv_lock_c") },
      { label: t("ins_dv_ready"), icon: "deliveries", value: String(ready), hint: t("ins_dv_ready_n") }
    ];
    var dec = "";
    lockedBy.sort(function (a, b) { return b.n - a.n; });
    if (lockedBy.length) {
      var x = lockedBy[0], p = x.p, inv = S.all("invoices").filter(function (i) { return i.projectId === p.id && i.no && !i.credited && i.kind !== "credit" && m.invBalance(i) > 0.001; }).sort(u.by("due"))[0];
      var lateN = inv && inv.due && inv.due < td() ? u.daysBetween(inv.due, td()) : 0;
      dec = ui.decision({ title: t("ins_dv_dec_lock", { p: m.projectLabel(p), n: x.n }), icon: "alert", tone: "urgent",
        why: inv && lateN ? t("ins_dv_dec_lock_w", { inv: inv.no, a: u.money(m.invBalance(inv)), n: lateN }) : t("ins_dv_dec_lock_w2", { a: u.money(inv ? m.invBalance(inv) : 0) }), recommend: t("ins_dv_dec_lock_r"),
        action: inv && founder() ? { label: t("ins_open_invoice"), a: "fi-open", data: { id: inv.id }, cls: "primary sm" } : { label: t("ins_open_project"), a: "dv-proj", data: { id: p.id }, cls: "primary sm" } });
    } else if (waitBy.length) {
      waitBy.sort(function (a, b) { return b.n - a.n; });
      var w = waitBy[0].p;
      dec = ui.decision({ title: t("ins_dv_dec_wait", { p: m.projectLabel(w), n: waitBy[0].n }), icon: "eye", why: t("ins_dv_dec_wait_w", { brand: m.brand(w.clientId) }), recommend: t("ins_dv_dec_wait_r"),
        action: { label: t("ins_copy_msg"), a: "dv-copy", data: { p: w.id, links: "1" }, cls: "sm" } });
    }
    return strip(tiles, dec);
  };

  // ---------- finance overview ----------
  GK.insight.finance = function () {
    if (!founder()) return "";
    var rows = X.monthly(6), cur = rows[rows.length - 1] || { cashIn: 0 }, prev = rows[rows.length - 2] || { cashIn: 0 };
    var ag = X.aging(), rec = X.receivables(), lateAmt = ag.d1_7 + ag.d8_30 + ag.d31, r = m.rules();
    var used = m.capUsed(), pct = r.cap ? used / r.cap * 100 : 0, year = u.year(td());
    var elapsed = (Date.parse(td() + "T12:00:00") - Date.parse(year + "-01-01T12:00:00")) / (365 * u.DAY) * 100;
    function margin(from, to) {
      var ps = S.all("projects").filter(function (p) { return p.shootDate && p.shootDate > from && p.shootDate <= to && m.received(p) > 0 && m.costOf(p) > 0; });
      var rcv = u.sum(ps, m.received); return rcv ? u.sum(ps, m.profit) / rcv * 100 : null;
    }
    var mg = margin(d(-90), td()), mgP = margin(d(-180), d(-90));
    var mgSpark = [5, 4, 3, 2, 1, 0].map(function (k) { return Math.max(0, margin(d(-(k + 1) * 30), d(-k * 30)) || 0); });
    var tiles = [
      { label: t("ins_fi_in"), icon: "cash", value: u.money(cur.cashIn), delta: pctChange(cur.cashIn, prev.cashIn), deltaLabel: prev.cashIn ? t("ins_vs_last_m") : null, spark: rows.map(function (x) { return x.cashIn; }) },
      { label: t("ins_fi_out"), icon: "invoice", value: u.money(ag.total), delta: lateAmt > 0 ? t("ins_fi_out_n", { a: u.money(lateAmt) }) : t("ins_fi_out_ok"), deltaTone: lateAmt > 0 ? "up" : "", good: "down", deltaIcon: lateAmt > 0 ? "alert" : "check",
        spark: [ag.current, ag.d1_7, ag.d8_30, ag.d31] },
      Object.assign({ label: t("ins_fi_margin"), icon: "trend", value: mg == null ? "—" : u.pct(mg), hint: mg == null ? t("ins_fi_margin_none") : null, spark: mgSpark },
        mg != null && mgP != null ? Object.assign(cmpPts(mg, mgP), { deltaLabel: t("ins_vs_before", { v: u.pct(mgP) }) }) : {}),
      Object.assign({ label: t("ins_fi_cap"), icon: "file", value: u.pct(pct), hint: t("ins_fi_cap_n", { a: u.money(Math.max(0, r.cap - used)), b: u.money(r.cap) }), good: "down" },
        r.cap ? Object.assign(cmpPts(pct, elapsed), { deltaLabel: t("ins_fi_cap_pace", { v: u.pct(elapsed) }), hint: null }) : {})
    ];
    var dec = "";
    var worst = rec.filter(function (x) { return x.late > 0; })[0];
    if (worst) {
      var i = worst.inv;
      dec = ui.decision({ title: t("ins_fi_dec_t", { no: i.no, brand: m.brand(i.clientId) }), icon: "invoice", tone: "urgent", why: t("ins_fi_dec_w", { a: u.money(worst.balance), n: worst.late, d: u.fmtDate(i.due) }),
        recommend: t("ins_fi_dec_r"), action: { label: t("ins_open_invoice"), a: "fi-open", data: { id: i.id }, cls: "primary sm" } });
    } else if (pct >= 80) {
      dec = ui.decision({ title: t("ins_fi_cap_t"), icon: "alert", tone: "urgent", why: t("ins_fi_cap_w", { a: u.money(used), b: u.money(r.cap), h: u.money(Math.max(0, r.cap - used)), y: year }), recommend: t("ins_fi_cap_r"),
        action: { label: t("ins_fi_cap_b"), a: "ins-go", data: { v: "finance", k: "tab", id: "cap" }, cls: "primary sm" } });
    }
    return strip(tiles, dec);
  };

  // ---------- team ----------
  GK.insight.team = function () {
    var role = me().role || "founder", load = X.teamLoad(), td0 = td();
    if (!load.length) return "";
    var sorted = load.slice().sort(function (a, b) { return b.open - a.open || b.late - a.late; });
    var busy = sorted[0], light = sorted[sorted.length - 1];
    var open = u.sum(load, function (x) { return x.open; }), late = u.sum(load, function (x) { return x.late; });
    var done7 = X.tasksDoneIn(d(-7), td0), doneP = X.tasksDoneIn(d(-14), d(-7));
    var spark = []; for (var i = 9; i >= 0; i--) spark.push(X.tasksDoneIn(d(-i - 1), d(-i)));
    var tiles = [
      { label: t("ins_tm_open"), icon: "tasks", value: String(open), delta: late ? t("ins_tm_open_late", { n: late }) : t("ins_tm_open_ok"), deltaTone: late ? "up" : "", good: "down", deltaIcon: late ? "alert" : "check", spark: spark },
      { label: t("ins_tm_busy"), icon: "up", value: busy.member.name, hint: t("ins_tm_person", { n: busy.open, l: busy.late }) },
      load.length > 1 ? { label: t("ins_tm_light"), icon: "dn", value: light.member.name, hint: t("ins_tm_person", { n: light.open, l: light.late }) } : null
    ];
    if (founder()) tiles.push({ label: t("ins_tm_comm"), icon: "cash", value: u.money(X.commissionOwed()), hint: t("ins_tm_comm_n", { a: u.money(X.commissionPaid()) }) });
    else if (role === "sales") {
      var mine = S.all("projects").filter(function (p) { return !!m.commission(p).basis; }), owed = u.sum(mine, function (p) { return m.commission(p).owed; });
      tiles.push({ label: t("ins_tm_comm"), icon: "cash", value: u.money(owed), hint: t("ins_tm_comm_n", { a: u.money(u.sum(mine, function (p) { return m.commission(p).paid; })) }) });
    } else tiles.push(Object.assign({ label: t("ins_tm_done"), icon: "check", value: String(done7), spark: spark }, cmpCount(done7, doneP), done7 || doneP ? { deltaLabel: t("ins_vs_week") } : {}));
    var dec = "";
    var who = load.filter(function (x) { return x.late > 0; }).sort(function (a, b) { return b.late - a.late; })[0];
    if (who) {
      var tk = S.all("tasks").filter(function (x) { return x.who === who.member.id && !x.done && x.due && x.due < td0; }).sort(u.by("due"))[0];
      var other = light.member.id !== who.member.id ? light.member.name : "";
      dec = ui.decision({ title: who.late === 1 ? t("ins_tm_dec_t1", { who: who.member.name }) : t("ins_tm_dec_t", { who: who.member.name, n: who.late }), icon: "alert", tone: "urgent",
        why: t("ins_tm_dec_w", { title: tk ? tk.title : "—", d: tk ? u.fmtDate(tk.due) : "—", open: who.open }), recommend: other ? t("ins_tm_dec_r", { other: other }) : t("ins_tm_dec_r1"),
        action: tk ? { label: t("ins_open_task"), a: "tk-open", data: { id: tk.id }, cls: "primary sm" } : null });
    }
    return strip(tiles, dec);
  };

  // ---------- studio ----------
  function studioH() { return (GK.studio && GK.studio.h) || null; }
  /** Shot ideas that won: their reel has a hook with results at or better than the average of all measured hooks (cost per purchase, else click rate). */
  function ideaHit() {
    var h = studioH(), hooks = X.hooks(), out = { shot: 0, measured: 0, won: 0 };
    if (!h) return out;
    var cpps = hooks.filter(function (x) { return x.cpp; }).map(function (x) { return x.cpp; }), ctrs = hooks.filter(function (x) { return x.ctr; }).map(function (x) { return x.ctr; });
    var avgCpp = cpps.length ? u.sum(cpps) / cpps.length : 0, avgCtr = ctrs.length ? u.sum(ctrs) / ctrs.length : 0;
    S.all("ideas").forEach(function (i) {
      if (h.effStage(i) !== "shot") return;
      out.shot++;
      var lr = h.linkedReel(i); if (!lr) return;
      var rs = (lr.r.hooks || []).map(function (x) { return x.results; }).filter(function (r) { return r && (r.cpp || r.ctr); });
      if (!rs.length) return;
      out.measured++;
      var cp = rs.map(function (r) { return +r.cpp || 0; }).filter(Boolean), ct = rs.map(function (r) { return +r.ctr || 0; });
      if (cp.length && avgCpp ? Math.min.apply(null, cp) <= avgCpp : Math.max.apply(null, ct) >= avgCtr) out.won++;
    });
    return out;
  }
  GK.insight.studio = function () {
    var h = studioH(); if (!h) return "";
    var ideas = S.all("ideas"), today = td(), by = { idea: 0, concept: 0, script: 0, ready: 0, shot: 0 };
    ideas.forEach(function (i) { var s = h.effStage(i); if (by[s] != null) by[s]++; });
    var play = by.idea + by.concept + by.script + by.ready;
    var ready = GK.studio.readyCount();
    var new7 = ideas.filter(function (i) { return i.created && i.created > d(-7); }).length, newP = ideas.filter(function (i) { return i.created && i.created > d(-14) && i.created <= d(-7); }).length;
    var stale = ideas.filter(function (i) { var s = h.effStage(i); return s !== "parked" && s !== "shot" && X.ideaTouched(i) && X.ideaTouched(i) <= d(-14); })
      .sort(u.by(function (i) { return X.ideaTouched(i); }));
    var hit = ideaHit();
    var tiles = [
      Object.assign({ label: t("ins_st_play"), icon: "studio", value: String(play), hint: t("ins_st_play_n", { a: by.idea, b: by.concept, c: by.script, d: by.ready }), spark: [by.idea, by.concept, by.script, by.ready, by.shot] },
        cmpCount(new7, newP), new7 || newP ? { deltaLabel: t("ins_st_new") } : {}),
      { label: t("ins_st_ready"), icon: "check", value: String(ready), hint: t("ins_st_ready_n") },
      { label: t("ins_st_hit"), icon: "trend", value: hit.measured ? u.pct(hit.won / hit.measured * 100) : "—", hint: !hit.shot ? t("ins_st_hit_none") : hit.measured ? t("ins_st_hit_n", { w: hit.won, s: hit.measured }) : t("ins_st_hit_unm", { s: hit.shot }) },
      { label: t("ins_st_stale"), icon: "clock", value: String(stale.length), hint: t("ins_st_stale_n") }
    ];
    var dec = "";
    function brandOf(i) { var c = i.clientId && m.client(i.clientId); return c ? " · " + c.brand : ""; }
    if (stale.length) {
      var i = stale[0];
      dec = ui.decision({ title: t("ins_st_dec_stale", { title: i.title, n: u.daysBetween(X.ideaTouched(i), today) }), icon: "clock", why: t("ins_st_dec_stale_w", { stage: h.stName(h.effStage(i)), brand: brandOf(i), owner: h.ownerName(i) }),
        recommend: t("ins_st_dec_stale_r"), action: { label: t("ins_open_idea"), a: "st-open", data: { id: i.id }, cls: "sm" } });
    } else if (ready) {
      var r = ideas.filter(function (x) { return x.stage === "ready" && !x.reelId; }).sort(u.by("priority"))[0];
      if (r) dec = ui.decision({ title: t("ins_st_dec_ready", { title: r.title }), icon: "sparkle", tone: "chroma", why: t("ins_st_dec_ready_w", { brand: brandOf(r), n: ready }), recommend: t("ins_st_dec_ready_r"),
        action: { label: t("ins_open_idea"), a: "st-open", data: { id: r.id }, cls: "sm" } });
    }
    return strip(tiles, dec);
  };

  GK.act("ins-go", function (el) {
    var v = el.getAttribute("data-v"), id = el.getAttribute("data-id"), k = el.getAttribute("data-k") || "id", o = {};
    if (id) o[k] = id;
    ui.go(v, id ? o : null);
  });
})(window.GK);
