/* GECKO Ops · client-facing pages. "#cl-<token>" opens a calm, branded page for a client.
   It renders ONLY from shares/<token>.snapshot (built by the team in Client pages). It never reads the team, clients, projects, invoices or boards.
   Words are prefixed cm_. The page follows the viewer's theme; the language toggle shares gecko-ops-lang with the app. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, S = GK.store, esc = u.esc;
  var WA = "https://wa.me/21626191555?text=";

  GK.i18n.add({
    cm_unavail_t: ["This page isn't", "Cette page n'est pas"], cm_unavail_a: ["available", "disponible"],
    cm_unavail_b: ["The link may be old, or the page was switched off. Message us and we'll send you a fresh one.", "Le lien est peut-être ancien, ou la page a été désactivée. Écrivez-nous et on vous en envoie un nouveau."],
    cm_hero_t: ["Your campaign", "Votre page"], cm_hero_a: ["page", "campagne"],
    cm_for: ["Prepared for {brand}", "Préparé pour {brand}"],
    cm_updated: ["Last updated {date}", "Dernière mise à jour le {date}"],
    cm_lang: ["Language", "Langue"], cm_skip: ["Skip to content", "Aller au contenu"], cm_sections: ["Sections", "Sections"],
    cm_tab_overview: ["Overview", "Vue d'ensemble"], cm_tab_plan: ["Campaign plan", "Plan de campagne"], cm_tab_scripts: ["Scripts", "Scripts"],
    cm_tab_files: ["Files", "Fichiers"], cm_tab_timeline: ["Timeline", "Calendrier"], cm_tab_invoices: ["Invoices", "Factures"], cm_tab_boards: ["Boards", "Tableaux"],
    cm_hello: ["Hello {name},", "Bonjour {name},"],
    cm_intro: ["Here is where your campaign stands. Open any section above to look closer, and tell us what you think.", "Voici où en est votre campagne. Ouvrez une section ci-dessus pour voir de plus près, et dites-nous ce que vous en pensez."],
    cm_now: ["Now", "En ce moment"], cm_open_sec: ["Open", "Ouvrir"],
    cm_plan_h: ["Campaign plan", "Plan de campagne"], cm_plan_sub: ["The angles we chose for you, and why. Tap one to read it.", "Les angles choisis pour vous, et pourquoi. Touchez-en un pour le lire."],
    cm_angle: ["Angle {n}", "Angle {n}"], cm_why: ["Why this angle", "Pourquoi cet angle"], cm_no_angles: ["The plan is being written. It appears here as soon as it is ready.", "Le plan est en cours d'écriture. Il apparaît ici dès qu'il est prêt."],
    cm_plan_ok: ["Plan approved on {date}", "Plan validé le {date}"], cm_plan_ok2: ["Plan approved", "Plan validé"],
    cm_approve: ["Approve the plan", "Valider le plan"], cm_changes: ["Ask for changes", "Demander des changements"],
    cm_approve_h: ["Happy with the plan?", "Le plan vous convient ?"], cm_approve_b: ["Approve it and we start preparing the shoot. Or tell us what to change. Either opens WhatsApp with your message ready.", "Validez-le et on prépare le tournage. Ou dites-nous quoi changer. Dans les deux cas, WhatsApp s'ouvre avec votre message prêt."],
    cm_note: ["Add a note (optional)", "Ajouter une note (facultatif)"],
    cm_scripts_h: ["Scripts", "Scripts"], cm_scripts_sub: ["Every reel with its hooks and script. Tell us what you love and what to change.", "Chaque reel avec ses accroches et son script. Dites-nous ce que vous aimez et ce qu'il faut changer."],
    cm_reel: ["Reel {n}", "Reel {n}"], cm_direct: ["Direct", "Direct"], cm_indirect: ["Indirect", "Indirect"],
    cm_hooks: ["Hooks, the first 3 seconds", "Accroches, les 3 premières secondes"], cm_script: ["Script", "Script"], cm_scene: ["Scene {n}", "Scène {n}"],
    cm_script_soon: ["The script is coming soon.", "Le script arrive bientôt."], cm_love: ["Love it", "J'adore"], cm_change: ["Change this", "À modifier"],
    cm_carousels: ["Carousels", "Carrousels"], cm_ideas: ["More ideas", "Autres idées"], cm_concept: ["Why it works", "Pourquoi ça marche"], cm_no_scripts: ["Scripts appear here once they are ready.", "Les scripts apparaissent ici dès qu'ils sont prêts."],
    cm_st_todo: ["Planned", "Prévu"], cm_st_edit: ["In editing", "En montage"], cm_st_review: ["Ready for you", "À valider"], cm_st_approved: ["Approved", "Validé"], cm_st_revise: ["Being revised", "En retouche"],
    cm_files_h: ["Files", "Fichiers"], cm_files_sub: ["Your finished files. Approved files open as soon as they are unlocked.", "Vos fichiers finis. Les fichiers validés s'ouvrent dès qu'ils sont débloqués."],
    cm_open: ["Open file", "Ouvrir le fichier"], cm_file_soon: ["Link coming", "Lien à venir"], cm_locked: ["Locked", "Verrouillé"], cm_no_files: ["Files appear here as they are approved.", "Les fichiers apparaissent ici au fil des validations."],
    cm_client_approved: ["You approved this file", "Vous avez validé ce fichier"],
    cm_locked_bal: ["Your files unlock when the balance is paid. We message you the moment they are ready.", "Vos fichiers sont débloqués une fois le solde réglé. On vous écrit dès qu'ils sont prêts."],
    cm_locked_m: ["Your files unlock when this month is paid. We message you the moment they are ready.", "Vos fichiers sont débloqués une fois le mois réglé. On vous écrit dès qu'ils sont prêts."],
    cm_tl_h: ["Timeline", "Calendrier"], cm_tl_sub: ["Where your project has been and what comes next.", "Ce qui est fait et ce qui vient ensuite."],
    cm_tl_kickoff: ["Kick-off", "Lancement"], cm_tl_plan: ["Plan approved", "Plan validé"], cm_tl_deposit: ["Deposit paid", "Acompte réglé"], cm_tl_month: ["Month paid", "Mois réglé"],
    cm_tl_shoot: ["Shoot", "Tournage"], cm_tl_edit: ["Editing", "Montage"], cm_tl_balance: ["Balance paid, files unlocked", "Solde réglé, fichiers débloqués"],
    cm_tl_delivered: ["Delivered", "Livré"], cm_tl_testing: ["Ads testing", "Test des pubs"], cm_tl_report: ["Results report", "Rapport de résultats"],
    cm_inv_h: ["Invoices", "Factures"], cm_inv_sub: ["What has been invoiced and where each invoice stands.", "Ce qui a été facturé et où en est chaque facture."],
    cm_inv_no: ["Invoice {no}", "Facture {no}"], cm_due: ["Due {date}", "À régler avant le {date}"], cm_left: ["Left to pay", "Reste à payer"], cm_total: ["Total", "Total"], cm_issued: ["Issued {date}", "Émise le {date}"],
    cm_is_paid: ["Paid", "Payée"], cm_is_issued: ["To pay", "À régler"], cm_is_partial: ["Part paid", "Partiellement payée"], cm_is_overdue: ["Overdue", "En retard"], cm_is_credited: ["Credited", "Annulée"], cm_is_credit: ["Credit note", "Avoir"],
    cm_pay_h: ["How to pay", "Comment payer"], cm_pay_b: ["Pay by bank transfer or D17, then send us the receipt on WhatsApp. We confirm as soon as it lands.", "Réglez par virement bancaire ou D17, puis envoyez-nous le reçu sur WhatsApp. On confirme dès réception."],
    cm_no_inv: ["No invoices yet.", "Pas encore de facture."],
    cm_boards_h: ["Boards", "Tableaux"], cm_boards_sub: ["Our working boards, to read only. Zoom in to look closer.", "Nos tableaux de travail, en lecture seule. Zoomez pour voir de plus près."],
    cm_zin: ["Zoom in", "Zoomer"], cm_zout: ["Zoom out", "Dézoomer"], cm_zreset: ["Reset", "Réinitialiser"], cm_no_boards: ["No boards to show yet.", "Aucun tableau à montrer pour l'instant."],
    cm_foot_q: ["Questions? We're here.", "Une question ? On est là."], cm_wa_btn: ["Message us on WhatsApp", "Écrivez-nous sur WhatsApp"], cm_top: ["Back to top", "Haut de page"],
    cm_wa_hi: ["Hello GECKO, it's {who} from {brand}.", "Bonjour GECKO, c'est {who} de {brand}."],
    cm_wa_approve: ["I approve the plan for {project}.", "Je valide le plan de {project}."], cm_wa_changes: ["I'd like some changes on the plan for {project}.", "Je voudrais des changements sur le plan de {project}."],
    cm_wa_love: ["I love this one on {project}: {what}", "J'adore celui-ci pour {project} : {what}"], cm_wa_chg: ["I'd like to change this one on {project}: {what}", "Je voudrais modifier celui-ci pour {project} : {what}"],
    cm_wa_note: ["My note: {note}", "Ma note : {note}"], cm_wa_open: ["Opening WhatsApp with your message.", "Ouverture de WhatsApp avec votre message."],
    cm_prev_bar: ["Preview. This is what the client sees.", "Aperçu. C'est ce que voit le client."], cm_prev_back: ["Back to the team app", "Retour à l'appli équipe"], cm_prev_nothing: ["Preview only: nothing was sent.", "Aperçu seulement : rien n'a été envoyé."]
  });

  // ---------- styles (tokens only), injected once ----------
  function css() {
    if (document.getElementById("cm-css")) return;
    var s = document.createElement("style"); s.id = "cm-css";
    s.textContent = [
      ".cl-page{--cl-top:0px;max-width:880px;margin:0 auto;padding:0 20px 36px;display:flex;flex-direction:column;gap:28px;color:var(--ink);min-height:100%}",
      ".cl-page *{min-width:0}",
      ".cl-page button:focus-visible,.cl-page a:focus-visible,.cl-page textarea:focus-visible{outline:2px solid var(--ink);outline-offset:2px}",
      ".cl-skip{position:absolute;left:-999px;top:0;background:var(--ink);color:var(--bg);padding:8px 14px;z-index:20}.cl-skip:focus{left:8px;top:8px}",
      ".cl-top{position:relative;display:flex;justify-content:center;align-items:center;padding-top:26px;min-height:64px}",
      ".cl-top .wm{width:96px;display:block;color:var(--ink)}.cl-top .wm svg{display:block;width:100%;height:auto}",
      ".cl-lang{position:absolute;right:0;top:50%;margin-top:-12px;display:inline-flex;border:1px solid var(--line);border-radius:var(--r-pill);overflow:hidden}",
      ".cl-lang button{all:unset;cursor:pointer;padding:5px 11px;font-stretch:125%;font-weight:700;font-size:10px;letter-spacing:.1em;line-height:1.4}",
      ".cl-lang button[aria-pressed=true]{background:var(--gel);color:var(--slate)}",
      ".cl-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:6px 0 4px}",
      ".cl-hero .hl{font-size:clamp(44px,10vw,84px)}.cl-hero p{margin:0;max-width:52ch}",
      ".cl-tabs{position:sticky;top:var(--cl-top);z-index:6;background:var(--bg);border-bottom:1px solid var(--line);border-top:1px solid var(--line);display:flex;gap:2px;overflow-x:auto;margin:0 -20px;padding:0 20px;scrollbar-width:none}",
      ".cl-tabs::-webkit-scrollbar{display:none}",
      ".cl-tabs button{all:unset;cursor:pointer;flex:none;padding:13px 12px;border-bottom:3px solid transparent;font-stretch:125%;font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:10.5px;color:var(--ink-2);white-space:nowrap}",
      ".cl-tabs button:first-child{margin-left:auto}.cl-tabs button:last-child{margin-right:auto}",
      ".cl-tabs button[aria-current=true]{border-color:var(--chroma);color:var(--ink)}",
      ".cl-tabs button:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}",
      ".cl-main{display:flex;flex-direction:column;gap:28px;flex:1}",
      ".cl-sec{display:flex;flex-direction:column;gap:18px}.cl-sec[hidden]{display:none}",
      ".cl-sec>header{display:flex;flex-direction:column;gap:6px}.cl-sec>header p{margin:0;color:var(--ink-2);max-width:60ch}",
      ".cl-proj{display:flex;flex-direction:column;gap:12px}",
      ".cl-ph{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--ink);padding-bottom:6px}",
      ".cl-box{border:1px solid var(--line);padding:16px;display:flex;flex-direction:column;gap:12px}",
      ".cl-gel,.cl-blue{border:0;padding:20px}",
      ".cl-gel{background:var(--gel);color:var(--slate);--ink:var(--slate);--ink-2:rgba(14,14,14,.66);--line:rgba(14,14,14,.22);--line-2:rgba(14,14,14,.08);--bg:var(--gel);--pill-todo-fg:var(--slate);--pill-todo-bd:rgba(14,14,14,.3)}",
      ".cl-blue{background:var(--chroma);color:var(--bounce);--ink:var(--bounce);--ink-2:rgba(247,246,242,.8);--line:rgba(247,246,242,.3);--bg:var(--chroma)}",
      ".cl-blue .btn.primary{background:var(--bounce);color:var(--slate);border-color:var(--bounce)}",
      ".cl-blue a{text-underline-offset:3px}",
      ".cl-needs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}",
      ".cl-needs li{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)}.cl-needs li:last-child{border-bottom:0}",
      ".cl-card{border:1px solid var(--line)}",
      ".cl-card+.cl-card{margin-top:-1px}",
      ".cl-ch{margin:0;font:inherit}",
      ".cl-cb{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px}",
      ".cl-cb:hover{background:var(--line-2)}.cl-cb:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}",
      ".cl-n{font-family:var(--f-display);font-size:20px;line-height:1;min-width:2.2em;color:var(--ink)}",
      ".cl-tt{flex:1;display:flex;flex-direction:column;gap:2px;font-weight:600}.cl-tt small{font-weight:400;color:var(--ink-2);font-size:12px}",
      ".cl-chev{width:9px;height:9px;border-right:2px solid var(--ink);border-bottom:2px solid var(--ink);transform:rotate(45deg);flex:none;margin:-4px 4px 0 0;transition:transform .15s}",
      ".cl-cb[aria-expanded=true] .cl-chev{transform:rotate(-135deg);margin-top:4px}",
      ".cl-cp{padding:4px 16px 18px 16px;display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--line)}.cl-cp[hidden]{display:none}",
      ".cl-cp h5{margin:0;font-family:var(--f-text);font-stretch:125%;font-weight:700;text-transform:uppercase;letter-spacing:.11em;font-size:10px;color:var(--ink-2)}",
      ".cl-hooks,.cl-scenes{margin:0;padding:0;list-style:none;display:flex;flex-direction:column}",
      ".cl-hooks li{display:flex;gap:10px;align-items:baseline;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line-2)}",
      ".cl-hooks .hn{font-family:var(--f-display);min-width:2.2em;color:var(--ink-2)}.cl-hooks .ht{flex:1}",
      ".cl-scenes{counter-reset:sc}.cl-scenes li{counter-increment:sc;display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--line-2)}",
      ".cl-scenes li::before{content:counter(sc);font-family:var(--f-display);color:var(--ink-2);min-width:1.4em}",
      ".cl-fb{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--line);padding-top:12px}",
      ".cl-ta{width:100%;border:1px solid var(--line);background:transparent;color:var(--ink);padding:8px 10px;border-radius:var(--r-box);resize:vertical;font:inherit}",
      ".cl-ta:focus{border-color:var(--ink);outline:none}",
      ".cl-gel .cl-ta{background:rgba(247,246,242,.55)}",
      ".cl-files .li{align-items:flex-start}",
      ".cl-tl{list-style:none;margin:0;padding:0 0 0 6px;display:flex;flex-direction:column}",
      ".cl-tl li{position:relative;padding:0 0 18px 26px;border-left:2px solid var(--line)}.cl-tl li:last-child{border-left-color:transparent;padding-bottom:0}",
      ".cl-tl li::before{content:\"\";position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;border:2px solid var(--ink);background:var(--bg)}",
      ".cl-tl li.done{border-left-color:var(--ink)}.cl-tl li.done::before{background:var(--ink)}",
      ".cl-tl li.next::before{border-color:var(--chroma);background:var(--bg);box-shadow:0 0 0 3px var(--gel)}",
      ".cl-tl .d{color:var(--ink-2);font-size:12px;display:block}",
      ".cl-inv{display:grid;grid-template-columns:1fr auto;gap:6px 14px;padding:14px 0;border-bottom:1px solid var(--line)}",
      ".cl-inv .r{text-align:right}.cl-inv .nm{font-weight:600}",
      ".cl-bzoom{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
      ".cl-bview{overflow:auto;border:1px solid var(--line);background:var(--bounce);color:var(--slate);max-height:70vh;touch-action:pan-x pan-y pinch-zoom}",
      ".cl-bin{width:calc(var(--z,1)*100%)}.cl-bin svg{display:block;width:100%;height:auto}",
      ".cl-foot{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;margin-top:auto}",
      ".cl-foot .wm{width:110px;color:var(--bounce)}.cl-foot .wm svg{display:block;width:100%;height:auto}",
      ".cl-foot .row{justify-content:center}",
      ".cl-foot .hl{font-size:clamp(30px,6vw,44px)}",
      ".cl-prev{position:fixed;inset:0;z-index:60;background:var(--bg);overflow-y:auto}.cl-prev .cl-page{--cl-top:48px}",
      ".cl-prevbar{position:sticky;top:0;z-index:8;height:48px;background:var(--slate);color:var(--bounce);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px}",
      ".cl-prevbar .btn{border-color:var(--bounce);color:var(--bounce)}",
      ".cl-prevbar .btn:hover{background:var(--line-2)}",
      ".cl-page .btn.primary{background:var(--ink);color:var(--bg)}",
      ".cl-gel .btn.primary{background:var(--slate);color:var(--bounce);border-color:var(--slate)}",
      "@media (max-width:560px){.cl-page{padding:0 16px 28px}.cl-tabs{margin:0 -16px;padding:0 16px}.cl-hero .hl{font-size:clamp(40px,13vw,60px)}.cl-top .wm{width:84px}.cl-box{padding:14px}.cl-cb{padding:12px}.cl-cp{padding:4px 12px 16px}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  // ---------- page state (survives re-renders) ----------
  var ST = { token: "", tab: "", open: {}, zoom: {}, notes: {} };
  function resetState(token) { if (ST.token !== token) ST = { token: token, tab: "", open: {}, zoom: {}, notes: {} }; }

  // ---------- helpers ----------
  function money(n) { var v = Math.round((+n || 0) * 100) / 100; return u.money(v, v % 1 === 0 ? 0 : 2); }
  function dfull(s) { return u.fmtDate(s, { day: "numeric", month: "long", year: "numeric" }); }
  function ddm(s) { return u.fmtDate(s, { day: "numeric", month: "short", year: "numeric" }); }
  function stWord(s) { return t("cm_st_" + (s || "todo")); }
  function stPill(s) { return ui.pill(stWord(s), { approved: "done", revise: "alert", review: "wip", edit: "wip" }[s] || ""); }
  function modeWord(x) { return t(x === "Indirect" ? "cm_indirect" : "cm_direct"); }
  function stageWord(s) { return t("po_s_" + s); }
  function safeLink(l) { return /^https?:\/\//i.test(l || "") ? l : ""; }
  function lines(s) { return String(s || "").split(/\r?\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  /** The svg comes from the team's board; strip anything active before it goes into the page. */
  function cleanSvg(svg) {
    return String(svg || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/(href|xlink:href)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "");
  }
  function needText(n) {
    var key = "po_need_" + n.kind;
    if (!GK.i18n.has(key)) return n.text || "";
    var amt = n.amount != null ? money(n.amount) + (n.due ? ", " + t(n.late ? "po_need_late" : "po_need_due", { date: u.fmtDate(n.due) }) : "") : "";
    return t(key, { name: n.project, amt: amt, no: n.no || "", date: n.date ? u.fmtDate(n.date, { weekday: "long", day: "numeric", month: "long" }) : "" }).replace(/\.\./g, ".");
  }
  function contactBlock(co) {
    var wa = WA + encodeURIComponent("Hello GECKO");
    var ph = String(co.phone || "").replace(/[^\d+]/g, "");
    return '<div class="row"><a href="tel:' + esc(ph) + '">' + esc(co.phone) + '</a><span aria-hidden="true">·</span><a href="mailto:' + esc(co.email) + '">' + esc(co.email) + '</a><span aria-hidden="true">·</span>' +
      '<a href="https://instagram.com/' + esc(String(co.instagram || "").replace(/^@/, "")) + '" target="_blank" rel="noopener noreferrer">' + esc(co.instagram) + "</a></div>" +
      '<a class="btn primary" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' + esc(t("cm_wa_btn")) + "</a>";
  }
  var CO = { name: "GECKO", phone: "+216 26 191 555", email: "reachoutgecko@gmail.com", instagram: "@geckoagency_" };
  function langBar() {
    var l = GK.i18n.lang();
    return '<div class="cl-lang" role="group" aria-label="' + esc(t("cm_lang")) + '"><button type="button" data-a="cm-lang" data-l="en" aria-pressed="' + (l === "en") + '">EN</button><button type="button" data-a="cm-lang" data-l="fr" aria-pressed="' + (l === "fr") + '">FR</button></div>';
  }
  function footer(co) {
    return '<footer class="cl-foot cl-box cl-blue" aria-label="' + esc(t("cm_foot_q")) + '"><h2 class="hl">' + esc(t("cm_foot_q")) + "</h2>" + contactBlock(co) + '<span class="wm">' + GK.logo.wordmark + "</span></footer>";
  }
  function topBar() { return '<div class="cl-top"><span class="wm" role="img" aria-label="GECKO">' + GK.logo.wordmark + "</span>" + langBar() + "</div>"; }

  function unavailable() {
    return '<div class="cl-page"><a class="cl-skip" href="#cl-main">' + esc(t("cm_skip")) + "</a>" + topBar() +
      '<main id="cl-main" class="cl-hero" style="flex:1;justify-content:center"><h1 class="hl">' + esc(t("cm_unavail_t")) + " <i>" + esc(t("cm_unavail_a")) + "</i></h1><p>" + esc(t("cm_unavail_b")) + "</p>" + contactBlock(CO) + "</main>" +
      '<footer class="cl-foot"><span class="wm" style="color:var(--ink)">' + GK.logo.wordmark + "</span></footer></div>";
  }

  // ---------- building blocks ----------
  var uid = 0;
  function accordion(id, headHtml, bodyHtml) {
    var open = !!ST.open[id];
    return '<div class="cl-card"><h3 class="cl-ch"><button type="button" class="cl-cb" data-a="cm-toggle" data-id="' + esc(id) + '" aria-expanded="' + open + '" aria-controls="cl-p-' + esc(id) + '">' + headHtml + '<span class="cl-chev" aria-hidden="true"></span></button></h3>' +
      '<div class="cl-cp" id="cl-p-' + esc(id) + '"' + (open ? "" : " hidden") + ">" + bodyHtml + "</div></div>";
  }
  /** Note box + buttons. kinds: [[kind, labelKey, primary]] */
  function feedback(target, project, what, kinds, ideaProject, fileMeta) {
    var id = "cl-n" + (uid++), noteKey = fileMeta ? "file:" + fileMeta.fileKey + ":v" + fileMeta.version : target;
    return '<div class="cl-fb"><label class="lab sm muted" for="' + id + '">' + esc(t("cm_note")) + '</label><textarea class="cl-ta" id="' + id + '" rows="2" data-note="' + esc(noteKey) + '">' + esc(ST.notes[noteKey] || "") + "</textarea><div class=\"row\">" +
      kinds.map(function (k) {
        return '<button type="button" class="btn ' + (k[2] ? "primary" : "") + ' sm" data-a="cm-fb" data-kind="' + esc(k[0]) + '" data-target="' + esc(target) + '" data-project="' + esc(project.name) + '" data-pid="' + esc(project.id || "") + '" data-what="' + esc(what || "") + '"' +
          (fileMeta ? ' data-filemeta="' + esc(JSON.stringify(fileMeta)) + '"' : "") + ">" + esc(t(k[1])) + "</button>";
      }).join("") + "</div></div>";
  }
  function projHead(p, multi) {
    return multi ? '<div class="cl-ph"><h2 class="sec">' + esc(p.name) + '</h2><span class="small muted">' + esc(p.pack) + "</span></div>" : "";
  }
  function sectionHead(title, sub) { return "<header><h2 class=\"sec\" style=\"font-size:26px\">" + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</header>"; }

  function stepper(p) {
    var STG = ["onboard", "plan", "shoot", "edit", "delivered", "testing", "report", "done"];
    return '<div class="stepper" role="list" aria-label="' + esc(t("cm_now")) + '">' + STG.map(function (s, i) {
      var cls = p.stage === "retention" || i < p.stageIdx ? "done" : i === p.stageIdx ? "now" : "";
      return '<div role="listitem" class="' + cls + '"' + (i === p.stageIdx ? ' aria-current="step"' : "") + ">" + esc(stageWord(s)) + "</div>";
    }).join("") + "</div>";
  }

  // ---------- sections ----------
  function overview(snap) {
    var name = snap.contact && snap.contact.name ? snap.contact.name : snap.brand.name;
    var multi = snap.projects.length > 1, h = '<header><h2 class="sec" style="font-size:26px">' + esc(t("cm_hello", { name: name })) + "</h2><p class=\"muted\" style=\"margin:0;max-width:60ch\">" + esc(t("cm_intro")) + "</p></header>";
    var needs = []; snap.projects.forEach(function (p) { (p.needs || []).forEach(function (n) { needs.push(n); }); });
    h += '<div class="cl-box cl-gel"><h3 class="sec">' + esc(t("po_needs")) + "</h3>";
    if (!needs.length) h += '<p style="margin:0">' + esc(t("po_need_nothing")) + "</p>";
    else h += '<ol class="cl-needs">' + needs.map(function (n, i) {
      var tab = n.kind === "plan" && snap.sections.plan ? "plan" : /^(deposit|balance|month|invoice)$/.test(n.kind) && snap.sections.invoices ? "invoices" : "";
      return "<li><span><span class=\"lab sm\" style=\"margin-right:10px\">" + (i + 1) + "</span>" + esc(needText(n)) + "</span>" +
        (tab ? '<button type="button" class="btn sm" data-a="cm-tab" data-t="' + tab + '">' + esc(t("cm_open_sec")) + "</button>" : "") + "</li>";
    }).join("") + "</ol>";
    h += "</div>";
    snap.projects.forEach(function (p) {
      h += '<div class="cl-proj">' + projHead(p, true) + stepper(p);
      var meta = [];
      if (p.stageIdx <= 2 && p.shootDate) meta.push(t("po_shoot_on", { date: dfull(p.shootDate) }));
      if (p.progress && p.progress.total && p.stageIdx >= 3) meta.push(t("po_videos", { done: p.progress.done, total: p.progress.total }));
      if (meta.length) h += '<p class="muted" style="margin:0">' + esc(meta.join(" · ")) + "</p>";
      if (p.progress && p.progress.total && p.stageIdx >= 3) h += ui.meter(Math.round(p.progress.done / p.progress.total * 100));
      h += "</div>";
    });
    return h;
  }
  function planSec(snap) {
    var multi = snap.projects.length > 1, h = sectionHead(t("cm_plan_h"), t("cm_plan_sub"));
    snap.projects.forEach(function (p, pi) {
      h += '<div class="cl-proj">' + projHead(p, multi);
      if (!p.angles.length) h += '<p class="muted" style="margin:0">' + esc(t("cm_no_angles")) + "</p>";
      else h += "<div>" + p.angles.map(function (a, ai) {
        return accordion("a" + pi + "-" + ai, '<span class="cl-n">A' + (ai + 1) + '</span><span class="cl-tt">' + esc(a.name) + "<small>" + esc(t("cm_angle", { n: ai + 1 })) + "</small></span>",
          '<h5>' + esc(t("cm_why")) + "</h5><p style=\"margin:0\">" + esc(a.why || "—") + "</p>");
      }).join("") + "</div>";
      if (p.planApproved) h += '<div class="cl-box"><div class="row">' + ui.pill(t("cm_plan_ok2"), "done") + "<span>" + esc(p.planApprovedOn ? t("cm_plan_ok", { date: dfull(p.planApprovedOn) }) : t("cm_plan_ok2")) + "</span></div></div>";
      else h += '<div class="cl-box cl-gel"><h3 class="sec">' + esc(t("cm_approve_h")) + '</h3><p style="margin:0">' + esc(t("cm_approve_b")) + "</p>" + feedback("plan", p, "", [["approve", "cm_approve", true], ["changes", "cm_changes", false]]) + "</div>";
      h += "</div>";
    });
    return h;
  }
  function statusOf(r) { return r.hooks && r.hooks[0] ? r.hooks[0].status : "todo"; }
  function scriptsSec(snap) {
    var multi = snap.projects.length > 1, h = sectionHead(t("cm_scripts_h"), t("cm_scripts_sub")), any = false;
    snap.projects.forEach(function (p, pi) {
      var part = "";
      (p.reels || []).forEach(function (r, ri) {
        any = true;
        var body = '<div><h5>' + esc(t("cm_hooks")) + '</h5><ul class="cl-hooks">' + (r.hooks || []).map(function (hk, hi) {
          return '<li><span class="hn">H' + (hi + 1) + '</span><span class="ht">' + esc(hk.text) + "</span>" + stPill(hk.status) + "</li>";
        }).join("") + "</ul></div>";
        if (r.script) {
          var ls = lines(r.script);
          body += "<div><h5>" + esc(t("cm_script")) + "</h5>" + (ls.length > 1 ? '<ol class="cl-scenes">' + ls.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>" : '<p style="margin:0">' + esc(ls[0] || "") + "</p>") + "</div>";
        } else body += '<p class="muted small" style="margin:0">' + esc(t("cm_script_soon")) + "</p>";
        var what = (r.angle || "") + " · " + modeWord(r.mode);
        body += feedback(r.ideaId ? "idea:" + r.ideaId : "reel:" + r.id, p, what, [["approve", "cm_love", true], ["changes", "cm_change", false]]);
        part += accordion("r" + pi + "-" + ri, '<span class="cl-n">R' + (ri + 1) + '</span><span class="cl-tt">' + esc(r.angle || t("cm_reel", { n: ri + 1 })) + "<small>" + esc(modeWord(r.mode)) + " · " + esc(t("cm_reel", { n: ri + 1 })) + "</small></span>" + stPill(statusOf(r)), body);
      });
      var ideas = (p.ideas || []).map(function (i, ii) {
        any = true;
        var body = "";
        if (i.hook) body += "<div><h5>" + esc(t("cm_hooks")) + '</h5><p style="margin:0">' + esc(i.hook) + "</p></div>";
        if (i.concept) body += "<div><h5>" + esc(t("cm_concept")) + '</h5><p style="margin:0">' + esc(i.concept) + "</p></div>";
        var ls = lines(i.script);
        if (ls.length) body += "<div><h5>" + esc(t("cm_script")) + '</h5><ol class="cl-scenes">' + ls.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>";
        body += feedback("idea:" + i.id, p, i.title, [["approve", "cm_love", true], ["changes", "cm_change", false]]);
        return accordion("i" + pi + "-" + ii, '<span class="cl-n">' + (ii + 1) + '</span><span class="cl-tt">' + esc(i.title) + "<small>" + esc(modeWord(i.mode)) + "</small></span>", body);
      }).join("");
      var cars = (p.carousels || []).map(function (c, ci) {
        any = true;
        return '<div class="li"><span class="cl-tt"><span>' + esc(c.title || t("cm_carousels")) + "</span><small>" + esc(c.angle) + "</small></span>" + stPill(c.status) + "</div>";
      }).join("");
      if (part || ideas || cars) {
        h += '<div class="cl-proj">' + projHead(p, multi) + (part ? "<div>" + part + "</div>" : "") +
          (ideas ? '<h3 class="sec">' + esc(t("cm_ideas")) + "</h3><div>" + ideas + "</div>" : "") + (cars ? '<h3 class="sec">' + esc(t("cm_carousels")) + '</h3><div class="list">' + cars + "</div>" : "") + "</div>";
      }
    });
    return any ? h : h + '<p class="muted">' + esc(t("cm_no_scripts")) + "</p>";
  }
  function filesSec(snap) {
    var multi = snap.projects.length > 1, h = sectionHead(t("cm_files_h"), t("cm_files_sub")), any = false;
    snap.projects.forEach(function (p) {
      var rows = "";
      function row(code, label, status, drive, clientOk, target, fileMeta) {
        any = true;
        var act = "";
        if (status === "approved") {
          var l = safeLink(drive);
          act = p.unlocked ? (l ? '<a class="btn sm" href="' + esc(l) + '" target="_blank" rel="noopener noreferrer">' + esc(t("cm_open")) + "</a>" : '<span class="small muted">' + esc(t("cm_file_soon")) + "</span>") : '<span class="small muted">' + esc(t("cm_locked")) + "</span>";
        }
        rows += '<div class="li"><div class="stack" style="gap:3px"><span>' + esc(label) + '</span><span class="code muted">' + esc(code) + '</span></div><div class="row" style="justify-content:flex-end;flex-wrap:wrap">' + stPill(status) +
          (clientOk ? ui.pill(t("cm_client_approved"), "done") : "") + act + "</div></div>" +
          (target && fileMeta && fileMeta.fileKey && fileMeta.version && fileMeta.reelId && status === "approved" ?
            feedback(target, p, code + " · v" + fileMeta.version, [["approve", "cm_love", true], ["changes", "cm_change", false]], null, fileMeta) : "");
      }
      (p.reels || []).forEach(function (r) { (r.files || []).forEach(function (f, i) {
        var meta = { projectId: p.id, reelId: r.id, fileKey: f.key, version: f.version, revisionId: f.revisionId || "" };
        row(f.code, (r.angle ? r.angle + " · " : "") + "H" + (i + 1) + " " + ((r.hooks[i] || {}).text || ""), f.status, f.drive, f.clientOk, "reel:" + r.id, meta);
      }); });
      (p.carousels || []).forEach(function (c) { if (c.code) row(c.code, c.title || t("cm_carousels"), c.status, c.drive, c.clientOk); });
      var anyApproved = (p.progress && p.progress.done > 0) || p.stageIdx >= 3;
      h += '<div class="cl-proj">' + projHead(p, multi);
      if (!p.unlocked && anyApproved) h += '<div class="cl-box cl-gel"><p style="margin:0"><strong>' + esc(t(p.monthly ? "cm_locked_m" : "cm_locked_bal")) + "</strong></p></div>";
      h += rows ? '<div class="list cl-files">' + rows + "</div>" : '<p class="muted" style="margin:0">' + esc(t("cm_no_files")) + "</p>";
      h += "</div>";
    });
    return h;
  }
  function timelineSec(snap) {
    var multi = snap.projects.length > 1, h = sectionHead(t("cm_tl_h"), t("cm_tl_sub"));
    snap.projects.forEach(function (p) {
      var tl = p.timeline || [], nextSet = false;
      h += '<div class="cl-proj">' + projHead(p, multi) + '<ol class="cl-tl">' + tl.map(function (e) {
        var cls = e.done ? "done" : !nextSet ? (nextSet = true, "next") : "";
        var label = (e.key === "upfront" || GK.i18n.has("cm_tl_" + e.key)) ? t(e.key === "upfront" ? (p.monthly ? "cm_tl_month" : "cm_tl_deposit") : "cm_tl_" + e.key) : e.label;
        return '<li class="' + cls + '"' + (cls === "next" ? ' aria-current="step"' : "") + "><strong>" + esc(label) + "</strong>" + (e.date ? '<span class="d">' + esc(ddm(e.date)) + "</span>" : "") + "</li>";
      }).join("") + "</ol></div>";
    });
    return h;
  }
  function invoicesSec(snap) {
    var h = sectionHead(t("cm_inv_h"), t("cm_inv_sub"));
    if (!snap.invoices.length) return h + '<p class="muted">' + esc(t("cm_no_inv")) + "</p>";
    h += "<div>" + snap.invoices.map(function (i) {
      var kind = { paid: "done", overdue: "alert", partial: "wip", issued: "wip" }[i.status] || "";
      return '<div class="cl-inv"><div><span class="nm">' + esc(i.label || t("cm_inv_no", { no: i.no })) + '</span><br><span class="code muted">' + esc(i.no) + '</span> <span class="small muted">· ' + esc(t("cm_issued", { date: ddm(i.issued) })) + (i.due && i.balance ? " · " + esc(t("cm_due", { date: ddm(i.due) })) : "") + "</span></div>" +
        '<div class="r">' + ui.pill(t("cm_is_" + i.status), kind) + '</div><div class="small muted">' + esc(t("cm_total")) + ' <span class="num">' + esc(money(i.total)) + '</span></div><div class="r small">' + (i.balance ? esc(t("cm_left")) + ' <strong class="num">' + esc(money(i.balance)) + "</strong>" : "") + "</div></div>";
    }).join("") + "</div>";
    h += '<div class="cl-box cl-gel"><h3 class="sec">' + esc(t("cm_pay_h")) + '</h3><p style="margin:0">' + esc(t("cm_pay_b")) + "</p></div>";
    return h;
  }
  function boardsSec(snap) {
    var h = sectionHead(t("cm_boards_h"), t("cm_boards_sub"));
    if (!snap.boards.length) return h + '<p class="muted">' + esc(t("cm_no_boards")) + "</p>";
    snap.boards.forEach(function (b, i) {
      var z = ST.zoom[i] || 1;
      h += '<div class="cl-proj" data-board="' + i + '"><div class="cl-ph"><h2 class="sec">' + esc(b.title) + '</h2><div class="cl-bzoom">' +
        '<button type="button" class="btn sm" data-a="cm-zoom" data-i="' + i + '" data-d="-1">' + esc(t("cm_zout")) + '</button><button type="button" class="btn sm" data-a="cm-zoom" data-i="' + i + '" data-d="1">' + esc(t("cm_zin")) + '</button><button type="button" class="btn sm ghost" data-a="cm-zoom" data-i="' + i + '" data-d="0">' + esc(t("cm_zreset")) + "</button></div></div>" +
        '<div class="cl-bview" tabindex="0" role="group" aria-label="' + esc(b.title) + '"><div class="cl-bin" style="--z:' + z + '">' + cleanSvg(b.svg) + "</div></div></div>";
    });
    return h;
  }

  var TABS = [["overview", overview], ["plan", planSec], ["scripts", scriptsSec], ["files", filesSec], ["timeline", timelineSec], ["invoices", invoicesSec], ["boards", boardsSec]];

  function pageHTML(share, opts) {
    var snap = share.snapshot; uid = 0;
    var sec = snap.sections || { plan: 1, scripts: 1, files: 1, timeline: 1, invoices: 1, boards: 1 };
    snap.sections = sec; snap.projects = snap.projects || []; snap.invoices = snap.invoices || []; snap.boards = snap.boards || [];
    snap.projects.forEach(function (p) { p.angles = p.angles || []; p.reels = p.reels || []; p.carousels = p.carousels || []; p.needs = p.needs || []; });
    var co = Object.assign({}, CO, snap.company || {});
    var tabs = TABS.filter(function (x) { return x[0] === "overview" || sec[x[0]]; });
    if (!tabs.some(function (x) { return x[0] === ST.tab; })) ST.tab = "overview";
    var brand = snap.brand && snap.brand.name || "";
    var h = '<div class="cl-page" data-token="' + esc(share.id) + '"' + (opts && opts.preview ? ' data-preview="1"' : "") + ' lang="' + GK.i18n.lang() + '"><a class="cl-skip" href="#cl-main">' + esc(t("cm_skip")) + "</a>" + topBar();
    h += '<div class="cl-hero"><span class="lab br">' + esc(brand) + '</span><h1 class="hl">' + esc(t("cm_hero_t")) + " <i>" + esc(t("cm_hero_a")) + "</i></h1>";
    h += "<p>" + esc(snap.title || t("cm_for", { brand: brand })) + "</p>";
    if (share.publishedAt) h += '<span class="small muted">' + esc(t("cm_updated", { date: dfull(share.publishedAt) })) + "</span>";
    h += "</div>";
    h += '<nav class="cl-tabs" aria-label="' + esc(t("cm_sections")) + '">' + tabs.map(function (x) {
      return '<button type="button" data-a="cm-tab" data-t="' + x[0] + '"' + (x[0] === ST.tab ? ' aria-current="true"' : "") + ">" + esc(t("cm_tab_" + x[0])) + "</button>";
    }).join("") + "</nav>";
    h += '<main id="cl-main" class="cl-main">' + tabs.map(function (x) {
      return '<section class="cl-sec" id="cl-s-' + x[0] + '" data-sec="' + x[0] + '"' + (x[0] === ST.tab ? "" : " hidden") + ">" + x[1](snap) + "</section>";
    }).join("") + "</main>";
    h += footer(co) + "</div>";
    return h;
  }

  // ---------- public API ----------
  var CM = {
    match: function (h) { return /^cl-[A-Za-z0-9]+$/.test(h || "") ? h.slice(3) : null; },
    render: function (token, opts) {
      css(); resetState(token); opts = opts || {};
      var share = opts.share || (S.publicShare && S.publicShare.id === token ? S.publicShare : null);
      if (!share || (!share.enabled && !opts.force) || !share.snapshot) return unavailable();
      if (!opts.preview && !ST.langInit) {   // first visit: open in the language the team published in, unless the visitor already chose one
        ST.langInit = true;
        if (share.snapshot.lang && u.lsGet("gecko-ops-lang", null) == null) { GK.i18n.setLang(share.snapshot.lang); document.documentElement.lang = GK.i18n.lang(); }
      }
      return pageHTML(share, opts);
    },
    after: function (appEl) {
      try {
        var share = S.publicShare && S.publicShare.id === ST.token ? S.publicShare : null;
        document.title = (share && share.snapshot ? share.snapshot.brand.name + " · " : "") + "GECKO";
        if (!document.querySelector('meta[name="robots"]')) { var mt = document.createElement("meta"); mt.name = "robots"; mt.content = "noindex"; document.head.appendChild(mt); }
      } catch (e) {}
    },
    /** Team side: show the page above the app, as the client sees it. */
    preview: function (share) {
      css(); closePreview();
      resetState(share.id);
      var ov = document.createElement("div"); ov.id = "cl-preview"; ov.className = "cl-prev"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", t("cm_prev_bar"));
      ov._share = share;
      document.body.appendChild(ov); paintPreview(ov);
      var b = ov.querySelector("[data-a=cm-prev-close]"); if (b) b.focus();
    }
  };
  function paintPreview(ov) {
    var share = ov._share, y = ov.scrollTop;
    ov.innerHTML = '<div class="cl-prevbar"><span class="lab sm">' + esc(t("cm_prev_bar")) + '</span><button type="button" class="btn sm" data-a="cm-prev-close">' + esc(t("cm_prev_back")) + "</button></div>" + pageHTML(share, { preview: true });
    ov.scrollTop = y;
  }
  function closePreview() { var ov = document.getElementById("cl-preview"); if (ov) ov.remove(); }
  function previewOpen() { return document.getElementById("cl-preview"); }
  function repaint() { var ov = previewOpen(); if (ov) paintPreview(ov); else ui.render(true); }
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && previewOpen()) closePreview(); });

  GK.clientMode = CM;

  // ---------- actions ----------
  function pageOf(el) { return el.closest(".cl-page"); }
  GK.act("cm-lang", function (el) { GK.i18n.setLang(el.getAttribute("data-l")); document.documentElement.lang = GK.i18n.lang(); repaint(); });
  GK.act("cm-prev-close", closePreview);
  GK.act("cm-tab", function (el) {
    var page = pageOf(el), tab = el.getAttribute("data-t"); if (!page) return;
    ST.tab = tab;
    page.querySelectorAll(".cl-sec").forEach(function (s) { s.hidden = s.getAttribute("data-sec") !== tab; });
    page.querySelectorAll(".cl-tabs button").forEach(function (b) { if (b.getAttribute("data-t") === tab) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    var bar = page.querySelector(".cl-tabs"), scroller = document.getElementById("cl-preview") || window;
    var cur = page.querySelector('.cl-tabs [aria-current="true"]'); if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
    var top = page.querySelector(".cl-hero"), off = top ? top.offsetTop + top.offsetHeight - 8 : 0;
    if (scroller === window) { if (window.scrollY > off) window.scrollTo(0, off); } else if (scroller.scrollTop > off) scroller.scrollTop = off;
    var sec = page.querySelector("#cl-s-" + tab); if (sec) { sec.setAttribute("tabindex", "-1"); }
  });
  GK.act("cm-toggle", function (el) {
    var id = el.getAttribute("data-id"), open = el.getAttribute("aria-expanded") !== "true";
    el.setAttribute("aria-expanded", String(open)); ST.open[id] = open;
    var p = document.getElementById("cl-p-" + id); if (p) p.hidden = !open;
  });
  GK.act("cm-zoom", function (el) {
    var i = el.getAttribute("data-i"), d = +el.getAttribute("data-d"), z = ST.zoom[i] || 1;
    z = d === 0 ? 1 : Math.max(1, Math.min(4, z + d * 0.5)); ST.zoom[i] = z;
    var box = pageOf(el).querySelector('[data-board="' + i + '"] .cl-bin'); if (box) box.style.setProperty("--z", z);
  });
  document.addEventListener("input", function (ev) {
    var ta = ev.target; if (ta && ta.matches && ta.matches("textarea[data-note]")) ST.notes[ta.getAttribute("data-note")] = ta.value;
  });
  GK.act("cm-fb", function (el) {
    var page = pageOf(el); if (!page) return;
    var kind = el.getAttribute("data-kind"), target = el.getAttribute("data-target"), project = el.getAttribute("data-project"), what = el.getAttribute("data-what"), pid = el.getAttribute("data-pid");
    var box = el.closest(".cl-fb"), ta = box && box.querySelector("textarea"), note = ta ? ta.value.trim() : "";
    if (page.getAttribute("data-preview")) return ui.toast(t("cm_prev_nothing"));
    var token = page.getAttribute("data-token"), share = S.publicShare;
    if (!share || share.id !== token || !share.snapshot) return ui.toast("This page is unavailable. Refresh the link and try again.");
    var who = (share.snapshot.contact && share.snapshot.contact.name) || share.snapshot.brand.name, brand = share.snapshot.brand.name;
    var meta = null;
    if (el.hasAttribute("data-filemeta")) {
      try { meta = JSON.parse(el.getAttribute("data-filemeta")); } catch (e) { return ui.toast("This file reference is invalid. Refresh the page and try again."); }
      if (!meta || meta.projectId !== pid || !meta.reelId || !meta.fileKey || !meta.version || target !== "reel:" + meta.reelId) return ui.toast("This file reference is invalid. Refresh the page and try again.");
    }
    var key = target === "plan" ? (kind === "approve" ? "cm_wa_approve" : "cm_wa_changes") : (kind === "approve" ? "cm_wa_love" : "cm_wa_chg");
    var msg = t("cm_wa_hi", { who: who, brand: brand }) + "\n" + t(key, { project: project, what: what });
    if (note) msg += "\n" + t("cm_wa_note", { note: note });
    var feedbackText = note || (target === "plan" ? t(key, { project: project, what: what }) : what);
    if (meta) feedbackText += "\n\n[[gecko-file:v1:" + encodeURIComponent(JSON.stringify(meta)) + "]]";
    S.submitClientFeedback(token, kind, target, feedbackText, pid).then(function () {
      delete ST.notes[ta ? ta.getAttribute("data-note") : target]; if (ta) ta.value = "";
      ui.toast(t("cm_wa_open"));
      var a = document.createElement("a"); a.href = WA + encodeURIComponent(msg); a.target = "_blank"; a.rel = "noopener noreferrer"; a.className = "cl-wa-open";
      a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove();
    }, function (error) {
      ui.toast("Feedback was not saved: " + (error && error.message ? error.message : "backend error"));
    });
  });
  CM._waUrl = function (msg) { return WA + encodeURIComponent(msg); };
})(window.GK);
