/* GECKO Ops · finance: Cash book tab. The real money the agency has, account by account.
   Data lives in config.cash = { accounts: [{id, name, opening, date}], moves: [...manual entries], checks: [...bank checks] }
   (config, so no database change). Money in = invoice payments (net). Money out = the expenses ledger + manual entries.
   When accounts exist, m.rules().openingCash is the cash book total, so the forecast and runway start from real cash. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, X = GK.x, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_tab_cash: ["Cash book", "Trésorerie"],
    fi_cb_k_now: ["Cash now", "Trésorerie actuelle"], fi_cb_k_now_n: ["{n} accounts", "{n} comptes"], fi_cb_k_now_1: ["1 account", "1 compte"], fi_cb_k_now_acc: ["this account", "ce compte"],
    fi_cb_k_in: ["Money in", "Entrées"], fi_cb_k_out: ["Money out", "Sorties"], fi_cb_k_net: ["Net", "Net"], fi_cb_k_all: ["all months", "tous les mois"],
    fi_cb_accounts: ["Accounts", "Comptes"], fi_cb_add_account: ["Add account", "Ajouter un compte"], fi_cb_add_move: ["Add movement", "Ajouter un mouvement"],
    fi_cb_none_t: ["No account yet", "Aucun compte pour l'instant"],
    fi_cb_none: ["Add your accounts (bank, cash, D17...) with the balance on the day you start. Invoice payments and expenses then flow in by themselves.", "Ajoutez vos comptes (banque, caisse, D17...) avec le solde du jour de départ. Les paiements de factures et les dépenses s'ajoutent ensuite tout seuls."],
    fi_cb_none_old: ["Until then the forecast uses the opening cash number from the Cash forecast tab.", "D'ici là, la prévision utilise la trésorerie de départ de l'onglet Prévision."],
    fi_cb_c_account: ["Account", "Compte"], fi_cb_c_balance: ["Balance", "Solde"], fi_cb_c_opening: ["Opening", "Départ"], fi_cb_c_check: ["Last bank check", "Dernier contrôle banque"],
    fi_cb_no_check: ["Never checked", "Jamais contrôlé"], fi_cb_check_line: ["{d}: {g}", "{d} : {g}"], fi_cb_gap_ok: ["matches", "correspond"], fi_cb_gap_n: ["gap {g}", "écart {g}"],
    fi_cb_check_btn: ["Check", "Contrôler"], fi_cb_total: ["Total", "Total"], fi_cb_opening_on: ["{a} on {d}", "{a} le {d}"],
    fi_cb_month: ["Month", "Mois"], fi_cb_acct_f: ["Account", "Compte"], fi_cb_all_months: ["All months", "Tous les mois"], fi_cb_all_accts: ["All accounts", "Tous les comptes"],
    fi_cb_c_date: ["Date", "Date"], fi_cb_c_what: ["What", "Quoi"], fi_cb_c_acct: ["Account", "Compte"], fi_cb_c_in: ["In", "Entrée"], fi_cb_c_out: ["Out", "Sortie"], fi_cb_c_bal: ["Balance", "Solde"],
    fi_cb_empty: ["No movement here.", "Aucun mouvement ici."],
    fi_cb_src_open: ["Opening balance", "Solde de départ"], fi_cb_src_pay: ["Invoice payment", "Paiement de facture"], fi_cb_src_exp: ["Expense", "Dépense"], fi_cb_src_transfer: ["Transfer", "Virement interne"],
    fi_cb_ty_in_other: ["Money in, other", "Entrée, autre"], fi_cb_ty_out_owner: ["Owner pay", "Paie du fondateur"], fi_cb_ty_out_partner: ["Partner payout", "Paiement du partenaire"],
    fi_cb_ty_out_other: ["Money out, other", "Sortie, autre"], fi_cb_ty_transfer: ["Transfer between accounts", "Virement entre comptes"],
    fi_cb_note: ["Balances count what happened up to today. Invoice payments come in net of tax withheld by the client. Expenses and payments with no account go to the first account. Owner pay and partner payouts are not taken from anywhere else: add them here.", "Les soldes comptent ce qui s'est passé jusqu'à aujourd'hui. Les paiements de factures arrivent nets de la retenue à la source. Les dépenses et paiements sans compte vont sur le premier compte. La paie du fondateur et les paiements du partenaire ne viennent de nulle part ailleurs : ajoutez-les ici."],
    fi_cb_founder: ["Only the owner can change the cash book.", "Seul le fondateur peut modifier la trésorerie."],
    fi_cb_acc_new_t: ["New", "Nouveau"], fi_cb_acc_new_a: ["account", "compte"], fi_cb_acc_edit_t: ["Edit", "Modifier"], fi_cb_acc_edit_a: ["account", "compte"],
    fi_cb_f_name: ["Account name (Bank, Cash, D17...)", "Nom du compte (Banque, Caisse, D17...)"], fi_cb_f_open: ["Balance on the opening date (TND)", "Solde à la date de départ (TND)"], fi_cb_f_open_date: ["Opening date", "Date de départ"],
    fi_cb_need_name: ["Give the account a name.", "Donnez un nom au compte."], fi_cb_need_date: ["Pick a date.", "Choisissez une date."],
    fi_cb_acc_del_q: ["Delete this account?", "Supprimer ce compte ?"], fi_cb_acc_del_body: ["{n}. Payments and expenses on it move to the first account. Manual entries on it move there too.", "{n}. Les paiements et dépenses de ce compte passent sur le premier compte. Les écritures manuelles aussi."], fi_cb_acc_deleted: ["Account deleted", "Compte supprimé"],
    fi_cb_mv_new_t: ["New", "Nouveau"], fi_cb_mv_new_a: ["movement", "mouvement"], fi_cb_mv_edit_t: ["Edit", "Modifier"], fi_cb_mv_edit_a: ["movement", "mouvement"],
    fi_cb_f_type: ["Type", "Type"], fi_cb_f_date: ["Date", "Date"], fi_cb_f_amount: ["Amount (TND)", "Montant (TND)"], fi_cb_f_acct: ["Account (from, for a transfer)", "Compte (de départ pour un virement)"],
    fi_cb_f_to: ["To account (transfers only)", "Vers le compte (virements seulement)"], fi_cb_f_label: ["What", "Quoi"], fi_cb_f_note: ["Note", "Note"],
    fi_cb_need_amount: ["Enter an amount above zero.", "Entrez un montant supérieur à zéro."], fi_cb_need_label: ["Say what it is.", "Indiquez de quoi il s'agit."],
    fi_cb_need_two: ["A transfer needs two different accounts.", "Un virement demande deux comptes différents."], fi_cb_need_acct: ["Add an account first.", "Ajoutez d'abord un compte."],
    fi_cb_mv_del_q: ["Delete this entry?", "Supprimer cette écriture ?"], fi_cb_mv_del_body: ["{l} · {a}", "{l} · {a}"], fi_cb_mv_deleted: ["Entry deleted", "Écriture supprimée"],
    fi_cb_ck_t: ["Check against", "Contrôle avec"], fi_cb_ck_a: ["the bank", "la banque"], fi_cb_ck_book: ["The book says {a} on {d}.", "Le livre indique {a} au {d}."],
    fi_cb_ck_real: ["Real balance today (TND)", "Solde réel aujourd'hui (TND)"], fi_cb_ck_real_h: ["Type what the bank app or the cash drawer shows.", "Saisissez ce qu'affiche l'appli de la banque ou la caisse."],
    fi_cb_ck_fix: ["Also add an entry for the gap", "Ajouter aussi une écriture pour l'écart"], fi_cb_ck_fix_h: ["Makes the book match the real balance.", "Aligne le livre sur le solde réel."],
    fi_cb_ck_gap: ["Gap: {g}", "Écart : {g}"], fi_cb_ck_need: ["Type the real balance.", "Saisissez le solde réel."],
    fi_cb_ck_saved: ["Check saved. {g}", "Contrôle enregistré. {g}"], fi_cb_ck_match: ["The book matches.", "Le livre correspond."], fi_cb_ck_fix_label: ["Bank check correction", "Correction après contrôle banque"],
    fi_cb_checks: ["Bank checks", "Contrôles banque"], fi_cb_checks_none: ["No check yet. Type the real balance of an account to see if the book is right.", "Aucun contrôle. Saisissez le solde réel d'un compte pour voir si le livre est juste."],
    fi_cb_ck_c_book: ["Book", "Livre"], fi_cb_ck_c_real: ["Real", "Réel"], fi_cb_ck_c_gap: ["Gap", "Écart"],
    fi_cb_old_note: ["The forecast starts from the cash book total.", "La prévision part du total de la trésorerie."],
    fi_cb_open_book: ["Open the cash book", "Ouvrir la trésorerie"],
    fi_cb_exp_acct: ["Paid from account", "Payé depuis le compte"], fi_cb_pay_acct: ["Paid into account", "Encaissé sur le compte"], fi_cb_acct_default: ["First account", "Premier compte"],
    fi_log_cb: ["Cash book changed", "Trésorerie modifiée"]
  });

  var TYPES = ["in_other", "out_owner", "out_partner", "out_other", "transfer"];

  // ---------- data ----------
  function raw() { var c = (S.config() || {}).cash || {}; return { accounts: c.accounts || [], moves: c.moves || [], checks: c.checks || [] }; }
  function save(c) { return S.setConfig({ cash: c }); }
  function P() { return F.P(); }
  function rate(cur) {
    var r = ((S.config() || {}).rules) || {}, d = m.RULES_DEFAULT;
    return cur === "EUR" ? (r.eur != null ? +r.eur : d.eur) : cur === "USD" ? (r.usd != null ? +r.usd : d.usd) : 1;
  }
  function tnd(n, cur) { return (+n || 0) * rate(cur); }
  function r3(n) { return Math.round((+n || 0) * 1000) / 1000; }
  function sign(type) { return type.indexOf("in_") === 0 ? 1 : -1; }

  /** All movements up to today with running balances, or null when there is no account. Must not call m.rules() (it calls this). */
  function ledger() {
    var c = raw(); if (!c.accounts.length) return null;
    var today = u.today(), accs = c.accounts, def = accs[0].id, byId = {}, rows = [], n = 0;
    accs.forEach(function (a) { byId[a.id] = a; });
    function acc(id) { return byId[id] ? id : def; }
    function add(r) { r.n = n++; rows.push(r); }
    accs.forEach(function (a) { add({ date: a.date || today, acct: a.id, delta: +a.opening || 0, kind: "open", label: t("fi_cb_src_open") }); });
    var first = accs.map(function (a) { return a.date || today; }).sort()[0];
    (S.all("invoices") || []).forEach(function (i) {
      (i.payments || []).forEach(function (p) {
        if (!p.date || !(+p.net)) return;
        add({ date: p.date, acct: acc(p.account), delta: tnd(p.net, i.currency || "TND"), kind: "pay", label: (i.no || "") + " " + (m.brand ? m.brand(i.clientId) || "" : ""), sub: t("fi_cb_src_pay") });
      });
    });
    var nm = 1;
    if (first) nm = Math.max(1, Math.min(120, (+today.slice(0, 4) - +first.slice(0, 4)) * 12 + (+today.slice(5, 7) - +first.slice(5, 7)) + 1));
    X.months(nm).forEach(function (ym) {
      X.expensesIn(ym).forEach(function (e) {
        add({ date: e.date, acct: acc(e.account), delta: -(+e.amount || 0), kind: "exp", label: e.label || "", sub: t("fi_cb_src_exp") });
      });
    });
    c.moves.forEach(function (mv) {
      var a = +mv.amount || 0, label = mv.label || t("fi_cb_ty_" + mv.type);
      if (mv.type === "transfer") {
        add({ date: mv.date, acct: acc(mv.account), delta: -a, kind: "transfer", mid: mv.id, label: label, sub: t("fi_cb_src_transfer") });
        add({ date: mv.date, acct: acc(mv.to), delta: a, kind: "transfer", mid: mv.id, label: label, sub: t("fi_cb_src_transfer"), second: true });
      } else add({ date: mv.date, acct: acc(mv.account), delta: sign(mv.type) * a, kind: "move", mid: mv.id, label: label, sub: t("fi_cb_ty_" + mv.type) });
    });
    rows = rows.filter(function (r) { return r.date && r.date <= today && (r.kind === "open" || r.date >= (byId[r.acct].date || "")); });
    rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.kind === "open" ? 0 : 1) - (b.kind === "open" ? 0 : 1) || a.n - b.n; });
    var bal = {}, tot = 0;
    accs.forEach(function (a) { bal[a.id] = 0; });
    rows.forEach(function (r) { bal[r.acct] += r.delta; tot += r.delta; r.balA = r3(bal[r.acct]); r.balT = r3(tot); });
    return { accounts: accs, rows: rows, bal: bal, total: r3(tot), checks: c.checks };
  }
  /** Cash book total in TND, or null when there are no accounts (the old opening-cash number applies). */
  m.cashTotal = function () { var l = ledger(); return l ? l.total : null; };
  FIN.cash = { ledger: ledger, accounts: function () { return raw().accounts; } };
  /** A select for "which account" in other forms; empty string when no account exists. */
  FIN.accountField = function (id, label, value) {
    var accs = raw().accounts; if (!accs.length) return "";
    return ui.field({ id: id, label: label, type: "select", value: value || "", options: [["", t("fi_cb_acct_default") + " (" + accs[0].name + ")"]].concat(accs.map(function (a) { return [a.id, a.name]; })) });
  };
  function acctName(id) { var a = raw().accounts.filter(function (x) { return x.id === id; })[0]; return a ? a.name : "—"; }

  // ---------- page ----------
  function render() {
    var l = ledger(), p = P(), cur = u.month(u.today());
    var h = "";
    if (!l) {
      h += ui.kpis([{ lab: t("fi_cb_k_now"), v: F.fm(+((S.config() || {}).rules || {}).openingCash || 0), n: t("fi_cb_none_old") }]);
      h += '<section class="panel"><h3 class="sec">' + esc(t("fi_cb_none_t")) + '</h3><p class="small" style="margin:0">' + esc(t("fi_cb_none")) + " " + esc(t("fi_cb_none_old")) + "</p>" +
        (F.canW() ? '<div class="row">' + ui.btn(t("fi_cb_add_account"), "fi-cb-acc-new", { cls: "primary" }) + "</div>" : "") + "</section>";
      return h;
    }
    var ym = p.cbMonth == null ? cur : p.cbMonth, ac = p.cbAcct || "";
    if (ac && !l.bal.hasOwnProperty(ac)) ac = "";
    var months = {}; months[cur] = 1; l.rows.forEach(function (r) { months[u.month(r.date)] = 1; });
    var mlist = Object.keys(months).sort().reverse();
    var scope = l.rows.filter(function (r) { return (!ym || u.month(r.date) === ym) && (!ac || r.acct === ac); });
    var flow = scope.filter(function (r) { return r.kind === "pay" || r.kind === "exp" || r.kind === "move"; });
    var inn = u.sum(flow, function (r) { return r.delta > 0 ? r.delta : 0; }), out = u.sum(flow, function (r) { return r.delta < 0 ? -r.delta : 0; });
    var scopeNote = (ym ? u.fmtMonth(ym) : t("fi_cb_k_all")) + (ac ? ", " + acctName(ac) : "");
    h += ui.kpis([
      { lab: t("fi_cb_k_now"), v: F.fm(ac ? l.bal[ac] : l.total), n: ac ? t("fi_cb_k_now_acc") : l.accounts.length === 1 ? t("fi_cb_k_now_1") : t("fi_cb_k_now_n", { n: l.accounts.length }) },
      { lab: t("fi_cb_k_in"), v: F.fm(inn), n: scopeNote }, { lab: t("fi_cb_k_out"), v: F.fm(out), n: scopeNote }, { lab: t("fi_cb_k_net"), v: F.fm(inn - out), n: scopeNote }
    ]);

    // accounts
    var lastCk = {}; l.checks.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || "") || (a.at || 0) - (b.at || 0); }).forEach(function (c) { lastCk[c.account] = c; });
    h += '<section class="stack"><div class="row between"><h3 class="sec">' + esc(t("fi_cb_accounts")) + "</h3>" + (F.canW() ? ui.btn(t("fi_cb_add_account"), "fi-cb-acc-new", { cls: "ghost sm" }) : "") +
      '</div><div class="tbl"><table style="min-width:640px"><thead><tr><th>' + esc(t("fi_cb_c_account")) + '</th><th class="r">' + esc(t("fi_cb_c_balance")) + "</th><th>" + esc(t("fi_cb_c_opening")) + "</th><th>" + esc(t("fi_cb_c_check")) + "</th><th></th></tr></thead><tbody>";
    l.accounts.forEach(function (a) {
      var ck = lastCk[a.id], gap = ck ? r3(ck.gap) : 0;
      h += "<tr><td><strong>" + esc(a.name) + '</strong></td><td class="r num">' + F.fm(l.bal[a.id]) + '</td><td class="small">' + esc(t("fi_cb_opening_on", { a: F.fm(a.opening), d: u.fmtDate(a.date) })) + '</td><td class="small">' +
        (ck ? esc(t("fi_cb_check_line", { d: u.fmtDate(ck.date), g: gap ? t("fi_cb_gap_n", { g: F.fmP(gap) }) : t("fi_cb_gap_ok") })) : '<span class="muted">' + esc(t("fi_cb_no_check")) + "</span>") +
        '</td><td class="r"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">' + (F.canW() ? ui.btn(t("fi_cb_check_btn"), "fi-cb-check", { cls: "ghost sm", data: { id: a.id } }) + ui.btn(t("edit"), "fi-cb-acc-edit", { cls: "ghost sm", data: { id: a.id } }) + ui.btn(t("del"), "fi-cb-acc-del", { cls: "ghost sm", data: { id: a.id } }) : "") + "</div></td></tr>";
    });
    h += "</tbody><tfoot><tr><td>" + esc(t("fi_cb_total")) + '</td><td class="r num">' + F.fm(l.total) + '</td><td colspan="3"></td></tr></tfoot></table></div></section>';

    // filters
    h += '<div class="row" style="align-items:flex-end"><div style="min-width:180px">' + ui.field({ id: "fi-cb-month", label: t("fi_cb_month"), type: "select", value: ym,
      options: [["", t("fi_cb_all_months")]].concat(mlist.map(function (k) { return [k, u.fmtMonth(k)]; })), attrs: ' data-c="fi-cb-filter"' }) + '</div><div style="min-width:180px">' +
      ui.field({ id: "fi-cb-acct", label: t("fi_cb_acct_f"), type: "select", value: ac, options: [["", t("fi_cb_all_accts")]].concat(l.accounts.map(function (a) { return [a.id, a.name]; })), attrs: ' data-c="fi-cb-filter"' }) +
      "</div>" + (F.canW() ? '<span class="right">' + ui.btn(t("fi_cb_add_move"), "fi-cb-mv-new", { cls: "primary" }) + "</span>" : "") + "</div>";

    // movements, newest first
    if (!scope.length) h += ui.empty(t("fi_cb_empty"));
    else {
      h += '<div class="tbl"><table style="min-width:760px"><thead><tr><th>' + esc(t("fi_cb_c_date")) + "</th><th>" + esc(t("fi_cb_c_what")) + "</th><th>" + esc(t("fi_cb_c_acct")) + '</th><th class="r">' + esc(t("fi_cb_c_in")) +
        '</th><th class="r">' + esc(t("fi_cb_c_out")) + '</th><th class="r">' + esc(t("fi_cb_c_bal")) + "</th><th></th></tr></thead><tbody>";
      scope.slice().reverse().forEach(function (r) {
        h += "<tr><td>" + esc(u.fmtDate(r.date)) + "</td><td>" + esc(r.label) + '<br><span class="small muted">' + esc(r.sub || "") + '</span></td><td class="small">' + esc(acctName(r.acct)) + '</td><td class="r num">' + (r.delta > 0 ? F.fmP(r.delta) : "") +
          '</td><td class="r num">' + (r.delta < 0 ? F.fmP(-r.delta) : "") + '</td><td class="r num">' + F.fm(ac ? r.balA : r.balT) + '</td><td class="r">' +
          (r.mid && F.canW() && !r.second ? '<div class="row" style="justify-content:flex-end;flex-wrap:nowrap">' + ui.btn(t("edit"), "fi-cb-mv-edit", { cls: "ghost sm", data: { id: r.mid } }) + ui.btn(t("del"), "fi-cb-mv-del", { cls: "ghost sm", data: { id: r.mid } }) + "</div>" : "") + "</td></tr>";
      });
      h += "</tbody></table></div>";
    }

    // checks history
    h += '<section class="stack"><h3 class="sec">' + esc(t("fi_cb_checks")) + "</h3>";
    var cks = l.checks.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || (b.at || 0) - (a.at || 0); }).slice(0, 8);
    if (!cks.length) h += '<p class="small muted" style="margin:0">' + esc(t("fi_cb_checks_none")) + "</p>";
    else {
      h += '<div class="tbl"><table style="min-width:520px"><thead><tr><th>' + esc(t("fi_cb_c_date")) + "</th><th>" + esc(t("fi_cb_c_acct")) + '</th><th class="r">' + esc(t("fi_cb_ck_c_book")) + '</th><th class="r">' + esc(t("fi_cb_ck_c_real")) + '</th><th class="r">' + esc(t("fi_cb_ck_c_gap")) + "</th></tr></thead><tbody>";
      cks.forEach(function (c) { h += "<tr><td>" + esc(u.fmtDate(c.date)) + "</td><td>" + esc(acctName(c.account)) + '</td><td class="r num">' + F.fmP(c.book) + '</td><td class="r num">' + F.fmP(c.real) + '</td><td class="r num">' + (r3(c.gap) ? ui.pill(F.fmP(c.gap), "alert") : ui.pill(t("fi_cb_gap_ok"), "done")) + "</td></tr>"; });
      h += "</tbody></table></div>";
    }
    h += '</section><p class="small muted" style="margin:0">' + esc(t("fi_cb_note")) + "</p>";
    return h;
  }
  GK.change("fi-cb-filter", function () { P().cbMonth = u.val("fi-cb-month"); P().cbAcct = u.val("fi-cb-acct"); ui.render(true); });

  // ---------- accounts ----------
  function accForm(a) {
    var editing = !!a; a = a || { name: "", opening: 0, date: u.today() };
    var body = '<div class="form">' + ui.field({ id: "fi-cb-a-name", label: t("fi_cb_f_name"), value: a.name, span: true }) +
      ui.field({ id: "fi-cb-a-open", label: t("fi_cb_f_open"), type: "number", value: a.opening, attrs: ' step="0.01"' }) +
      ui.field({ id: "fi-cb-a-date", label: t("fi_cb_f_open_date"), type: "date", value: a.date }) + "</div>";
    ui.modal({ title: t(editing ? "fi_cb_acc_edit_t" : "fi_cb_acc_new_t"), accent: t(editing ? "fi_cb_acc_edit_a" : "fi_cb_acc_new_a"), body: body,
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "fi-cb-acc-save", { cls: "primary", data: { id: editing ? a.id : "" } }) });
  }
  GK.act("fi-cb-acc-new", function () { if (!F.canW()) return ui.toast(t("fi_cb_founder")); accForm(null); });
  GK.act("fi-cb-acc-edit", function (el) { var a = raw().accounts.filter(function (x) { return x.id === el.dataset.id; })[0]; if (a && F.canW()) accForm(a); });
  GK.act("fi-cb-acc-save", function (el) {
    if (!F.canW()) return ui.toast(t("fi_cb_founder"));
    var name = u.val("fi-cb-a-name").trim(), opening = r3(u.numVal("fi-cb-a-open")), date = u.val("fi-cb-a-date");
    if (!name) { u.focus("fi-cb-a-name"); return ui.toast(t("fi_cb_need_name")); }
    if (!date) { u.focus("fi-cb-a-date"); return ui.toast(t("fi_cb_need_date")); }
    var c = raw(), id = el.dataset.id;
    if (id) c.accounts = c.accounts.map(function (a) { return a.id === id ? Object.assign({}, a, { name: name, opening: opening, date: date }) : a; });
    else c.accounts.push({ id: u.uid("ac"), name: name, opening: opening, date: date });
    save(c); ui.closeModal(true); ui.toast(t("saved"));
  });
  GK.act("fi-cb-acc-del", function (el) {
    if (!F.canW()) return;
    var c = raw(), a = c.accounts.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!a) return;
    ui.confirm(t("fi_cb_acc_del_q"), t("fi_cb_acc_del_body", { n: a.name }), function () {
      var cc = raw(); cc.accounts = cc.accounts.filter(function (x) { return x.id !== a.id; });
      cc.checks = cc.checks.filter(function (x) { return x.account !== a.id; });
      save(cc); P().cbAcct = ""; ui.toast(t("fi_cb_acc_deleted"));
    }, t("del"));
  });

  // ---------- manual movements ----------
  function mvForm(mv) {
    var accs = raw().accounts; if (!accs.length) return ui.toast(t("fi_cb_need_acct"));
    var editing = !!mv; mv = mv || { type: "out_owner", date: u.today(), amount: "", account: accs[0].id, to: accs[1] ? accs[1].id : accs[0].id, label: "", note: "" };
    var opts = accs.map(function (a) { return [a.id, a.name]; });
    var body = '<div class="form">' + ui.field({ id: "fi-cb-m-type", label: t("fi_cb_f_type"), type: "select", value: mv.type, options: TYPES.map(function (k) { return [k, t("fi_cb_ty_" + k)]; }), span: true }) +
      ui.field({ id: "fi-cb-m-amount", label: t("fi_cb_f_amount"), type: "number", value: mv.amount, attrs: ' min="0" step="0.01"' }) +
      ui.field({ id: "fi-cb-m-date", label: t("fi_cb_f_date"), type: "date", value: mv.date }) +
      ui.field({ id: "fi-cb-m-acct", label: t("fi_cb_f_acct"), type: "select", value: mv.account, options: opts }) +
      ui.field({ id: "fi-cb-m-to", label: t("fi_cb_f_to"), type: "select", value: mv.to, options: opts }) +
      ui.field({ id: "fi-cb-m-label", label: t("fi_cb_f_label"), value: mv.label || "", span: true }) +
      ui.field({ id: "fi-cb-m-note", label: t("fi_cb_f_note"), value: mv.note || "", span: true }) + "</div>";
    ui.modal({ title: t(editing ? "fi_cb_mv_edit_t" : "fi_cb_mv_new_t"), accent: t(editing ? "fi_cb_mv_edit_a" : "fi_cb_mv_new_a"), body: body,
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "fi-cb-mv-save", { cls: "primary", data: { id: editing ? mv.id : "" } }) });
  }
  GK.act("fi-cb-mv-new", function () { if (!F.canW()) return ui.toast(t("fi_cb_founder")); mvForm(null); });
  GK.act("fi-cb-mv-edit", function (el) { var mv = raw().moves.filter(function (x) { return x.id === el.dataset.id; })[0]; if (mv && F.canW()) mvForm(mv); });
  GK.act("fi-cb-mv-save", function (el) {
    if (!F.canW()) return ui.toast(t("fi_cb_founder"));
    var type = u.val("fi-cb-m-type"), amount = r3(u.numVal("fi-cb-m-amount")), date = u.val("fi-cb-m-date"), acct = u.val("fi-cb-m-acct"), to = u.val("fi-cb-m-to");
    if (TYPES.indexOf(type) < 0) return;
    if (!(amount > 0)) { u.focus("fi-cb-m-amount"); return ui.toast(t("fi_cb_need_amount")); }
    if (!date) { u.focus("fi-cb-m-date"); return ui.toast(t("fi_cb_need_date")); }
    if (type === "transfer" && acct === to) { u.focus("fi-cb-m-to"); return ui.toast(t("fi_cb_need_two")); }
    var f = { type: type, amount: amount, date: date, account: acct, to: type === "transfer" ? to : "", label: u.val("fi-cb-m-label").trim(), note: u.val("fi-cb-m-note").trim() };
    var c = raw(), id = el.dataset.id;
    if (id) c.moves = c.moves.map(function (x) { return x.id === id ? Object.assign({}, x, f) : x; });
    else c.moves.push(Object.assign({ id: u.uid("mv") }, f));
    save(c); ui.closeModal(true); ui.toast(t("saved"));
  });
  GK.act("fi-cb-mv-del", function (el) {
    if (!F.canW()) return;
    var mv = raw().moves.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!mv) return;
    ui.confirm(t("fi_cb_mv_del_q"), t("fi_cb_mv_del_body", { l: mv.label || t("fi_cb_ty_" + mv.type), a: F.fmP(mv.amount) }), function () {
      var c = raw(); c.moves = c.moves.filter(function (x) { return x.id !== mv.id; }); save(c); ui.toast(t("fi_cb_mv_deleted"));
    }, t("del"));
  });

  // ---------- check against the bank ----------
  GK.act("fi-cb-check", function (el) {
    if (!F.canW()) return ui.toast(t("fi_cb_founder"));
    var l = ledger(), a = l && l.accounts.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!a) return;
    var book = r3(l.bal[a.id]);
    var body = '<p class="small muted" style="margin:0">' + esc(a.name + " · " + t("fi_cb_ck_book", { a: F.fmP(book), d: u.fmtDate(u.today()) })) + "</p><div class=\"form\">" +
      ui.field({ id: "fi-cb-k-real", label: t("fi_cb_ck_real"), type: "number", value: "", hint: t("fi_cb_ck_real_h"), attrs: ' step="0.01" data-c="fi-cb-gap"', span: true }) +
      '<p id="fi-cb-k-gap" class="note strong" style="grid-column:1/-1;margin:0" data-book="' + book + '"></p>' +
      ui.field({ id: "fi-cb-k-fix", label: t("fi_cb_ck_fix"), type: "checkbox", value: false, hint: t("fi_cb_ck_fix_h") }) + "</div>";
    ui.modal({ title: t("fi_cb_ck_t"), accent: t("fi_cb_ck_a"), body: body,
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "fi-cb-check-save", { cls: "primary", data: { id: a.id } }) });
  });
  GK.change("fi-cb-gap", function () {
    var out = document.getElementById("fi-cb-k-gap"); if (!out) return;
    var raw0 = u.val("fi-cb-k-real"); if (raw0 === "") { out.textContent = ""; return; }
    out.textContent = t("fi_cb_ck_gap", { g: F.fmP(r3(u.numVal("fi-cb-k-real") - (+out.dataset.book || 0))) });
  });
  GK.act("fi-cb-check-save", function (el) {
    if (!F.canW()) return ui.toast(t("fi_cb_founder"));
    var l = ledger(), a = l && l.accounts.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!a) return ui.closeModal();
    if (u.val("fi-cb-k-real") === "") { u.focus("fi-cb-k-real"); return ui.toast(t("fi_cb_ck_need")); }
    var real = r3(u.numVal("fi-cb-k-real")), book = r3(l.bal[a.id]), gap = r3(real - book), today = u.today();
    var c = raw(); c.checks.push({ id: u.uid("ck"), account: a.id, date: today, book: book, real: real, gap: gap, at: Date.now() });
    if (gap && u.checked("fi-cb-k-fix")) c.moves.push({ id: u.uid("mv"), type: gap > 0 ? "in_other" : "out_other", amount: Math.abs(gap), date: today, account: a.id, to: "", label: t("fi_cb_ck_fix_label"), note: "" });
    save(c); ui.closeModal(true);
    ui.toast(gap ? t("fi_cb_ck_saved", { g: t("fi_cb_ck_gap", { g: F.fmP(gap) }) }) : t("fi_cb_ck_saved", { g: t("fi_cb_ck_match") }));
  });

  FIN.tabs.cash = { render: render };
})(window.GK);
