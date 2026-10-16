/* GECKO Ops · module: portal ("Client pages"). Two tabs per client: the shared client pages (portal_pages.js, built by portal_snapshot.js,
   opened by link through clientmode.js) and the quick update (a clean document to screen-share or send as a WhatsApp update).
   Never shows internal costs, profit or commission. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;

  GK.i18n.add({
    po_title: ["What the client", "Ce que le client"], po_accent: ["sees", "voit"],
    po_sub: ["One link per client: their plan, scripts, files, timeline, invoices and boards. Or a quick update to screen-share or send on WhatsApp.", "Un lien par client : son plan, ses scripts, ses fichiers, son calendrier, ses factures et ses tableaux. Ou un point rapide à partager à l'écran ou sur WhatsApp."],
    po_note: ["A quick update is a clean document for a call or a WhatsApp message. For something the client can open and answer, use Client pages.", "Le point rapide est un document clair pour un appel ou un message WhatsApp. Pour quelque chose que le client ouvre et auquel il répond, utilisez les Pages client."],
    po_pick: ["Client", "Client"],
    po_none: ["No clients yet. Add one in Clients.", "Aucun client pour l'instant. Ajoutez-en un dans Clients."],
    po_copy: ["Copy WhatsApp update", "Copier le message WhatsApp"],
    po_no_perm: ["Only the owner and the Client Lead send client updates.", "Seuls le fondateur et le responsable clients envoient les messages clients."],
    po_hello: ["Hello {name}, here is your", "Bonjour {name}, voici votre"], po_hello_a: ["update", "point"],
    po_intro: ["Here is where {brand} stands with GECKO today.", "Voici où en est {brand} avec GECKO aujourd'hui."],
    po_kind: ["Client update", "Point client"],
    po_projects: ["Your projects", "Vos projets"],
    po_no_projects: ["No project running right now.", "Aucun projet en cours."],
    po_s_onboard: ["Getting started", "Démarrage"], po_s_plan: ["Plan", "Plan"], po_s_shoot: ["Shoot", "Tournage"], po_s_edit: ["Editing", "Montage"],
    po_s_delivered: ["Delivered", "Livré"], po_s_testing: ["Testing", "En test"], po_s_report: ["Report", "Bilan"], po_s_done: ["Done", "Terminé"],
    po_now_at: ["Now: {stage}", "En ce moment : {stage}"],
    po_videos: ["{done} of {total} files approved", "{done} fichiers validés sur {total}"],
    po_shoot_on: ["Shoot on {date}", "Tournage le {date}"],
    po_needs: ["What we need from you", "Ce qu'il nous faut de votre part"],
    po_need_plan: ["Approve the creative plan for {name}.", "Valider le plan créatif du projet {name}."],
    po_need_deposit: ["Pay the deposit for {name}, {amt}.", "Régler l'acompte du projet {name}, soit {amt}."],
    po_need_balance: ["Pay the balance for {name}, {amt}. Your files unlock right after.", "Régler le solde du projet {name}, soit {amt}. Vos fichiers sont débloqués juste après."],
    po_need_month: ["Pay this month for {name}, {amt}.", "Régler le mois du projet {name}, soit {amt}."],
    po_need_invoice: ["Pay invoice {no}, {amt}.", "Régler la facture {no}, soit {amt}."],
    po_need_due: ["due by {date}", "à régler avant le {date}"], po_need_late: ["overdue since {date}", "en retard depuis le {date}"],
    po_need_product: ["Send the products to the studio before the shoot on {date}.", "Envoyer les produits au studio avant le tournage du {date}."],
    po_need_results: ["Send us the ad numbers for {name} (views, clicks, purchases), or give us access to Ads Manager.", "Nous envoyer les chiffres des pubs de {name} (vues, clics, achats), ou nous donner l'accès au Gestionnaire de publicités."],
    po_need_nothing: ["Nothing right now. We'll message you when there's something to see.", "Rien pour l'instant. On vous écrit dès qu'il y a quelque chose à voir."],
    po_files: ["Your files", "Vos fichiers"],
    po_files_locked: ["Files unlock when the balance is paid.", "Les fichiers sont débloqués une fois le solde réglé."],
    po_files_locked_m: ["Files unlock when this month is paid.", "Les fichiers sont débloqués une fois le mois réglé."],
    po_files_none: ["Your files appear here once they are approved.", "Vos fichiers apparaissent ici une fois validés."],
    po_files_n: ["{n} approved files.", "{n} fichiers validés."], po_files_links: ["Drive links are on their way.", "Les liens Drive arrivent."],
    po_drive: ["Open in Drive", "Ouvrir dans Drive"], po_link_soon: ["Link coming", "Lien à venir"],
    po_invoices: ["Invoices", "Factures"], po_no_invoices: ["No invoices yet.", "Pas encore de facture."],
    po_c_no: ["Invoice", "Facture"], po_c_label: ["For", "Objet"], po_c_total: ["Total", "Total"], po_c_status: ["Status", "Statut"], po_c_left: ["Left to pay", "Reste à payer"],
    po_contact: ["Questions? We're here.", "Une question ? On est là."],
    po_wa_hello: ["Hello {name},", "Bonjour {name},"],
    po_wa_proj: ["{name}: we're at {stage}.", "{name} : on en est à l'étape {stage}."],
    po_wa_need: ["We need from you: {what}", "Il nous faut de votre part : {what}"],
    po_wa_files_ok: ["Your approved files are ready in Drive.", "Vos fichiers validés sont prêts sur Drive."],
    po_wa_nothing: ["Nothing needed from you right now.", "Rien à faire de votre côté pour l'instant."],
    po_wa_files_soon: ["Your approved files are ready. I'll send the Drive links shortly.", "Vos fichiers validés sont prêts. Je vous envoie les liens Drive très vite."],
    po_wa_end: ["Any question, just reply here. GECKO", "Une question ? Répondez ici. GECKO"]
  });

  var SI = function (s) { return m.STAGES.indexOf(s); };
  var UNPAID = ["issued", "partial", "overdue"];

  /** Whole dinars, or up to 2 decimals only when there is a fraction. */
  function money(n) { var v = Math.round((+n || 0) * 100) / 100; return u.money(v, v % 1 === 0 ? 0 : Math.round(v * 10) === v * 10 ? 1 : 2); }
  function clientsList() { return S.all("clients").sort(function (a, b) { return String(a.brand).localeCompare(String(b.brand)); }); }
  function projectsOf(c) {
    var all = S.all("projects").filter(function (p) { return p.clientId === c.id; });
    var cur = all.filter(function (p) { return p.stage !== "retention"; }).sort(u.by(function (p) { return SI(p.stage); }));
    if (cur.length) return cur;
    var done = all.sort(u.by(function (p) { return p.shootDate || ""; }, "desc"));
    return done.slice(0, 1);
  }
  function current() {
    var list = clientsList(), id = ui.p("portal").clientId;
    var c = list.find(function (x) { return x.id === id; });
    if (c) return c;
    return list.find(function (x) { return S.all("projects").some(function (p) { return p.clientId === x.id && p.stage !== "retention"; }); }) || list[0] || null;
  }
  function invoicesOf(c) {
    return S.all("invoices").filter(function (i) { return i.clientId === c.id && i.no; }).sort(u.by("issued", "desc"));
  }
  function stageWord(s) { return t("po_s_" + s); }
  function hasResults(p) { return m.files(p).some(function (f) { var r = f.item.results; return f.kind === "hook" && r && (r.cpp != null && r.cpp !== "" || r.hook != null && r.hook !== ""); }); }

  /** Plain sentences of what the client must do next, per project. */
  function needs(c) {
    var out = [];
    projectsOf(c).forEach(function (p) {
      var si = SI(p.stage);
      if (si <= SI("plan") && !p.planApproved) out.push(t("po_need_plan", { name: p.name }));
      m.invoicesOf(p).filter(function (i) { return i.no && UNPAID.indexOf(m.invStatus(i)) > -1; }).sort(u.by("issued")).forEach(function (i) {
        var late = m.invStatus(i) === "overdue";
        var amt = money(m.invBalance(i)) + (i.due ? ", " + t(late ? "po_need_late" : "po_need_due", { date: u.fmtDate(i.due) }) : "");
        var key = { deposit: "po_need_deposit", balance: "po_need_balance", month: "po_need_month" }[i.kind] || "po_need_invoice";
        out.push(t(key, { name: p.name, amt: amt, no: i.no }).replace(/\.\./g, "."));
      });
      if (si <= SI("shoot") && p.shootDate && p.shootDate >= u.today()) out.push(t("po_need_product", { date: u.fmtDate(p.shootDate, { weekday: "long", day: "numeric", month: "long" }) }));
      if (p.stage === "delivered" && !hasResults(p)) out.push(t("po_need_results", { name: p.name }));
    });
    return out;
  }
  function stepper(p) {
    var si = SI(p.stage);
    return '<div class="stepper" role="list">' + m.STAGES.map(function (s, i) {
      var cls = p.stage === "retention" || i < si ? "done" : i === si ? "now" : "";
      return '<div role="listitem" class="' + cls + '"' + (i === si ? ' aria-current="step"' : "") + ">" + esc(stageWord(s)) + "</div>";
    }).join("") + "</div>";
  }
  function driveOf(f) { var l = f.item.drive || (f.reel && f.reel.drive) || ""; return /^https?:\/\//i.test(l) ? l : ""; }
  function filesBlock(p) {
    var approved = m.files(p).filter(function (f) { return f.item.status === "approved"; });
    var monthly = m.pack(p.pack).monthly;
    if (!m.canFiles(p)) {
      if (SI(p.stage) < SI("edit") && !approved.length) return "";
      return '<p class="small" style="margin:0"><strong>' + esc(monthly ? t("po_files_locked_m") : t("po_files_locked")) + "</strong></p>";
    }
    if (!approved.length) return '<p class="small muted" style="margin:0">' + esc(t("po_files_none")) + "</p>";
    if (!approved.some(driveOf)) return '<p class="small" style="margin:0"><strong>' + esc(t("po_files_n", { n: approved.length })) + "</strong> " + esc(t("po_files_links")) + "</p>";
    return '<span class="lab sm">' + esc(t("po_files")) + '</span><div class="list">' + approved.map(function (f) {
      var link = driveOf(f);
      return '<div class="li"><div class="stack" style="gap:2px;min-width:0"><span>' + esc(f.item.text || f.item.title || "") + '</span><span class="code muted">' + esc(f.code) + "</span></div>" +
        (link ? '<a class="btn sm" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + esc(t("po_drive")) + "</a>" : '<span class="small faint" style="white-space:nowrap">' + esc(t("po_link_soon")) + "</span>") + "</div>";
    }).join("") + "</div>";
  }

  function docHTML(c) {
    var co = m.company(), ps = projectsOf(c), nd = needs(c), invs = invoicesOf(c);
    var name = c.contact || c.brand;
    var h = '<article class="doc" aria-label="' + esc(t("po_kind")) + '">';
    h += '<div class="top"><span class="wm">' + GK.logo.wordmark + '</span><span class="lab sm">' + esc(t("po_kind")) + " · " + esc(u.fmtDate(u.today(), { day: "numeric", month: "long", year: "numeric" })) + "</span></div>";
    h += '<div class="stack" style="gap:8px"><h2 class="hl" style="font-size:clamp(34px,6vw,56px)">' + esc(t("po_hello", { name: name })) + " <i>" + esc(t("po_hello_a")) + "</i></h2>" +
      '<p style="margin:0">' + esc(t("po_intro", { brand: c.brand })) + "</p></div>";
    // projects
    h += '<div class="stack"><h3 class="sec">' + esc(t("po_projects")) + "</h3>";
    if (!ps.length) h += '<p class="small muted" style="margin:0">' + esc(t("po_no_projects")) + "</p>";
    ps.forEach(function (p) {
      var pr = m.progress(p), meta = [m.pack(p.pack).name];
      if (SI(p.stage) <= SI("shoot") && p.shootDate) meta.push(t("po_shoot_on", { date: u.fmtDate(p.shootDate) }));
      if (pr.total && SI(p.stage) >= SI("edit")) meta.push(t("po_videos", { done: pr.done, total: pr.total }));
      h += '<div class="stack" style="gap:10px;padding:12px 0;border-top:1px solid var(--line)"><div class="row between"><strong>' + esc(p.name) + "</strong>" +
        '<span class="small muted">' + esc(meta.join(" · ")) + "</span></div>" + stepper(p) + filesBlock(p) + "</div>";
    });
    h += "</div>";
    // needs
    h += '<div class="stack"><h3 class="sec">' + esc(t("po_needs")) + "</h3>";
    h += nd.length ? '<div class="list">' + nd.map(function (x, i) { return '<div class="li" style="justify-content:flex-start;align-items:flex-start"><span class="num lab" style="min-width:22px;padding-top:2px">' + (i + 1) + "</span><span>" + esc(x) + "</span></div>"; }).join("") + "</div>"
      : '<p style="margin:0">' + esc(t("po_need_nothing")) + "</p>";
    h += "</div>";
    // invoices
    h += '<div class="stack"><h3 class="sec">' + esc(t("po_invoices")) + "</h3>";
    if (!invs.length) h += '<p class="small muted" style="margin:0">' + esc(t("po_no_invoices")) + "</p>";
    else {
      h += '<div class="tbl"><table><thead><tr><th>' + esc(t("po_c_no")) + "</th><th>" + esc(t("po_c_label")) + '</th><th class="r">' + esc(t("po_c_total")) + "</th><th>" + esc(t("po_c_status")) + '</th><th class="r">' + esc(t("po_c_left")) + "</th></tr></thead><tbody>";
      invs.forEach(function (i) {
        var st = m.invStatus(i), bal = st === "credited" || st === "credit" ? 0 : m.invBalance(i);
        h += '<tr><td style="white-space:nowrap"><span class="code" style="word-break:normal">' + esc(i.no) + '</span></td><td style="min-width:140px">' + esc(i.label || t("k_" + i.kind)) + '<br><span class="small muted">' + esc(u.fmtDate(i.issued)) + "</span></td>" +
          '<td class="r num" style="white-space:nowrap">' + esc(money(m.invTotal(i))) + "</td><td>" + ui.invPill(i) + '</td><td class="r num" style="white-space:nowrap">' + esc(bal ? money(bal) : "—") + "</td></tr>";
      });
      h += "</tbody></table></div>";
    }
    h += "</div>";
    h += '<div class="foot" style="border-top:1px solid currentColor;padding-top:14px;flex-wrap:wrap"><span class="small"><strong>' + esc(t("po_contact")) + '</strong></span><span class="small">' +
      esc(co.phone) + " · " + esc(co.email) + " · " + esc(co.instagram) + "</span></div>";
    return h + "</article>";
  }

  function whatsapp(c) {
    var L = [], ps = projectsOf(c), nd = needs(c);
    L.push(t("po_wa_hello", { name: c.contact || c.brand }));
    ps.slice(0, 2).forEach(function (p) {
      var line = t("po_wa_proj", { name: p.name, stage: stageWord(p.stage) });
      var pr = m.progress(p);
      if (pr.total && SI(p.stage) >= SI("edit") && SI(p.stage) <= SI("delivered")) line += " " + t("po_videos", { done: pr.done, total: pr.total }) + ".";
      L.push(line);
    });
    if (!ps.length) L.push(t("po_no_projects"));
    nd.slice(0, 3).forEach(function (x) { L.push(t("po_wa_need", { what: x.charAt(0).toLowerCase() + x.slice(1) })); });
    if (!nd.length) L.push(t("po_wa_nothing"));
    var lockedNotSaid = ps.some(function (p) {
      return !m.canFiles(p) && SI(p.stage) >= SI("edit") &&
        !m.invoicesOf(p).some(function (i) { return i.no && (i.kind === "balance" || i.kind === "month") && UNPAID.indexOf(m.invStatus(i)) > -1; });
    });
    var ready = ps.filter(function (p) { return m.canFiles(p) && m.progress(p).done > 0; });
    if (ready.length) L.push(ready.some(function (p) { return m.files(p).some(function (f) { return f.item.status === "approved" && driveOf(f); }); }) ? t("po_wa_files_ok") : t("po_wa_files_soon"));
    else if (lockedNotSaid && L.length < 7) L.push(t("po_files_locked"));
    L.push(t("po_wa_end"));
    if (L.length > 8) L = L.slice(0, 7).concat([L[L.length - 1]]);
    return L.join("\n");
  }

  GK.view("portal", {
    render: function () {
      var list = clientsList(), c = current();
      var picker = list.length ? '<label class="lab sm" for="po-pick">' + esc(t("po_pick")) + '</label><select id="po-pick" class="in inline" data-c="po-pick" style="max-width:100%">' +
        list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (c && x.id === c.id ? " selected" : "") + ">" + esc(x.brand) + "</option>"; }).join("") + "</select>" : "";
      var can = m.can("portal");
      var tab = ui.p("portal").tab === "quick" ? "quick" : "pages";
      var h = ui.head({ label: t("nav_portal"), title: t("po_title"), accent: t("po_accent"), sub: esc(t("po_sub")), actions: picker + ui.sample() });
      if (!c) return h + ui.empty(t("po_none"));
      h += '<div class="tabs" role="tablist">' + ["pages", "quick"].map(function (k) {
        return '<button type="button" role="tab" data-a="po-tab" data-t="' + k + '" aria-selected="' + (tab === k) + '">' + esc(t("po_tab_" + k)) + "</button>";
      }).join("") + "</div>";
      if (tab === "pages" && GK.portal && GK.portal.pagesHTML) return h + GK.portal.pagesHTML(c);
      var copyBtn = ui.btn(t("po_copy"), "po-copy", { cls: "primary", data: { id: c.id }, disabled: !can, title: can ? "" : t("po_no_perm") });
      h += '<p class="note" style="margin:0">' + esc(t("po_note")) + "</p>";
      h += '<div class="row between"><h2 class="sec">' + esc(c.brand) + "</h2>" + copyBtn + "</div>";
      h += docHTML(c);
      return h;
    },
    count: function () { return ""; },
    after: function (main) {
      // On a phone the stepper scrolls sideways. Only when the current step is out of view, scroll so the step
      // before it starts exactly at the left edge (never mid-word). Where the stepper fits, nothing moves.
      main.querySelectorAll(".doc .stepper").forEach(function (st) {
        var now = st.querySelector(".now");
        if (!now || st.scrollWidth <= st.clientWidth + 1) return;
        var box = st.getBoundingClientRect(), r = now.getBoundingClientRect();
        if (r.left >= box.left - 1 && r.right <= box.right + 1) return;
        var anchor = now.previousElementSibling || now;
        st.scrollLeft += anchor.getBoundingClientRect().left - box.left;
      });
    }
  });

  GK.act("po-tab", function (el) { ui.go("portal", { tab: el.getAttribute("data-t") }); });
  GK.change("po-pick", function (el) { ui.go("portal", { clientId: el.value }); });
  GK.act("po-copy", function (el) {
    if (!m.can("portal")) return ui.toast(t("po_no_perm"));
    var c = m.client(el.getAttribute("data-id")); if (!c) return;
    u.copy(whatsapp(c)).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });
})(window.GK);
