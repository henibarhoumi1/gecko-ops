/* GECKO Ops · finance: Quotes (devis). Draft, send (number Q-YYYY-NNN), accept (creates the invoice drafts), document, copy as text or WhatsApp.
   Rule: no discounts. A lower total is shown as extra deliverables at price 0, never as a cheaper price. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, FIN = GK.fin, F = FIN.u;

  GK.i18n.add({
    fi_q_new: ["New quote", "Nouveau devis"], fi_q_new_t: ["New", "Nouveau"], fi_q_new_a: ["quote", "devis"], fi_q_edit_t: ["Edit", "Modifier"], fi_q_edit_a: ["draft", "brouillon"],
    fi_q_st_draft: ["Draft", "Brouillon"], fi_q_st_sent: ["Sent", "Envoyé"], fi_q_st_accepted: ["Accepted", "Accepté"], fi_q_st_declined: ["Declined", "Refusé"], fi_q_st_expired: ["Expired", "Expiré"],
    fi_q_f_all: ["All", "Tous"], fi_q_f_open: ["Open", "En cours"], fi_q_f_draft: ["Drafts", "Brouillons"], fi_q_f_accepted: ["Accepted", "Acceptés"], fi_q_f_closed: ["Declined or expired", "Refusés ou expirés"],
    fi_q_k_open: ["Open quote value", "Valeur des devis ouverts"], fi_q_k_open_n: ["{n} quotes waiting for an answer", "{n} devis en attente de réponse"], fi_q_k_open_1: ["1 quote waiting for an answer", "1 devis en attente de réponse"],
    fi_q_k_rate: ["Conversion rate", "Taux de conversion"], fi_q_k_rate_n: ["{a} accepted of {d} answered or expired", "{a} acceptés sur {d} répondus ou expirés"], fi_q_k_rate_none: ["No answered quote yet", "Aucun devis répondu pour l'instant"],
    fi_q_k_won: ["Accepted this year", "Acceptés cette année"], fi_q_k_won_n: ["{n} quotes", "{n} devis"], fi_q_k_won_1: ["1 quote", "1 devis"],
    fi_q_c_no: ["Number", "Numéro"], fi_q_c_client: ["Client", "Client"], fi_q_c_title: ["Quote", "Devis"], fi_q_c_total: ["Total", "Total"], fi_q_c_valid: ["Valid until", "Valable jusqu'au"], fi_q_c_status: ["Status", "Statut"],
    fi_q_none: ["No quotes here.", "Aucun devis ici."], fi_q_draft: ["Draft", "Brouillon"], fi_q_back: ["All quotes", "Tous les devis"],
    fi_q_f_client: ["Client", "Client"], fi_q_f_pack: ["Pack", "Pack"], fi_q_custom: ["Custom lines", "Lignes libres"], fi_q_f_title: ["Quote title", "Titre du devis"], fi_q_f_valid: ["Valid until", "Valable jusqu'au"],
    fi_q_f_note: ["Note for the client (optional)", "Note pour le client (facultatif)"], fi_q_lines: ["Lines", "Lignes"], fi_q_l_label: ["Description", "Désignation"], fi_q_l_qty: ["Qty", "Qté"], fi_q_l_price: ["Unit price (DT)", "Prix unitaire (DT)"],
    fi_q_lines_h: ["Quantity × price. To give more, add a line at 0 DT (an extra reel, extra hook variations). Never lower the price.", "Quantité × prix. Pour offrir plus, ajoutez une ligne à 0 DT (un reel en plus, des variantes d'accroche en plus). Ne baissez jamais le prix."],
    fi_q_total: ["Total", "Total"], fi_q_pack_line: ["pack", "pack"], fi_q_included: ["Included", "Inclus"],
    fi_q_need_line: ["Add at least one line with a description.", "Ajoutez au moins une ligne avec une désignation."], fi_q_need_total: ["The total must be above zero.", "Le total doit être supérieur à zéro."],
    fi_q_need_valid: ["Pick a validity date.", "Choisissez une date de validité."], fi_q_no_clients: ["Add a client first.", "Ajoutez d'abord un client."],
    fi_q_founder: ["Only Heni can change quotes.", "Seul Heni peut modifier les devis."],
    fi_q_facts_pack: ["Pack", "Pack"], fi_q_facts_sent: ["Sent", "Envoyé le"], fi_q_facts_acc: ["Accepted", "Accepté le"], fi_q_facts_project: ["Project", "Projet"], fi_q_facts_inv: ["Invoices", "Factures"],
    fi_q_send: ["Send", "Envoyer"], fi_q_send_q: ["Send this quote?", "Envoyer ce devis ?"], fi_q_send_body: ["It gets number {no} and is valid until {d}. After this the lines and the total are locked.", "Il reçoit le numéro {no} et reste valable jusqu'au {d}. Ensuite les lignes et le total sont verrouillés."],
    fi_q_sent_toast: ["Quote {no} marked as sent. Copy the WhatsApp message to send it.", "Devis {no} marqué comme envoyé. Copiez le message WhatsApp pour l'envoyer."],
    fi_q_locked: ["Sent quotes are locked. To change one, duplicate it as a new draft.", "Un devis envoyé est verrouillé. Pour le changer, dupliquez-le en nouveau brouillon."],
    fi_q_del: ["Delete draft", "Supprimer le brouillon"], fi_q_del_q: ["Delete this draft?", "Supprimer ce brouillon ?"], fi_q_del_body: ["It was never sent, so no number is lost.", "Il n'a jamais été envoyé, aucun numéro n'est perdu."], fi_q_deleted: ["Draft deleted", "Brouillon supprimé"],
    fi_q_dup: ["Duplicate as draft", "Dupliquer en brouillon"], fi_q_extend: ["Extend 14 days", "Prolonger de 14 jours"], fi_q_extended: ["Valid until {d}", "Valable jusqu'au {d}"],
    fi_q_accept: ["Accepted", "Accepté"], fi_q_decline: ["Declined", "Refusé"], fi_q_decline_q: ["Mark as declined?", "Marquer comme refusé ?"], fi_q_decline_body: ["{no} for {b}. You can still duplicate it later.", "{no} pour {b}. Vous pourrez le dupliquer plus tard."],
    fi_q_decline_done: ["Marked as declined", "Marqué comme refusé"],
    fi_q_acc_t: ["Quote", "Devis"], fi_q_acc_a: ["accepted", "accepté"], fi_q_acc_intro: ["{no} · {b} · {a}. What should happen with the invoices?", "{no} · {b} · {a}. Que faire pour les factures ?"],
    fi_q_acc_proj: ["Project", "Projet"], fi_q_acc_new: ["New project (opens the New project form)", "Nouveau projet (ouvre le formulaire Nouveau projet)"],
    fi_q_acc_drafts: ["No project yet: just create the draft invoices", "Pas encore de projet : créer seulement les factures brouillons"],
    fi_q_acc_h: ["Invoices follow the packs rules: 50% deposit and 50% balance, or one month for SKIN. They stay drafts until you issue them.", "Les factures suivent les règles des packs : 50 % d'acompte et 50 % de solde, ou un mois pour SKIN. Elles restent des brouillons jusqu'à leur émission."],
    fi_q_acc_go: ["Mark accepted", "Marquer accepté"], fi_q_acc_done_inv: ["Quote accepted, {n} draft invoices linked", "Devis accepté, {n} factures brouillons liées"],
    fi_q_acc_done_proj: ["Quote accepted. Create the project; its invoices can then be linked from this quote.", "Devis accepté. Créez le projet ; ses factures pourront ensuite être liées depuis ce devis."],
    fi_q_acc_done: ["Quote accepted", "Devis accepté"],
    fi_q_noinv: ["No invoices linked yet.", "Aucune facture liée pour l'instant."], fi_q_make_inv: ["Create the draft invoices", "Créer les factures brouillons"], fi_q_link_inv: ["Link a project's invoices", "Lier les factures d'un projet"],
    fi_q_link_t: ["Link", "Lier"], fi_q_link_a: ["invoices", "factures"], fi_q_link_go: ["Link", "Lier"], fi_q_link_none: ["This client has no project yet.", "Ce client n'a pas encore de projet."], fi_q_linked: ["Invoices linked", "Factures liées"],
    fi_q_doc: ["Quote document", "Document du devis"], fi_q_doc_t: ["Quote", "Devis"], fi_q_doc_a: ["document", "document"], fi_q_copy_text: ["Copy as text", "Copier en texte"], fi_q_copy_wa: ["Copy WhatsApp message", "Copier le message WhatsApp"],
    fi_q_d_quote: ["Quote", "Devis"], fi_q_d_for: ["Prepared for", "Établi pour"], fi_q_d_issued: ["Sent", "Envoyé le"], fi_q_d_valid: ["Valid until", "Valable jusqu'au"], fi_q_d_valid_for: ["valid until {d}", "valable jusqu'au {d}"],
    fi_q_d_desc: ["Description", "Désignation"], fi_q_d_qty: ["Qty", "Qté"], fi_q_d_price: ["Price", "Prix"], fi_q_d_line: ["Total", "Total"], fi_q_d_draft: ["Draft, not sent", "Brouillon, non envoyé"],
    fi_q_d_terms: ["Terms", "Conditions"],
    fi_q_terms_once: ["A 50% deposit confirms the booking. The balance of 50% is due on delivery. Final files are released once the balance is paid.", "Un acompte de 50 % confirme la réservation. Le solde de 50 % est dû à la livraison. Les fichiers finaux sont remis une fois le solde payé."],
    fi_q_terms_month: ["The month is paid upfront. Minimum commitment of 3 months.", "Le mois est payé d'avance. Engagement minimum de 3 mois."],
    fi_q_terms_stamp: ["Prices in Tunisian dinars. Stamp duty is added on each invoice.", "Prix en dinars tunisiens. Le droit de timbre est ajouté sur chaque facture."],
    fi_q_terms_pay: ["Payment by bank transfer, cash, cheque or D17.", "Paiement par virement, espèces, chèque ou D17."],
    fi_q_wa: ["Hello {name}, here is your {co} quote {no}: {title}. Total {total}, valid until {d}.\n{terms}\nReply here to confirm and we'll send the deposit details.\n{co} · {phone}",
      "Bonjour {name}, voici votre devis {co} {no} : {title}. Total {total}, valable jusqu'au {d}.\n{terms}\nRépondez ici pour confirmer et nous vous enverrons les coordonnées pour l'acompte.\n{co} · {phone}"],
    fi_q_wa_once: ["50% deposit to confirm, balance on delivery.", "50 % d'acompte pour confirmer, solde à la livraison."], fi_q_wa_month: ["First month upfront, 3 months minimum.", "Premier mois d'avance, 3 mois minimum."],
    fi_q_hist: ["History", "Historique"],
    fi_log_q_created: ["Quote draft created", "Brouillon de devis créé"], fi_log_q_edited: ["Quote draft edited", "Brouillon de devis modifié"], fi_log_q_sent: ["Sent as {no}", "Envoyé sous le numéro {no}"],
    fi_log_q_acc: ["Accepted", "Accepté"], fi_log_q_dec: ["Declined", "Refusé"], fi_log_q_ext: ["Validity extended to {d}", "Validité prolongée jusqu'au {d}"],
    fi_log_q_inv: ["Draft invoices created from quote {no}", "Factures brouillons créées depuis le devis {no}"], fi_log_q_link: ["Invoices linked from the quote", "Factures liées depuis le devis"],
    fi_inv_dep: ["deposit", "acompte"], fi_inv_bal: ["balance", "solde"]
  });

  // ---------- helpers ----------
  function quotes() { return S.all("quotes"); }
  function canW() { return F.canW(); }
  function wBtn(label, a, o) { o = o || {}; if (!canW()) { o.disabled = true; o.title = t("fi_q_founder"); } return ui.btn(label, a, o); }
  /** Stored status, with "expired" computed from the validity date for a quote still waiting for an answer. */
  function qStatus(q) { return q.status === "sent" && q.validUntil && q.validUntil < u.today() ? "expired" : (q.status || "draft"); }
  function lineTotal(l) { return F.r3((+l.qty || 0) * (+l.price || 0)); }
  function totalOf(lines) { return F.r3(u.sum(lines || [], lineTotal)); }
  function nextQuoteNo() {
    var y = u.year(u.today()), max = 0;
    quotes().forEach(function (q) { var x = /^Q-(\d{4})-(\d+)$/.exec(q.no || ""); if (x && x[1] === y) max = Math.max(max, +x[2]); });
    return "Q-" + y + "-" + String(max + 1).padStart(3, "0");
  }
  function pillOf(q) { var s = qStatus(q); return ui.pill(t("fi_q_st_" + s), { draft: "", sent: "wip", accepted: "done", declined: "", expired: "alert" }[s]); }
  function belowPack(q) { var pk = q.pack ? m.pack(q.pack) : null; return !!pk && pk.price > 0 && (+q.amount || 0) > 0 && (+q.amount || 0) < pk.price - 0.001; }
  function isMonthly(q) { return !!q.pack && !!m.pack(q.pack).monthly; }
  function termsList(q) { return [t(isMonthly(q) ? "fi_q_terms_month" : "fi_q_terms_once"), t("fi_q_terms_stamp"), t("fi_q_terms_pay")]; }
  function titleOf(q) { return q.title || (q.pack ? m.pack(q.pack).name : t("fi_q_custom")); }
  function P() { return F.P(); }

  // ---------- list ----------
  function matches(q, f) {
    var s = qStatus(q);
    if (f === "open") return s === "sent";
    if (f === "draft") return s === "draft";
    if (f === "accepted") return s === "accepted";
    if (f === "closed") return s === "declined" || s === "expired";
    return true;
  }
  function kpis() {
    var all = quotes(), open = all.filter(function (q) { return qStatus(q) === "sent"; });
    var acc = all.filter(function (q) { return qStatus(q) === "accepted"; }), dec = all.filter(function (q) { var s = qStatus(q); return s === "declined" || s === "expired"; });
    var decided = acc.length + dec.length, year = u.year(u.today());
    var accYear = acc.filter(function (q) { return u.year(q.acceptedOn || q.sentOn) === year; });
    return ui.kpis([
      { lab: t("fi_q_k_open"), v: F.fm(u.sum(open, function (q) { return q.amount; })), n: open.length === 1 ? t("fi_q_k_open_1") : t("fi_q_k_open_n", { n: open.length }) },
      { lab: t("fi_q_k_rate"), v: decided ? u.pct(acc.length / decided * 100) : "—", n: decided ? t("fi_q_k_rate_n", { a: acc.length, d: decided }) : t("fi_q_k_rate_none") },
      { lab: t("fi_q_k_won"), v: F.fm(u.sum(accYear, function (q) { return q.amount; })), n: accYear.length === 1 ? t("fi_q_k_won_1") : t("fi_q_k_won_n", { n: accYear.length }) }
    ]);
  }
  function listHTML() {
    var f = P().qFilter || "all";
    var rows = quotes().filter(function (q) { return matches(q, f); }).sort(function (a, b) {
      if (!a.no !== !b.no) return a.no ? 1 : -1;
      return (b.no || "").localeCompare(a.no || "");
    });
    var h = kpis() + '<div class="row" role="group">' + ["all", "open", "draft", "accepted", "closed"].map(function (k) {
      var n = quotes().filter(function (q) { return matches(q, k); }).length;
      return ui.btn(t("fi_q_f_" + k) + " · " + n, "fi-q-filter", { cls: "sm" + (f === k ? " primary" : ""), data: { f: k } });
    }).join("") + (canW() ? '<span class="right">' + ui.btn(t("fi_q_new"), "fi-q-new", { cls: "primary sm" }) + "</span>" : "") + "</div>";
    if (!rows.length) return h + ui.empty(t("fi_q_none"));
    h += '<div class="tbl"><table style="min-width:760px"><thead><tr><th>' + esc(t("fi_q_c_no")) + "</th><th>" + esc(t("fi_q_c_client")) + "</th><th>" + esc(t("fi_q_c_title")) + '</th><th class="r">' + esc(t("fi_q_c_total")) +
      "</th><th>" + esc(t("fi_q_c_valid")) + "</th><th>" + esc(t("fi_q_c_status")) + "</th></tr></thead><tbody>";
    rows.forEach(function (q) {
      h += '<tr class="click" tabindex="0" data-a="fi-q-open" data-id="' + esc(q.id) + '"><td class="code" style="word-break:normal;white-space:nowrap">' + (q.no ? esc(q.no) : '<span class="muted">' + esc(t("fi_q_draft")) + "</span>") + "</td><td>" +
        esc(m.brand(q.clientId)) + "</td><td>" + esc(titleOf(q)) + '</td><td class="r num">' + F.fmP(q.amount) + '</td><td class="small">' + esc(q.validUntil ? u.fmtDate(q.validUntil) : "—") + "</td><td>" + pillOf(q) + "</td></tr>";
    });
    return h + "</tbody></table></div>";
  }

  // ---------- one quote ----------
  function fact(lab, val) { return '<div class="stack" style="gap:3px"><span class="lab sm muted">' + esc(lab) + '</span><span class="num">' + val + "</span></div>"; }
  function detailHTML(q) {
    var s = qStatus(q), proj = q.projectId ? m.project(q.projectId) : null;
    var h = '<div class="row">' + ui.btn("← " + t("fi_q_back"), "fi-q-back", { cls: "ghost sm" }) + "</div>";
    h += '<section class="panel"><div class="panel-h"><div class="stack" style="gap:4px"><span class="lab sm muted">' + esc(t("fi_q_d_quote")) + '</span><h2 class="sec">' +
      esc(q.no || t("fi_q_draft")) + " · " + esc(m.brand(q.clientId)) + "</h2></div>" + pillOf(q) + "</div>";
    h += '<div class="grid3" style="gap:14px">' +
      fact(t("fi_q_c_title"), esc(titleOf(q))) + fact(t("fi_q_facts_pack"), esc(q.pack ? m.pack(q.pack).name : t("fi_q_custom"))) +
      fact(t("fi_q_c_total"), "<strong>" + F.fmP(q.amount) + "</strong>") + fact(t("fi_q_c_valid"), esc(q.validUntil ? F.longDate(q.validUntil) : "—")) +
      fact(t("fi_q_facts_sent"), esc(q.sentOn ? F.shortDate(q.sentOn) : "—")) + fact(t("fi_q_facts_acc"), esc(q.acceptedOn ? F.shortDate(q.acceptedOn) : "—")) +
      fact(t("fi_q_facts_project"), proj ? esc(m.projectLabel(proj)) : "—") + "</div>";
    h += '<div class="tbl"><table style="min-width:520px"><thead><tr><th>' + esc(t("fi_q_d_desc")) + '</th><th class="r">' + esc(t("fi_q_d_qty")) + '</th><th class="r">' + esc(t("fi_q_d_price")) + '</th><th class="r">' + esc(t("fi_q_d_line")) + "</th></tr></thead><tbody>";
    (q.lines || []).forEach(function (l) {
      h += "<tr><td>" + esc(l.label) + '</td><td class="r num">' + esc(l.qty) + '</td><td class="r num">' + F.fmP(l.price) + '</td><td class="r num">' + (+l.price ? F.fmP(lineTotal(l)) : esc(t("fi_q_included"))) + "</td></tr>";
    });
    h += '</tbody><tfoot><tr><td colspan="3">' + esc(t("fi_q_total")) + '</td><td class="r num">' + F.fmP(q.amount) + "</td></tr></tfoot></table></div>";
    if (belowPack(q)) h += '<p class="note" style="margin:0">' + esc(t("no_discount")) + "</p>";
    var a = [];
    if (s === "draft") {
      a.push(wBtn(t("fi_q_send"), "fi-q-send", { cls: "primary", data: { id: q.id } }));
      a.push(wBtn(t("edit"), "fi-q-edit", { data: { id: q.id } }));
      a.push(wBtn(t("fi_q_del"), "fi-q-del", { cls: "ghost", data: { id: q.id } }));
    } else if (s === "sent" || s === "expired") {
      a.push(wBtn(t("fi_q_accept"), "fi-q-accept", { cls: "primary", data: { id: q.id } }));
      a.push(wBtn(t("fi_q_decline"), "fi-q-decline", { data: { id: q.id } }));
      a.push(wBtn(t("fi_q_extend"), "fi-q-extend", { cls: "ghost", data: { id: q.id } }));
    }
    a.push(ui.btn(t("fi_q_doc"), "fi-q-doc", { data: { id: q.id } }));
    a.push(ui.btn(t("fi_q_copy_text"), "fi-q-copy", { data: { id: q.id } }));
    a.push(ui.btn(t("fi_q_copy_wa"), "fi-q-copy-wa", { data: { id: q.id } }));
    a.push(wBtn(t("fi_q_dup"), "fi-q-dup", { cls: "ghost", data: { id: q.id } }));
    h += '<div class="row">' + a.join("") + "</div>";
    if (q.no) h += '<p class="small muted" style="margin:0">' + esc(t("fi_q_locked")) + "</p>";
    if (q.note) h += '<p class="small" style="margin:0;white-space:pre-line">' + esc(q.note) + "</p>";
    h += "</section>";
    if (s === "accepted") {
      h += '<section class="stack"><h3 class="sec">' + esc(t("fi_q_facts_inv")) + "</h3>";
      var inv = (q.invoiceIds || []).map(function (id) { return S.get("invoices", id); }).filter(Boolean);
      if (!inv.length) {
        h += ui.empty(t("fi_q_noinv")) + '<div class="row">' + wBtn(t("fi_q_make_inv"), "fi-q-make", { cls: "primary sm", data: { id: q.id } }) + wBtn(t("fi_q_link_inv"), "fi-q-link", { cls: "sm", data: { id: q.id } }) + "</div>";
      } else {
        h += '<div class="list">' + inv.map(function (i) {
          return '<div class="li click" tabindex="0" data-a="fi-open" data-id="' + esc(i.id) + '"><div class="stack" style="gap:2px"><span>' + esc(i.label || "") + '</span><span class="m code">' + esc(i.no || t("fi_draft")) + "</span></div>" +
            '<div class="row" style="gap:8px"><span class="num">' + F.fmP(i.amount) + "</span>" + ui.invPill(i) + "</div></div>";
        }).join("") + "</div>";
      }
      h += "</section>";
    }
    if ((q.log || []).length) {
      h += '<section class="stack"><h3 class="sec">' + esc(t("fi_q_hist")) + '</h3><div class="list">' + q.log.slice().reverse().map(function (l) {
        return '<div class="li"><span>' + esc(l.text) + '</span><span class="m">' + esc(m.member(l.who).name) + " · " + esc(u.fmtDate(l.at)) + "</span></div>";
      }).join("") + "</div></section>";
    }
    return h;
  }

  // ---------- form ----------
  var NLINES = 6, lastAuto = { label: "", price: "", title: "" };
  function lineRow(k, l) {
    l = l || {};
    return '<div style="display:grid;grid-template-columns:minmax(0,1fr) 64px 104px;gap:8px">' +
      '<input class="in" id="fi-q-l' + k + '-label" value="' + esc(l.label || "") + '" aria-label="' + esc(t("fi_q_l_label") + " " + k) + '" data-c="fi-q-recalc">' +
      '<input class="in num" style="width:100%" id="fi-q-l' + k + '-qty" inputmode="decimal" value="' + esc(l.qty != null ? l.qty : "") + '" aria-label="' + esc(t("fi_q_l_qty") + " " + k) + '" data-c="fi-q-recalc">' +
      '<input class="in num" style="width:100%" id="fi-q-l' + k + '-price" inputmode="decimal" value="' + esc(l.price != null ? l.price : "") + '" aria-label="' + esc(t("fi_q_l_price") + " " + k) + '" data-c="fi-q-recalc"></div>';
  }
  function readLines() {
    var out = [];
    for (var k = 1; k <= NLINES; k++) {
      var label = u.val("fi-q-l" + k + "-label").trim(), qtyRaw = u.val("fi-q-l" + k + "-qty"), priceRaw = u.val("fi-q-l" + k + "-price");
      if (!label && qtyRaw === "" && priceRaw === "") continue;
      var qty = qtyRaw === "" ? 1 : u.numVal("fi-q-l" + k + "-qty"), price = priceRaw === "" ? 0 : u.numVal("fi-q-l" + k + "-price");
      out.push({ label: label, qty: Math.max(0, F.r3(qty)), price: Math.max(0, F.r3(price)) });
    }
    return out;
  }
  function quoteForm(q) {
    var clients = S.all("clients").sort(u.by("brand"));
    if (!clients.length) { ui.toast(t("fi_q_no_clients")); return; }
    var editing = !!q;
    q = q || { clientId: clients[0].id, pack: "", title: "", lines: [], validUntil: u.addDays(u.today(), 14), note: "" };
    lastAuto = { label: "", price: "", title: q.title || "" };
    var lines = (q.lines || []).slice(0, NLINES);
    var packOpts = [["", t("fi_q_custom")]].concat(m.packKeys().map(function (k) { var p = m.pack(k); return [k, p.name + " · " + u.money(p.price) + (p.monthly ? " " + t("per_month") : "")]; }));
    var body = '<div class="form">' +
      ui.field({ id: "fi-q-client", label: t("fi_q_f_client"), type: "select", value: q.clientId, options: clients.map(function (c) { return [c.id, c.brand]; }), attrs: ' data-c="fi-q-pack"' }) +
      ui.field({ id: "fi-q-pack", label: t("fi_q_f_pack"), type: "select", value: q.pack || "", options: packOpts, attrs: ' data-c="fi-q-pack"' }) +
      ui.field({ id: "fi-q-title", label: t("fi_q_f_title"), value: q.title || "" }) +
      ui.field({ id: "fi-q-valid", label: t("fi_q_f_valid"), type: "date", value: q.validUntil }) + "</div>" +
      '<div class="stack" style="gap:8px"><span class="lab sm muted">' + esc(t("fi_q_lines")) + "</span>" + '<span class="small muted">' + esc(t("fi_q_lines_h")) + "</span>" +
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) 64px 104px;gap:8px" class="lab sm muted"><span>' + esc(t("fi_q_l_label")) + "</span><span>" + esc(t("fi_q_l_qty")) + "</span><span>" + esc(t("fi_q_l_price")) + "</span></div>";
    for (var k = 1; k <= NLINES; k++) body += lineRow(k, lines[k - 1]);
    body += '<div class="row between"><span class="lab sm">' + esc(t("fi_q_total")) + '</span><strong class="num" id="fi-q-total">' + F.fmP(totalOf(lines)) + "</strong></div>" +
      '<p class="note" id="fi-q-nodisc" style="margin:0;display:none">' + esc(t("no_discount")) + "</p></div>" +
      ui.field({ id: "fi-q-note", label: t("fi_q_f_note"), type: "textarea", value: q.note || "" });
    ui.modal({ title: t(editing ? "fi_q_edit_t" : "fi_q_new_t"), accent: t(editing ? "fi_q_edit_a" : "fi_q_new_a"), wide: true, body: body,
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("fi_save_draft"), "fi-q-save", { cls: "primary", data: { id: editing ? q.id : "" } }) });
    recalc();
  }
  function recalc() {
    var lines = readLines(), tot = totalOf(lines), pk = u.val("fi-q-pack"), p = pk ? m.pack(pk) : null;
    var el = document.getElementById("fi-q-total"); if (el) el.textContent = F.fmP(tot);
    var nd = document.getElementById("fi-q-nodisc"); if (nd) nd.style.display = p && p.price > 0 && tot > 0 && tot < p.price - 0.001 ? "" : "none";
  }
  GK.change("fi-q-recalc", function () { recalc(); });
  GK.change("fi-q-pack", function () {
    var pk = u.val("fi-q-pack"), cid = u.val("fi-q-client"), p = pk ? m.pack(pk) : null;
    if (p) {
      var lab = p.name + " · " + t("fi_q_pack_line"), le = document.getElementById("fi-q-l1-label"), pe = document.getElementById("fi-q-l1-price"), qe = document.getElementById("fi-q-l1-qty");
      if (le && (!le.value || le.value === lastAuto.label)) { le.value = lab; lastAuto.label = lab; if (qe && !qe.value) qe.value = "1"; }
      if (pe && (!pe.value || pe.value === lastAuto.price)) { pe.value = String(p.price); lastAuto.price = String(p.price); }
      var te = document.getElementById("fi-q-title"), title = p.name + " · " + m.brand(cid);
      if (te && (!te.value || te.value === lastAuto.title)) { te.value = title; lastAuto.title = title; }
    }
    recalc();
  });
  GK.act("fi-q-new", function () { if (!canW()) return ui.toast(t("fi_q_founder")); quoteForm(null); });
  GK.act("fi-q-edit", function (el) { var q = S.get("quotes", el.dataset.id); if (q && !q.no && canW()) quoteForm(q); });
  GK.act("fi-q-save", function (el) {
    if (!canW()) return ui.toast(t("fi_q_founder"));
    var clientId = u.val("fi-q-client"), lines = readLines().filter(function (l) { return l.label; }), valid = u.val("fi-q-valid");
    if (!clientId) return u.focus("fi-q-client");
    if (!lines.length) { u.focus("fi-q-l1-label"); return ui.toast(t("fi_q_need_line")); }
    var amount = totalOf(lines);
    if (!(amount > 0)) { u.focus("fi-q-l1-price"); return ui.toast(t("fi_q_need_total")); }
    if (!valid) { u.focus("fi-q-valid"); return ui.toast(t("fi_q_need_valid")); }
    var pack = u.val("fi-q-pack"), fields = { clientId: clientId, pack: pack, title: u.val("fi-q-title").trim() || (pack ? m.pack(pack).name + " · " + m.brand(clientId) : m.brand(clientId)),
      lines: lines, amount: amount, validUntil: valid, note: u.val("fi-q-note").trim() };
    var id = el.dataset.id, saved;
    if (id) {
      var cur = S.get("quotes", id); if (!cur || cur.no) { ui.closeModal(); return; }
      saved = S.patch("quotes", id, fields, { log: t("fi_log_q_edited") });
    } else {
      saved = S.put("quotes", Object.assign({ no: "", projectId: "", status: "draft", sentOn: "", acceptedOn: "", invoiceIds: [], log: [] }, fields), { log: t("fi_log_q_created") });
    }
    ui.closeModal(true);
    if (saved) { ui.toast(t("saved")); ui.go("finance", { tab: "quotes", quoteId: saved.id }); }
  });
  GK.act("fi-q-del", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || q.no) return;
    ui.confirm(t("fi_q_del_q"), t("fi_q_del_body"), function () { S.remove("quotes", q.id); ui.toast(t("fi_q_deleted")); ui.go("finance", { quoteId: "" }); }, t("del"));
  });
  GK.act("fi-q-dup", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || !canW()) return;
    var c = S.put("quotes", { no: "", clientId: q.clientId, projectId: "", pack: q.pack || "", title: q.title, lines: u.clone(q.lines || []), amount: q.amount, status: "draft",
      validUntil: u.addDays(u.today(), 14), sentOn: "", acceptedOn: "", note: q.note || "", invoiceIds: [], log: [] }, { log: t("fi_log_q_created") });
    if (c) { ui.toast(t("saved")); ui.go("finance", { tab: "quotes", quoteId: c.id }); }
  });

  // ---------- send, accept, decline, extend ----------
  GK.act("fi-q-send", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || q.no || !canW()) return;
    var no = nextQuoteNo();
    ui.confirm(t("fi_q_send_q"), t("fi_q_send_body", { no: no, d: u.fmtDate(q.validUntil, { day: "numeric", month: "long" }) }), function () {
      var cur = S.get("quotes", q.id); if (!cur || cur.no) return;
      var n2 = nextQuoteNo();
      S.patch("quotes", cur.id, { no: n2, status: "sent", sentOn: u.today() }, { log: t("fi_log_q_sent", { no: n2 }) });
      ui.toast(t("fi_q_sent_toast", { no: n2 }));
    }, t("fi_q_send"));
  });
  GK.act("fi-q-decline", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || !canW()) return;
    ui.confirm(t("fi_q_decline_q"), t("fi_q_decline_body", { no: q.no, b: m.brand(q.clientId) }), function () {
      S.patch("quotes", q.id, { status: "declined" }, { log: t("fi_log_q_dec") }); ui.toast(t("fi_q_decline_done"));
    }, t("fi_q_decline"));
  });
  GK.act("fi-q-extend", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || !canW()) return;
    var d = u.addDays(u.today(), 14);
    S.patch("quotes", q.id, { status: "sent", validUntil: d }, { log: t("fi_log_q_ext", { d: u.fmtDate(d) }) });
    ui.toast(t("fi_q_extended", { d: u.fmtDate(d) }));
  });

  /** Draft invoices for a quote, built like the project flow does: deposit + balance (one-off) or one month (SKIN). Returns the new invoice ids. */
  function createDrafts(q, p) {
    var pk = q.pack ? m.pack(q.pack) : null, r = m.rules(), ids = [], amount = F.r3(q.amount);
    var base = { no: "", clientId: q.clientId, projectId: p ? p.id : "", stamp: r.stamp, issued: "", due: "", payments: [], credited: false, log: [] };
    var head = (pk ? pk.name + " · " : "") + (p ? p.name : titleOf(q)), log = t("fi_log_q_inv", { no: q.no || "—" });
    var list = [];
    if (pk && pk.monthly) list.push(Object.assign({}, base, { kind: "month", label: head, amount: amount }));
    else {
      var dep = Math.round(amount / 2);
      list.push(Object.assign({}, base, { kind: "deposit", label: head + " · " + t("fi_inv_dep"), amount: dep }));
      list.push(Object.assign({}, base, { kind: "balance", label: head + " · " + t("fi_inv_bal"), amount: F.r3(amount - dep) }));
    }
    list.forEach(function (inv) { var s = S.put("invoices", inv, { log: log }); if (s) ids.push(s.id); });
    return ids;
  }
  function projectInvoices(p) { return F.invoices().filter(function (i) { return i.projectId === p.id && i.kind !== "credit"; }); }

  GK.act("fi-q-accept", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || !canW()) return;
    var projs = S.all("projects").filter(function (p) { return p.clientId === q.clientId; }).sort(u.by("name"));
    var canNew = !!(GK.pj && typeof GK.pj.openNew === "function") && !!q.pack;
    var def = q.projectId && m.project(q.projectId) ? q.projectId : canNew ? "__new" : "__drafts";
    var opts = [];
    if (canNew) opts.push(["__new", t("fi_q_acc_new")]);
    opts.push(["__drafts", t("fi_q_acc_drafts")]);
    projs.forEach(function (p) { opts.push([p.id, m.projectLabel(p) + " · " + m.pack(p.pack).name]); });
    var body = '<p class="small muted" style="margin:0">' + esc(t("fi_q_acc_intro", { no: q.no, b: m.brand(q.clientId), a: F.fmP(q.amount) })) + "</p>" +
      ui.field({ id: "fi-q-a-proj", label: t("fi_q_acc_proj"), type: "select", value: def, options: opts }) +
      '<p class="note" style="margin:0">' + esc(t("fi_q_acc_h")) + "</p>";
    ui.modal({ title: t("fi_q_acc_t"), accent: t("fi_q_acc_a"), body: body, foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("fi_q_acc_go"), "fi-q-accept-go", { cls: "primary", data: { id: q.id } }) });
  });
  GK.act("fi-q-accept-go", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || !canW()) return ui.closeModal();
    var ch = u.val("fi-q-a-proj"), patch = { status: "accepted", acceptedOn: u.today() }, ids = [], p = null, existing = null;
    if (ch && ch !== "__new" && ch !== "__drafts") {
      p = m.project(ch);
      if (p) { patch.projectId = p.id; var ex = projectInvoices(p); if (ex.length) existing = ex.map(function (i) { return i.id; }); }
    }
    ui.closeModal(true);
    var saved = S.patch("quotes", q.id, patch, { log: t("fi_log_q_acc") });
    if (!saved) return;
    if (ch === "__new") {
      ui.go("finance", { tab: "quotes", quoteId: q.id });
      ui.toast(t("fi_q_acc_done_proj"));
      GK.pj.openNew({ clientId: q.clientId, pack: q.pack });
      return;
    }
    ids = existing || createDrafts(saved, p);
    S.patch("quotes", q.id, { invoiceIds: ids });
    ui.toast(t("fi_q_acc_done_inv", { n: ids.length }));
    ui.go("finance", { tab: "quotes", quoteId: q.id });
  });
  GK.act("fi-q-make", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || !canW() || (q.invoiceIds || []).length) return;
    var p = q.projectId ? m.project(q.projectId) : null, ids = createDrafts(q, p);
    S.patch("quotes", q.id, { invoiceIds: ids }); ui.toast(t("fi_q_acc_done_inv", { n: ids.length }));
  });
  GK.act("fi-q-link", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q || !canW()) return;
    var linked = {}; quotes().forEach(function (x) { if (x.id !== q.id) (x.invoiceIds || []).forEach(function (id) { linked[id] = 1; }); });
    var projs = S.all("projects").filter(function (p) { return p.clientId === q.clientId; }).sort(u.by(function (p) { return p.planApprovedOn || p.shootDate || ""; }, "desc"));
    if (!projs.length) return ui.toast(t("fi_q_link_none"));
    var free = projs.filter(function (p) { var iv = projectInvoices(p); return iv.length && iv.every(function (i) { return !linked[i.id]; }); });
    var def = (free[0] || projs[0]).id;
    ui.modal({ title: t("fi_q_link_t"), accent: t("fi_q_link_a"), body: ui.field({ id: "fi-q-lk-proj", label: t("fi_q_acc_proj"), type: "select", value: def, options: projs.map(function (p) { return [p.id, m.projectLabel(p)]; }) }),
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("fi_q_link_go"), "fi-q-link-go", { cls: "primary", data: { id: q.id } }) });
  });
  GK.act("fi-q-link-go", function (el) {
    var q = S.get("quotes", el.dataset.id), p = m.project(u.val("fi-q-lk-proj")); if (!q || !p) return ui.closeModal();
    ui.closeModal(true);
    S.patch("quotes", q.id, { projectId: p.id, invoiceIds: projectInvoices(p).map(function (i) { return i.id; }) }, { log: t("fi_log_q_link") });
    ui.toast(t("fi_q_linked"));
  });

  // ---------- document, text, WhatsApp ----------
  function docHTML(q) {
    var co = m.company(), c = m.client(q.clientId) || {};
    var h = '<div class="doc"><div class="center"><span class="wm">' + GK.logo.wordmark + "</span>";
    h += '<div class="small" style="line-height:1.6"><strong>' + esc(co.name) + "</strong>" + (co.legal ? "<br>" + esc(co.legal) : "") + (co.mf ? "<br>" + esc(t("fi_d_mf")) + " " + esc(co.mf) : "") +
      "<br>" + esc(co.address) + "<br>" + esc(co.phone) + " · " + esc(co.email) + "<br>Instagram " + esc(co.instagram) + "</div>";
    h += '<span class="lab" style="margin-top:8px">' + esc(t("fi_q_d_quote")) + "</span>";
    h += '<h2 class="hl" style="font-size:34px">' + esc(q.no || t("fi_q_d_draft")) + "</h2>";
    h += '<div class="small">' + (q.sentOn ? esc(t("fi_q_d_issued")) + " " + esc(F.longDate(q.sentOn)) + " · " : "") + esc(t("fi_q_d_valid")) + " " + esc(q.validUntil ? F.longDate(q.validUntil) : "—") + "</div>";
    h += '<div class="stack" style="gap:2px;align-items:center"><span class="lab sm">' + esc(t("fi_q_d_for")) + "</span><strong>" + esc(c.brand || "—") + "</strong>" +
      (c.taxId ? '<span class="small">' + esc(t("fi_d_taxid")) + " " + esc(c.taxId) + "</span>" : "") + "</div>";
    h += '<strong>' + esc(titleOf(q)) + "</strong>";
    h += '<table style="max-width:560px"><thead><tr><th>' + esc(t("fi_q_d_desc")) + '</th><th class="r">' + esc(t("fi_q_d_qty")) + '</th><th class="r">' + esc(t("fi_q_d_price")) + '</th><th class="r">' + esc(t("fi_q_d_line")) + "</th></tr></thead><tbody>";
    (q.lines || []).forEach(function (l) {
      h += '<tr><td style="text-align:left">' + esc(l.label) + '</td><td class="r num">' + esc(l.qty) + '</td><td class="r num">' + (+l.price ? F.fmP(l.price) : "—") + '</td><td class="r num">' + (+l.price ? F.fmP(lineTotal(l)) : esc(t("fi_q_included"))) + "</td></tr>";
    });
    h += "</tbody></table>";
    h += '<div class="frame"><div class="stack" style="gap:4px;align-items:center"><span class="lab sm">' + esc(t("fi_q_total")) + '</span><span class="big">' + F.fmP(q.amount) + "</span></div></div>";
    h += '<div class="small">' + esc(t("fi_q_d_valid_for", { d: q.validUntil ? F.longDate(q.validUntil) : "—" })) + "</div>";
    h += '<div class="stack" style="gap:6px;align-items:center"><span class="lab sm">' + esc(t("fi_q_d_terms")) + "</span>" + termsList(q).map(function (x) { return '<p class="small" style="margin:0;max-width:52ch">' + esc(x) + "</p>"; }).join("") + "</div>";
    if (q.note) h += '<p class="small" style="margin:0;max-width:52ch;white-space:pre-line">' + esc(q.note) + "</p>";
    return h + "</div></div>";
  }
  function docText(q) {
    var co = m.company(), c = m.client(q.clientId) || {}, L = [], c_ = F.colon();
    L.push(co.name + (co.legal ? " · " + co.legal : ""));
    if (co.mf) L.push(t("fi_d_mf") + " " + co.mf);
    L.push(co.address, co.phone + " · " + co.email + " · Instagram " + co.instagram, "");
    L.push(t("fi_q_d_quote") + " " + (q.no || "(" + t("fi_q_d_draft") + ")"));
    if (q.sentOn) L.push(t("fi_q_d_issued") + " " + F.longDate(q.sentOn));
    L.push(t("fi_q_d_valid") + c_ + (q.validUntil ? F.longDate(q.validUntil) : "—"));
    L.push("", t("fi_q_d_for") + c_ + (c.brand || "—") + (c.taxId ? " · " + t("fi_d_taxid") + " " + c.taxId : ""), titleOf(q), "");
    (q.lines || []).forEach(function (l) { L.push(l.label + " · " + l.qty + " × " + (+l.price ? F.fmP(l.price) + c_ + F.fmP(lineTotal(l)) : t("fi_q_included"))); });
    L.push("", t("fi_q_total") + c_ + F.fmP(q.amount), "", t("fi_q_d_terms") + c_);
    termsList(q).forEach(function (x) { L.push("- " + x); });
    if (q.note) L.push("", q.note);
    return L.join("\n");
  }
  function waText(q) {
    var c = m.client(q.clientId) || {}, co = m.company();
    return t("fi_q_wa", { name: c.contact || c.brand || "", co: co.name, no: q.no || "", title: titleOf(q), total: F.fmP(q.amount), d: q.validUntil ? F.longDate(q.validUntil) : "—",
      terms: t(isMonthly(q) ? "fi_q_wa_month" : "fi_q_wa_once"), phone: co.phone });
  }
  GK.act("fi-q-doc", function (el) {
    var q = S.get("quotes", el.dataset.id); if (!q) return;
    ui.modal({ title: t("fi_q_doc_t"), accent: t("fi_q_doc_a"), wide: true, body: docHTML(q),
      foot: ui.btn(t("fi_q_copy_wa"), "fi-q-copy-wa", { data: { id: q.id } }) + ui.btn(t("fi_q_copy_text"), "fi-q-copy", { cls: "primary", data: { id: q.id } }) });
  });
  GK.act("fi-q-copy", function (el) { var q = S.get("quotes", el.dataset.id); if (q) u.copy(docText(q)).then(function (ok) { ui.toast(ok ? t("copied") : t("fi_copy_fail")); }); });
  GK.act("fi-q-copy-wa", function (el) { var q = S.get("quotes", el.dataset.id); if (q) u.copy(waText(q)).then(function (ok) { ui.toast(ok ? t("copied") : t("fi_copy_fail")); }); });

  GK.act("fi-q-open", function (el) { ui.go("finance", { tab: "quotes", quoteId: el.dataset.id }); });
  GK.act("fi-q-back", function () { ui.go("finance", { quoteId: "" }); });
  GK.act("fi-q-filter", function (el) { ui.go("finance", { qFilter: el.dataset.f, quoteId: "" }); });

  FIN.quotes = { status: qStatus, list: quotes };
  FIN.tabs.quotes = { render: function () {
    var q = P().quoteId && S.get("quotes", P().quoteId);
    return q ? detailHTML(q) : listHTML();
  } };
})(window.GK);
