/* GECKO Ops · module: studio · idea detail (script editor, links, whiteboard, send to project, exports) */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  var SH = GK.studio, H = SH.h;

  GK.i18n.add({
    st_d_title: ["Shape the", "Travaillez cette"], st_d_accent: ["idea", "idée"],
    st_d_back: ["All ideas", "Toutes les idées"], st_save: ["Save", "Enregistrer"],
    st_d_basics: ["The idea", "L'idée"], st_d_title_f: ["Title", "Titre"], st_d_client: ["Client", "Client"], st_d_project: ["Project (optional)", "Projet (facultatif)"],
    st_d_angle: ["Angle", "Angle"], st_d_angle_hint: ["Pick one of the project's angles or type a new one.", "Choisissez un angle du projet ou tapez-en un nouveau."],
    st_d_mode: ["Mode", "Mode"], st_d_mode_d: ["Direct to camera (D)", "Face caméra (D)"], st_d_mode_i: ["Indirect, b-roll (I)", "Indirect, plans de coupe (I)"],
    st_d_format: ["Format", "Format"], st_d_owner: ["Owner", "Responsable"], st_d_prio: ["Priority", "Priorité"], st_d_tags: ["Tags", "Tags"],
    st_d_tags_hint: ["Separate with commas.", "Séparez par des virgules."], st_d_none: ["None", "Aucun"],
    st_d_hook: ["Hook line (first 3 seconds)", "Accroche (3 premières secondes)"], st_d_concept: ["Concept: why it works", "Concept : pourquoi ça marche"],
    st_d_concept_ph: ["Two to four lines. What does the viewer feel, and why do they stay?", "Deux à quatre lignes. Que ressent le spectateur, pourquoi reste-t-il ?"],
    st_d_script: ["Script", "Script"], st_d_scenes: ["Scenes", "Scènes"], st_d_scene_n: ["Scene {n}", "Scène {n}"],
    st_d_visual: ["Visual", "Image"], st_d_voice: ["Voice or on-screen text", "Voix ou texte à l'écran"], st_d_secs: ["Seconds", "Secondes"],
    st_d_add_scene: ["Add scene", "Ajouter une scène"], st_d_rm: ["Remove", "Retirer"], st_d_up: ["Move up", "Monter"], st_d_down: ["Move down", "Descendre"],
    st_d_text: ["Free script", "Script libre"], st_d_text_ph: ["Lines to say, notes for the shoot…", "Phrases à dire, notes pour le tournage…"],
    st_d_time: ["About {a} s spoken (2.5 words a second) · scenes add up to {b} s", "Environ {a} s à l'oral (2,5 mots par seconde) · les scènes font {b} s"],
    st_d_links: ["Links", "Liens"], st_d_link_label: ["Label", "Nom"], st_d_link_url: ["Link (https://…)", "Lien (https://…)"], st_d_link_add: ["Add link", "Ajouter le lien"],
    st_d_link_ph: ["Reference reel, Drive folder…", "Reel de référence, dossier Drive…"], st_d_link_bad: ["Paste a full link starting with http:// or https://", "Collez un lien complet qui commence par http:// ou https://"],
    st_d_link_none: ["No links yet. Add inspiration, a Drive folder, reference reels.", "Pas encore de liens. Ajoutez une inspiration, un dossier Drive, des reels de référence."],
    st_d_open_link: ["Open", "Ouvrir"],
    st_d_wb: ["Whiteboard", "Tableau blanc"], st_d_wb_open: ["Open whiteboard", "Ouvrir le tableau blanc"], st_d_wb_new: ["Create whiteboard", "Créer un tableau blanc"],
    st_d_wb_note: ["A storyboard board linked to this idea.", "Un tableau de storyboard lié à cette idée."], st_d_wb_has: ["Attached: {title}", "Lié : {title}"],
    st_d_wb_title: ["Storyboard · {title}", "Storyboard · {title}"],
    st_d_send: ["Send to project", "Envoyer au projet"], st_d_send_btn: ["Send to a project", "Envoyer à un projet"],
    st_d_send_note: ["Creates the angle if it is missing, then a reel with this hook and script.", "Crée l'angle s'il manque, puis un reel avec cette accroche et ce script."],
    st_d_send_need_ready: ["Only a ready idea can be sent.", "Seule une idée prête peut être envoyée."],
    st_d_send_need_rights: ["Ask the owner or the Client Lead to send it to the project.", "Demandez au fondateur ou au responsable clients de l'envoyer au projet."],
    st_d_send_no_proj: ["This client has no project between onboarding and editing.", "Ce client n'a aucun projet entre le démarrage et le montage."],
    st_d_send_pick: ["Project", "Projet"], st_d_send_angle: ["Angle used: {a}", "Angle utilisé : {a}"], st_d_send_new_angle: ["Angle used: {a} (new)", "Angle utilisé : {a} (nouveau)"],
    st_d_send_go: ["Create the reel", "Créer le reel"], st_d_angle_default: ["General", "Général"],
    st_d_sent: ["Sent to production", "Envoyé en production"], st_d_sent_t: ["Sent to", "Envoyé en"], st_d_sent_a: ["production", "production"],
    st_d_file: ["File code of hook 1", "Code fichier de l'accroche 1"], st_d_open_prod: ["Open in production", "Ouvrir en production"], st_d_copy_code: ["Copy code", "Copier le code"],
    st_d_reel_in: ["Reel in {p}", "Reel dans {p}"], st_d_hooks_ok: ["{a} of {n} hooks approved", "{a} accroches validées sur {n}"],
    st_d_reel_gone: ["The linked reel is no longer in the project.", "Le reel lié n'est plus dans le projet."],
    st_d_shot_pill: ["Shot", "Tourné"], st_d_ready_pill: ["Ready, not sent yet", "Prêt, pas encore envoyé"],
    st_d_share: ["Show to client", "Montrer au client"], st_d_share_note: ["Only the concept, the hook and the script are shared. Notes, links and owners stay private.", "Seuls le concept, l'accroche et le script sont partagés. Les notes, liens et responsables restent privés."],
    st_d_share_on: ["Shown on the client page", "Visible sur la page client"], st_d_share_off: ["Private", "Privé"],
    st_d_export: ["Export", "Export"], st_d_copy_script: ["Copy script", "Copier le script"], st_d_copy_shots: ["Copy shot list", "Copier la liste de plans"],
    st_d_notes: ["Notes", "Notes"], st_d_notes_ph: ["Anything the team should know", "Tout ce que l'équipe doit savoir"],
    st_d_delete: ["Delete idea", "Supprimer l'idée"], st_d_delete_q: ["Delete this idea?", "Supprimer cette idée ?"], st_d_delete_b: ["The idea and its script are removed. The whiteboard stays.", "L'idée et son script sont supprimés. Le tableau blanc reste."],
    st_d_history: ["History", "Historique"], st_d_stage: ["Stage", "Étape"],
    st_d_rev_send: ["Send approved revision", "Envoyer la version validée"],
    st_d_source: ["Production source", "Source de production"],
    st_d_existing_send: ["This approved revision is already linked to the project.", "Cette version validée est déjà liée au projet."],
    st_d_review_by: ["{who} asked Heni to review this script.", "{who} demande à Heni de relire ce script."],
    st_d_review_hint: ["Add a hook, a script and a client, then request review. Only Heni marks it ready.", "Ajoutez accroche, script et client, puis demandez la relecture. Seul Heni la marque prête."],
    st_d_missing: ["Still needed before ready:", "Il manque avant « prêt » :"],
    st_d_readonly: ["You can look but not change this idea.", "Vous pouvez consulter cette idée sans la modifier."],
    st_x_title: ["SHOOT SHEET", "FEUILLE DE TOURNAGE"], st_x_hook: ["Hook (first 3 seconds)", "Accroche (3 premières secondes)"], st_x_concept: ["Concept", "Concept"],
    st_x_scenes: ["Scenes", "Scènes"], st_x_visual: ["Visual", "Image"], st_x_voice: ["Voice / text", "Voix / texte"], st_x_script: ["Script", "Script"], st_x_links: ["Links", "Liens"],
    st_x_len: ["Estimated length: about {a} s", "Durée estimée : environ {a} s"], st_x_shots: ["SHOT LIST", "LISTE DE PLANS"],
    st_x_no_shots: ["Add scene visuals first.", "Ajoutez d'abord les images des scènes."], st_log_sent: ["Sent to project as a reel", "Envoyée au projet en reel"],
    st_log_share_on: ["Shown to client", "Montrée au client"], st_log_share_off: ["Hidden from client", "Cachée au client"], st_log_board: ["Whiteboard attached", "Tableau blanc lié"]
  });

  // one stylesheet, tokens only
  if (!document.getElementById("st-css")) {
    var st = document.createElement("style"); st.id = "st-css";
    st.textContent = ".st-scene{display:grid;grid-template-columns:1fr 1fr 84px auto;gap:8px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line)}" +
      ".st-scene:last-of-type{border-bottom:0}.st-scene textarea{min-height:56px}" +
      ".st-sc-n{grid-column:1/-1;display:flex;gap:6px;align-items:center;justify-content:space-between}" +
      ".st-detail{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}" +
      "@media (max-width:640px){.st-scene{grid-template-columns:1fr 84px}.st-scene .st-sc-a{grid-column:1/-1}}";
    document.head.appendChild(st);
  }

  function dis() { return H.can() ? "" : " disabled"; }

  // ---------- reading the form back ----------
  function el(id) { return document.getElementById(id); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  /** Read every field of the open idea and save what changed. Safe to call when the form is not on screen. */
  function collect(id) {
    var i = S.get("ideas", id); if (!i || !H.can() || !el("st-f-title")) return i;
    var ch = {};
    var title = u.val("st-f-title").trim(); ch.title = title || i.title;
    ch.clientId = u.val("st-f-client");
    var pid = u.val("st-f-project"), pr = pid ? m.project(pid) : null;
    ch.projectId = pr && pr.clientId === ch.clientId ? pid : "";
    ch.angle = u.val("st-f-angle").trim();
    ch.objective = u.val("st-f-objective").trim();
    ch.audience = u.val("st-f-audience").trim();
    ch.creativeType = ["offer", "objection", "proof", "brand"].indexOf(u.val("st-f-type")) > -1 ? u.val("st-f-type") : "brand";
    ["offer", "objection", "proof", "cta"].forEach(function (k) {
      var field = el("st-f-" + k); if (field) ch[k] = field.value.trim();
    });
    var proj = ch.projectId ? m.project(ch.projectId) : null;
    var a = proj && (proj.angles || []).find(function (x) { return String(x.name).toLowerCase() === ch.angle.toLowerCase(); });
    ch.angleId = a ? a.id : "";
    ch.mode = u.val("st-f-mode") === "I" ? "I" : "D";
    ch.format = u.val("st-f-format") || "9x16";
    ch.owner = u.val("st-f-owner");
    ch.priority = +u.val("st-f-prio") || 2;
    var tags = []; u.val("st-f-tags").split(",").forEach(function (x) { x = x.trim(); if (x && tags.indexOf(x) < 0) tags.push(x); });
    ch.tags = tags.slice(0, 12);
    ch.hook = u.val("st-f-hook").trim();
    ch.concept = u.val("st-f-concept").trim();
    ch.script = u.val("st-f-script");
    ch.notes = u.val("st-f-notes");
    var scenes = [], n = 0, oldScenes = Array.isArray(i.scenes) ? i.scenes : [];
    while (el("st-sv-" + n)) {
      scenes.push({
        id: oldScenes[n] && oldScenes[n].id || u.uid("sc"),
        v: u.val("st-sv-" + n), x: u.val("st-sx-" + n),
        s: Math.max(0, Math.round(u.numVal("st-ss-" + n))),
        silent: u.checked("st-ssilent-" + n)
      });
      n++;
    }
    ch.scenes = scenes;
    var diff = {}, any = false;
    Object.keys(ch).forEach(function (k) { if (!same(ch[k], i[k] == null ? (k === "tags" || k === "scenes" ? [] : "") : i[k])) { diff[k] = ch[k]; any = true; } });
    if (!any) return i;
    if (ch.clientId !== i.clientId) { /* a new client: the old project no longer applies (handled above) */ }
    return S.patch("ideas", id, diff, { log: "" }) || i;
  }
  SH.collect = collect;

  // ---------- text builders ----------
  function sceneLine(s, n) { return n + ". " + (String(s.v || "").trim() || "—") + (String(s.x || "").trim() ? " — " + String(s.x).trim() : ""); }
  /** The script as one text block: scenes first, then the free text. This is what lands in the reel. */
  function scriptText(i) {
    var out = [];
    (i.scenes || []).forEach(function (s, k) { if (String(s.v || "").trim() || String(s.x || "").trim()) out.push(sceneLine(s, k + 1)); });
    if (String(i.script || "").trim()) out.push(String(i.script).trim());
    return out.join("\n");
  }
  function shootSheet(i) {
    var L = [t("st_x_title") + " · " + String(i.title || "").toUpperCase()];
    L.push([i.clientId ? m.brand(i.clientId) : "", H.angleOf(i), H.modeName(i.mode), i.format || "9x16"].filter(Boolean).join(" · "));
    L.push("");
    if (i.hook) L.push(t("st_x_hook") + ": " + i.hook);
    if (i.concept) L.push(t("st_x_concept") + ": " + i.concept);
    var sc = (i.scenes || []).filter(function (s) { return String(s.v || "").trim() || String(s.x || "").trim(); });
    if (sc.length) {
      L.push(""); L.push(t("st_x_scenes").toUpperCase());
      sc.forEach(function (s, k) {
        L.push((k + 1) + ". " + (s.s ? "[" + s.s + " s] " : "") + t("st_x_visual") + ": " + (String(s.v || "").trim() || "—") + (String(s.x || "").trim() ? " | " + t("st_x_voice") + ": " + String(s.x).trim() : ""));
      });
    }
    if (String(i.script || "").trim()) { L.push(""); L.push(t("st_x_script").toUpperCase()); L.push(String(i.script).trim()); }
    var refs = (i.refs || []).filter(function (r) { return H.isUrl(r.url); });
    if (refs.length) { L.push(""); L.push(t("st_x_links").toUpperCase()); refs.forEach(function (r) { L.push("- " + (r.label ? r.label + ": " : "") + r.url); }); }
    var est = Math.max(H.speakSeconds(i), H.sceneSeconds(i));
    if (est) { L.push(""); L.push(t("st_x_len", { a: est })); }
    return L.join("\n");
  }
  function shotList(i) {
    var sc = (i.scenes || []).filter(function (s) { return String(s.v || "").trim(); });
    if (!sc.length) return "";
    var L = [t("st_x_shots") + " · " + i.title + (i.clientId ? " · " + m.brand(i.clientId) : "")];
    sc.forEach(function (s, k) { L.push((k + 1) + ". " + String(s.v).trim() + (s.s ? " (" + s.s + " s)" : "")); });
    return L.join("\n");
  }

  // ---------- detail view ----------
  function projectsOf(clientId) {
    return S.all("projects").filter(function (p) { return p.clientId === clientId; }).sort(u.by(function (p) { return m.STAGES.indexOf(p.stage); }));
  }
  function sendableProjects(clientId) {
    return projectsOf(clientId).filter(function (p) {
      var k = m.STAGES.indexOf(p.stage);
      return (k >= 0 && k <= m.STAGES.indexOf("editing")) || p.stage === "onboard" || p.stage === "edit";
    });
  }

  function stagePanel(i) {
    var es = H.effStage(i), idx = H.STAGES.indexOf(es), f = m.isFounder();
    var gaps = H.readyGaps(i);
    var h = '<section class="panel"><div class="stepper" aria-label="' + esc(t("st_d_stage")) + '">' + H.STAGES.map(function (s, k) {
      return '<div class="' + (es === "parked" ? "" : k < idx ? "done" : k === idx ? "now" : "") + '">' + esc(H.stName(s)) + "</div>";
    }).join("") + "</div>" +
      '<div class="row">' + (es === "parked" ? ui.pill(H.stName("parked")) : "") + H.prioPill(i) +
      (H.waitingOn(i) ? ui.pill(t("st_review_wait"), "alert") : "") +
      (es === "ready" ? ui.pill(t("st_d_ready_pill"), "wip") : "") + (es === "shot" ? ui.pill(t("st_d_shot_pill"), "done") : "") + "</div>";
    if (H.can()) {
      h += '<div class="row">' + H.stepBtns(i, "") +
        (es !== "parked" ? ui.btn(t("st_park"), "st-park", { cls: "ghost", data: { id: i.id } }) : "") + "</div>";
    } else h += '<p class="small muted" style="margin:0">' + esc(t("st_d_readonly")) + "</p>";
    if (H.waitingOn(i) && f) h += '<p class="note strong" style="margin:0">' + esc(t("st_d_review_by", { who: H.ownerName(i) })) + "</p>";
    if (!f && i.stage === "script" && !i.reviewAsked) h += '<p class="small muted" style="margin:0">' + esc(t("st_d_review_hint")) + "</p>";
    if (gaps.length && H.can()) {
      h += '<div class="stack" style="gap:4px"><span class="lab sm">' + esc(t("st_d_missing")) + "</span>" + gaps.map(function (g) { return '<p class="gate" style="margin:0">' + esc(g) + "</p>"; }).join("") + "</div>";
    }
    if (f) {
      var haveRevisions = H.approvedRevisions(i).length > 0;
      h += '<div class="row">' + ui.btn(t(haveRevisions ? "st_approve_revision" : "st_mark_ready"), "st-reapprove", {
        cls: "ghost", data: { id: i.id }, disabled: !!gaps.length, title: gaps[0] || ""
      }) + "</div>";
    }
    return h + "</section>";
  }

  function basicsPanel(i) {
    var clients = S.all("clients").sort(u.by("brand"));
    var projs = i.clientId ? projectsOf(i.clientId) : [];
    var proj = i.projectId ? m.project(i.projectId) : null;
    var angleNames = {}; (proj ? [proj] : projs).forEach(function (p) { (p.angles || []).forEach(function (a) { angleNames[a.name] = 1; }); });
    var team = S.all("team").sort(u.by("name"));
    var D = dis();
    return '<section class="panel"><h2 class="sec">' + esc(t("st_d_basics")) + "</h2>" +
      '<div class="form">' +
      ui.field({ id: "st-f-title", label: t("st_d_title_f"), value: i.title, span: true, attrs: D }) +
      ui.field({ id: "st-f-client", label: t("st_d_client"), type: "select", value: i.clientId || "", options: [["", "—"]].concat(clients.map(function (c) { return [c.id, c.brand]; })), attrs: ' data-c="st-fchg"' + D }) +
      ui.field({ id: "st-f-project", label: t("st_d_project"), type: "select", value: i.projectId || "", options: [["", "—"]].concat(projs.map(function (p) { return [p.id, p.name]; })), attrs: ' data-c="st-fchg"' + D }) +
      '<div class="field"><label for="st-f-angle">' + esc(t("st_d_angle")) + '</label><input id="st-f-angle" list="st-angles" value="' + esc(i.angle || "") + '" autocomplete="off"' + D + '><datalist id="st-angles">' +
      Object.keys(angleNames).map(function (a) { return '<option value="' + esc(a) + '">'; }).join("") + '</datalist><span class="hint">' + esc(t("st_d_angle_hint")) + "</span></div>" +
      ui.field({ id: "st-f-mode", label: t("st_d_mode"), type: "select", value: i.mode === "I" ? "I" : "D", options: [["D", t("st_d_mode_d")], ["I", t("st_d_mode_i")]], attrs: D }) +
      ui.field({ id: "st-f-format", label: t("st_d_format"), type: "select", value: i.format || "9x16", options: m.FORMATS.map(function (x) { return [x, x]; }), attrs: D }) +
      ui.field({ id: "st-f-objective", label: t("st_objective"), value: i.objective || "", attrs: D }) +
      ui.field({ id: "st-f-audience", label: t("st_audience"), value: i.audience || "", attrs: D }) +
      ui.field({ id: "st-f-type", label: t("st_creative_type"), type: "select", value: H.creativeType(i), options: [
        ["offer", t("st_type_offer")], ["objection", t("st_type_objection")], ["proof", t("st_type_proof")], ["brand", t("st_type_brand")]
      ], attrs: ' data-c="st-fchg"' + D }) +
      ui.field({ id: "st-f-owner", label: t("st_d_owner"), type: "select", value: i.owner || "", options: [["", "—"]].concat(team.map(function (x) { return [x.id, x.name]; })), attrs: D }) +
      ui.field({ id: "st-f-prio", label: t("st_d_prio"), type: "select", value: String(i.priority || 2), options: [["1", t("st_p1")], ["2", t("st_p2")], ["3", t("st_p3")]], attrs: D }) +
      ui.field({ id: "st-f-tags", label: t("st_d_tags"), value: (i.tags || []).join(", "), hint: t("st_d_tags_hint"), attrs: D }) +
      "</div></section>";
  }
  function conditionalBrief(i) {
    var D = dis(), type = H.creativeType(i), fields = "";
    if (type === "offer") fields += ui.field({ id: "st-f-offer", label: t("st_offer"), value: i.offer || "", attrs: D });
    if (type === "objection") fields += ui.field({ id: "st-f-objection", label: t("st_objection"), value: i.objection || "", attrs: D });
    if (type === "proof" || type === "objection") fields += ui.field({ id: "st-f-proof", label: t("st_proof"), type: "textarea", value: i.proof || "", attrs: D });
    if (type !== "brand") fields += ui.field({ id: "st-f-cta", label: t("st_cta"), value: i.cta || "", attrs: D });
    return '<section class="panel"><h2 class="sec">' + esc(t("st_brief")) + "</h2>" +
      (fields ? '<div class="form">' + fields + "</div>" : '<p class="small muted" style="margin:0">' + esc(t("st_type_brand")) + "</p>") + "</section>";
  }

  function hookPanel(i) {
    var D = dis();
    return '<section class="panel"><h2 class="sec">' + esc(t("st_d_hook")) + "</h2>" +
      ui.field({ id: "st-f-hook", label: t("st_d_hook"), value: i.hook || "", attrs: D }) +
      ui.field({ id: "st-f-concept", label: t("st_d_concept"), type: "textarea", rows: 4, value: i.concept || "", placeholder: t("st_d_concept_ph"), attrs: D }) +
      "</section>" + H.winnersPanel(i.clientId || "");
  }

  function scenesHTML(i) {
    var D = dis(), sc = i.scenes || [];
    return sc.map(function (s, k) {
      return '<div class="st-scene"><div class="st-sc-n"><span class="lab sm">' + esc(t("st_d_scene_n", { n: k + 1 })) + "</span>" +
        (H.can() ? '<span class="row" style="gap:4px">' +
          (k > 0 ? ui.btn("↑", "st-scene-up", { cls: "ghost sm", data: { id: i.id, n: k }, title: t("st_d_up") }) : "") +
          (k < sc.length - 1 ? ui.btn("↓", "st-scene-down", { cls: "ghost sm", data: { id: i.id, n: k }, title: t("st_d_down") }) : "") +
          ui.btn(t("st_d_rm"), "st-scene-rm", { cls: "ghost sm", data: { id: i.id, n: k } }) + "</span>" : "") + "</div>" +
        '<textarea class="in" id="st-sv-' + k + '" rows="2" aria-label="' + esc(t("st_d_visual")) + '" placeholder="' + esc(t("st_d_visual")) + '"' + D + ">" + esc(s.v || "") + "</textarea>" +
        '<textarea class="in" id="st-sx-' + k + '" rows="2" aria-label="' + esc(t("st_d_voice")) + '" placeholder="' + esc(t("st_d_voice")) + '"' + D + ">" + esc(s.x || "") + "</textarea>" +
        '<input class="in num" id="st-ss-' + k + '" type="number" min="0" inputmode="numeric" aria-label="' + esc(t("st_d_secs")) + '" value="' + esc(s.s == null ? "" : s.s) + '" placeholder="s"' + D + ">" +
        ui.field({ id: "st-ssilent-" + k, label: t("st_silent"), type: "checkbox", value: s.silent === true, attrs: D }) +
        "</div>";
    }).join("");
  }
  function scriptPanel(i) {
    var D = dis();
    return '<section class="panel"><div class="panel-h"><h2 class="sec" style="margin:0">' + esc(t("st_d_script")) + "</h2>" +
      '<span class="small muted num">' + esc(t("st_d_time", { a: H.speakSeconds(i), b: H.sceneSeconds(i) })) + "</span></div>" +
      '<h3 class="sec">' + esc(t("st_d_scenes")) + "</h3>" + scenesHTML(i) +
      (H.can() ? "<div>" + ui.btn(t("st_d_add_scene"), "st-scene-add", { cls: "ghost sm", data: { id: i.id } }) + "</div>" : "") +
      ui.field({ id: "st-f-script", label: t("st_d_text"), type: "textarea", rows: 6, value: i.script || "", placeholder: t("st_d_text_ph"), attrs: D }) + "</section>";
  }

  function linksPanel(i) {
    var refs = i.refs || [];
    return '<section class="panel"><h2 class="sec">' + esc(t("st_d_links")) + "</h2>" +
      (refs.length ? '<div class="list">' + refs.map(function (r, k) {
        return '<div class="li" style="flex-wrap:wrap"><div class="stack" style="gap:2px;flex:1 1 200px;min-width:0"><span>' + esc(r.label || r.url) + "</span>" +
          (H.isUrl(r.url) ? '<a class="small link" style="word-break:break-all" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer" data-a="st-link">' + esc(r.url) + "</a>" : '<span class="small muted">' + esc(r.url) + "</span>") + "</div>" +
          (H.can() ? ui.btn(t("st_d_rm"), "st-link-rm", { cls: "ghost sm", data: { id: i.id, n: k } }) : "") + "</div>";
      }).join("") + "</div>" : ui.empty(t("st_d_link_none"))) +
      (H.can() ? '<div class="form">' + ui.field({ id: "st-lk-label", label: t("st_d_link_label"), placeholder: t("st_d_link_ph") }) +
        ui.field({ id: "st-lk-url", label: t("st_d_link_url"), type: "url", placeholder: "https://" }) + "</div><div>" + ui.btn(t("st_d_link_add"), "st-link-add", { cls: "ghost sm", data: { id: i.id } }) + "</div>" : "") +
      "</section>";
  }

  function boardPanel(i) {
    var bd = i.boardId ? S.get("boards", i.boardId) : null;
    var can = m.can("boards");
    return '<section class="panel"><h2 class="sec">' + esc(t("st_d_wb")) + '</h2><p class="small muted" style="margin:0">' + esc(bd ? t("st_d_wb_has", { title: bd.title || "—" }) : t("st_d_wb_note")) + "</p><div>" +
      ui.btn(bd ? t("st_d_wb_open") : t("st_d_wb_new"), "st-board", { cls: "ghost", data: { id: i.id }, disabled: !can, title: can ? "" : t("st_no_rights") }) + "</div></section>";
  }

  function sendPanel(i) {
    var lr = H.linkedReel(i), revisions = H.approvedRevisions(i), selected = H.selectedRevision(i), founder = m.isFounder();
    var h = '<section class="panel"><h2 class="sec">' + esc(t("st_d_send")) + "</h2>";
    if (revisions.length) {
      h += ui.field({ id: "st-d-revision", label: t("st_d_rev_send"), type: "select", value: selected && selected.id || "",
        options: revisions.map(function (r, n) { return [r.id, t("st_revision_n", { n: n + 1, d: u.fmtDate(r.approvedOn || r.snapshot.approvedOn) })]; }),
        attrs: ' data-c="st-pick-revision" data-id="' + esc(i.id) + '"' });
      h += '<p class="small muted" style="margin:0">' + esc(t("st_revision_ready")) + "</p>";
    } else {
      h += '<p class="note" style="margin:0">' + esc(t("st_no_revision")) + "</p>";
    }
    if (lr) {
      var hooks = lr.r.hooks || [], ok = hooks.filter(function (x) { return x.status === "approved"; }).length;
      var code = m.hookCode(lr.p, lr.r, 0);
      h += '<p class="small muted" style="margin:0">' + esc(t("st_d_reel_in", { p: m.projectLabel(lr.p) })) + " · " + esc(t("st_d_hooks_ok", { a: ok, n: hooks.length })) + "</p>" +
        '<div class="stack" style="gap:4px"><span class="lab sm">' + esc(t("st_d_file")) + '</span><span class="code">' + esc(code) + "</span></div>" +
        '<div class="row">' + ui.btn(t("st_d_open_prod"), "st-open-prod", { cls: "ghost", data: { p: lr.p.id } }) + ui.btn(t("st_d_copy_code"), "st-copy-text", { cls: "ghost", data: { text: code } }) + "</div>";
    }
    if (i.reelId && !lr) h += '<p class="note" style="margin:0">' + esc(t("st_d_reel_gone")) + "</p>";
    var gaps = H.readyGaps(i), why = !revisions.length ? (gaps[0] || t("st_no_revision")) : !m.can("projects.edit") ? t("st_d_send_need_rights") : "";
    h += '<p class="small muted" style="margin:0">' + esc(t("st_d_send_note")) + "</p><div>" +
      ui.btn(t("st_d_send_btn"), "st-send", { cls: "primary", data: { id: i.id }, disabled: !!why, title: why }) + "</div>";
    return h + "</section>";
  }

  function sharePanel(i) {
    return '<section class="panel"><h2 class="sec">' + esc(t("st_d_share")) + "</h2>" +
      '<label class="check"><input type="checkbox" id="st-f-share" data-c="st-share"' + (i.shareOk ? " checked" : "") + dis() + '><span>' + esc(i.shareOk ? t("st_d_share_on") : t("st_d_share_off")) + "</span></label>" +
      '<p class="note" style="margin:0">' + esc(t("st_d_share_note")) + "</p>" +
      '<h3 class="sec">' + esc(t("st_d_export")) + '</h3><div class="row">' +
      ui.btn(t("st_d_copy_script"), "st-copy-script", { cls: "ghost", data: { id: i.id } }) + ui.btn(t("st_d_copy_shots"), "st-copy-shots", { cls: "ghost", data: { id: i.id } }) + "</div></section>";
  }

  function notesPanel(i) {
    var me = GK.me(), canDel = H.can() && (m.isFounder() || (me && me.id === i.owner));
    var log = (i.log || []).filter(function (l) { return l.text; }).slice(-5).reverse();
    return '<section class="panel">' + ui.field({ id: "st-f-notes", label: t("st_d_notes"), type: "textarea", rows: 3, value: i.notes || "", placeholder: t("st_d_notes_ph"), attrs: dis() }) +
      (log.length ? '<span class="lab sm">' + esc(t("st_d_history")) + '</span><div class="list">' + log.map(function (l) {
        return '<div class="li"><span class="small">' + esc(l.text) + '</span><span class="m">' + esc(u.fmtDate(l.at)) + (l.who ? " · " + esc(m.member(l.who).name) : "") + "</span></div>";
      }).join("") + "</div>" : "") +
      (canDel ? "<div>" + ui.btn(t("st_d_delete"), "st-delete", { cls: "ghost sm", data: { id: i.id } }) + "</div>" : "") + "</section>";
  }

  SH.detail = function (i) {
    var h = ui.head({
      label: t("nav_studio"), title: t("st_d_title"), accent: t("st_d_accent"),
      actions: ui.btn(t("st_d_back"), "st-back", { cls: "ghost" }) + (H.can() ? ui.btn(t("st_save"), "st-save", { cls: "primary", data: { id: i.id } }) : "")
    });
    return h + '<div class="st-detail">' + stagePanel(i) +
      '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));align-items:start"><div class="stack" style="gap:18px">' + basicsPanel(i) + conditionalBrief(i) + hookPanel(i) + "</div>" +
      '<div class="stack" style="gap:18px">' + scriptPanel(i) + linksPanel(i) + "</div></div>" +
      '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));align-items:start">' + boardPanel(i) + sendPanel(i) + sharePanel(i) + notesPanel(i) + "</div></div>";
  };

  // ---------- actions ----------
  function idOf(elm) { return elm.dataset.id; }
  function mutateScenes(id, fn) {
    var i = collect(id); if (!i) return;
    var sc = u.clone(i.scenes || []); fn(sc);
    S.patch("ideas", id, { scenes: sc });
  }
  GK.act("st-back", function () { var p = ui.p("studio"); if (p.id) collect(p.id); ui.go("studio", { id: "" }); });
  GK.act("st-save", function (e) { collect(idOf(e)); ui.toast(t("saved")); });
  GK.act("st-link", function () {});
  // Autosave: any studio field saves when it loses focus, so step buttons and navigation never see stale text.
  document.addEventListener("change", function (ev) {
    var tg = ev.target; if (!tg || !tg.id || tg.id.indexOf("st-") !== 0) return;
    var p = ui.p("studio"); if (ui.state.view === "studio" && p.id) collect(p.id);
  });
  GK.change("st-fchg", function () { var p = ui.p("studio"); if (p.id) collect(p.id); });
  GK.change("st-pick-revision", function (e) {
    var i = S.get("ideas", e.dataset.id);
    if (!i || !H.approvedRevisions(i).some(function (r) { return r.id === e.value; })) return;
    S.patch("ideas", i.id, { selectedRevisionId: e.value });
  });
  GK.act("st-scene-add", function (e) { mutateScenes(idOf(e), function (sc) { sc.push({ v: "", x: "", s: 3 }); }); });
  GK.act("st-scene-rm", function (e) { var n = +e.dataset.n; mutateScenes(idOf(e), function (sc) { sc.splice(n, 1); }); });
  GK.act("st-scene-up", function (e) { var n = +e.dataset.n; mutateScenes(idOf(e), function (sc) { if (n > 0) sc.splice(n - 1, 0, sc.splice(n, 1)[0]); }); });
  GK.act("st-scene-down", function (e) { var n = +e.dataset.n; mutateScenes(idOf(e), function (sc) { if (n < sc.length - 1) sc.splice(n + 1, 0, sc.splice(n, 1)[0]); }); });

  GK.act("st-link-add", function (e) {
    var i = collect(idOf(e)); if (!i) return;
    var url = u.val("st-lk-url").trim(), label = u.val("st-lk-label").trim();
    if (!H.isUrl(url)) { u.focus("st-lk-url"); return ui.toast(t("st_d_link_bad")); }
    el("st-lk-url").value = ""; el("st-lk-label").value = "";
    S.patch("ideas", i.id, { refs: (i.refs || []).concat([{ label: label.slice(0, 80), url: url }]) });
  });
  GK.act("st-link-rm", function (e) {
    var i = collect(idOf(e)); if (!i) return;
    var refs = (i.refs || []).slice(); refs.splice(+e.dataset.n, 1);
    S.patch("ideas", i.id, { refs: refs });
  });

  GK.act("st-board", function (e) {
    var i = collect(idOf(e)); if (!i) return;
    if (!m.can("boards")) return ui.toast(t("st_no_rights"));
    var bd = i.boardId ? S.get("boards", i.boardId) : null;
    if (!bd) bd = S.all("boards").find(function (b) { return b.ideaId === i.id; }) || null;
    if (!bd) {
      bd = S.put("boards", { title: t("st_d_wb_title", { title: i.title }), kind: "storyboard", clientId: i.clientId || "", projectId: i.projectId || "", ideaId: i.id, items: [], view: { x: 0, y: 0, z: 1 }, rev: 1, updated: u.today() }, { log: t("st_log_add") });
    }
    if (bd && i.boardId !== bd.id) S.patch("ideas", i.id, { boardId: bd.id }, { log: t("st_log_board") });
    if (bd) ui.go("boards", { id: bd.id });
  });

  GK.change("st-share", function (e) {
    var p = ui.p("studio"), i = p.id && collect(p.id); if (!i || !H.can()) return;
    S.patch("ideas", i.id, { shareOk: !!e.checked }, { log: e.checked ? t("st_log_share_on") : t("st_log_share_off") });
  });

  GK.act("st-copy-script", function (e) {
    var i = collect(idOf(e)); if (!i) return;
    u.copy(shootSheet(i)).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });
  GK.act("st-copy-shots", function (e) {
    var i = collect(idOf(e)); if (!i) return;
    var txt = shotList(i); if (!txt) return ui.toast(t("st_x_no_shots"));
    u.copy(txt).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });

  GK.act("st-open-prod", function (e) { if (ui.modalOpen()) ui.closeModal(true); ui.go("production", { projectId: e.dataset.p }); });
  GK.act("st-reapprove", function (e) {
    collect(idOf(e));
    if (H.approveCurrent(idOf(e))) ui.toast(t("st_moved", { s: H.stName("ready") }));
  });

  GK.act("st-delete", function (e) {
    var id = idOf(e);
    ui.confirm(t("st_d_delete_q"), t("st_d_delete_b"), function () { S.remove("ideas", id); ui.go("studio", { id: "" }); }, t("del"));
  });

  // ----- send to project -----
  function angleFor(p, i) {
    var name = H.angleOf(i) || t("st_d_angle_default");
    var a = (p.angles || []).find(function (x) { return String(x.name).toLowerCase() === name.toLowerCase(); });
    return { name: name, existing: a || null };
  }
  var sendRevisionId = "";
  function sendBody(i, pid, revisionId) {
    var entry = H.selectedRevision(i, revisionId), revision = entry && entry.snapshot;
    if (!revision) return "";
    var ps = sendableProjects(revision.clientId), p = ps.find(function (x) { return x.id === pid; }) || ps[0];
    if (!p) return '<p class="note">' + esc(t("st_d_send_no_proj")) + "</p>";
    var af = angleFor(p, revision);
    return ui.field({ id: "st-s-rev", label: t("st_d_rev_send"), type: "select", value: entry.id,
      options: H.approvedRevisions(i).map(function (r, n) { return [r.id, t("st_revision_n", { n: n + 1, d: u.fmtDate(r.approvedOn || r.snapshot.approvedOn) })]; }),
      attrs: ' data-c="st-s-rev" data-id="' + esc(i.id) + '"' }) +
      ui.field({ id: "st-s-proj", label: t("st_d_send_pick"), type: "select", value: p.id, options: ps.map(function (x) { return [x.id, x.name + " · " + t("st_" + x.stage)]; }), attrs: ' data-c="st-s-proj" data-id="' + esc(i.id) + '"' }) +
      '<p class="small" style="margin:0">' + esc(t(af.existing ? "st_d_send_angle" : "st_d_send_new_angle", { a: af.name })) + "</p>" +
      '<p class="small muted" style="margin:0">“' + esc(revision.hook) + "” · " + esc(H.modeName(revision.mode)) + " · " + esc(revision.format || "9x16") + "</p>";
  }
  function snapshotScript(revision) {
    var out = [];
    (Array.isArray(revision.scenes) ? revision.scenes : []).forEach(function (s, k) {
      if (!s || typeof s !== "object") return;
      if (String(s.v || "").trim() || String(s.x || "").trim()) out.push(sceneLine(s, k + 1));
    });
    if (String(revision.script || "").trim()) out.push(String(revision.script).trim());
    return out.join("\n");
  }
  function validHandoffProject(revision, p) {
    return !!(revision && p && p.clientId === revision.clientId &&
      sendableProjects(revision.clientId).some(function (x) { return x.id === p.id; }));
  }
  function handoff(i, p, entry) {
    if (!i || !p || !entry || !entry.id || !entry.snapshot || !validHandoffProject(entry.snapshot, p)) return null;
    var revision = entry.snapshot, revId = entry.id;
    var reels = u.clone(Array.isArray(p.reels) ? p.reels : []);
    var historyMatch = reels.find(function (r) {
      return r && r.sourceIdeaId === i.id && Array.isArray(r.creativeHistory) &&
        r.creativeHistory.some(function (x) { return x && x.revisionId === revId; });
    });
    var directMatch = reels.find(function (r) { return r && r.sourceIdeaId === i.id && r.creativeRevisionId === revId; });
    var already = directMatch || historyMatch;
    if (already) {
      var existingEntry = (Array.isArray(i.handoffs) ? i.handoffs : []).find(function (x) {
        return x && x.projectId === p.id && x.revisionId === revId && x.reelId === already.id;
      });
      var patchExisting = {};
      if (!existingEntry) patchExisting.handoffs = (Array.isArray(i.handoffs) ? i.handoffs : []).concat([{ projectId: p.id, reelId: already.id, revisionId: revId }]);
      if (i.projectId !== p.id || i.reelId !== already.id) {
        patchExisting.projectId = p.id;
        patchExisting.reelId = already.id;
      }
      if (Object.keys(patchExisting).length) S.patch("ideas", i.id, patchExisting);
      return { project: p, reel: already, existing: true, hookIndex: 0 };
    }

    var angleName = String(revision.angle || "").trim();
    var angle = (Array.isArray(p.angles) ? p.angles : []).find(function (a) {
      return a && String(a.name || "").toLowerCase() === angleName.toLowerCase();
    });
    var sourceProject = i.projectId && m.project(i.projectId);
    var reel = reels.find(function (r) {
      return r && r.sourceIdeaId === i.id && r.angleId === (angle && angle.id || "");
    });
    if (!reel && sourceProject && sourceProject.id === p.id && i.reelId) {
      var legacyReel = reels.find(function (r) { return r && r.id === i.reelId; }) || null;
      if (legacyReel && !legacyReel.sourceIdeaId) reel = legacyReel;
    }
    if (!angle) {
      angle = { id: u.uid("a"), name: angleName, why: String(revision.concept || "").replace(/\s+/g, " ").slice(0, 140) };
      p = S.patch("projects", p.id, { angles: (Array.isArray(p.angles) ? p.angles : []).concat([angle]) });
      if (!p) return null;
      reels = u.clone(Array.isArray(p.reels) ? p.reels : []);
    }

    var created = !reel;
    if (created) {
      reel = {
        id: u.uid("r"), angleId: angle.id, mode: revision.mode === "I" ? "I" : "D",
        format: revision.format || "9x16", script: snapshotScript(revision),
        scenes: u.clone(Array.isArray(revision.scenes) ? revision.scenes : []), drive: "",
        sourceIdeaId: i.id, creativeRevisionId: revId, creativeSnapshot: u.clone(revision),
        creativeHistory: [], productionScenes: [], hooks: []
      };
      reel.hooks.push({
        id: u.uid("h"), text: String(revision.hook || ""), status: "todo", v: 1, clientOk: false,
        drive: "", note: "", results: {}, sourceIdeaId: i.id, sourceRevisionId: revId
      });
      reel.currentHookId = reel.hooks[0].id;
      reel.productionScenes = reel.scenes.map(function (s) { return { id: s.id, done: false }; });
      reels.push(reel);
    } else {
      var previousRevisionId = reel.creativeRevisionId || "";
      var previousSnapshot = reel.creativeSnapshot && typeof reel.creativeSnapshot === "object" ?
        u.clone(reel.creativeSnapshot) : {
          title: String(i.title || ""), hook: String(((reel.hooks || [])[0] || {}).text || ""),
          script: String(reel.script || ""), scenes: u.clone(Array.isArray(reel.scenes) ? reel.scenes : [])
        };
      var creativeHistory = Array.isArray(reel.creativeHistory) ? u.clone(reel.creativeHistory) : [];
      creativeHistory.push({
        revisionId: previousRevisionId, snapshot: previousSnapshot,
        productionScenes: u.clone(Array.isArray(reel.productionScenes) ? reel.productionScenes : []),
        handedOffAt: u.today(), legacy: !reel.creativeSnapshot
      });
      var oldScenes = Array.isArray(reel.scenes) ? reel.scenes : [];
      var oldChecklist = Array.isArray(reel.productionScenes) ? reel.productionScenes : [];
      var nextScenes = Array.isArray(revision.scenes) ? u.clone(revision.scenes) : [];
      var nextChecklist = nextScenes.map(function (s) {
        var oldScene = oldScenes.find(function (x) { return x && x.id === s.id; });
        var check = oldChecklist.find(function (x) { return x && x.id === s.id; });
        var unchanged = oldScene && oldScene.v === s.v && oldScene.x === s.x && oldScene.s === s.s && oldScene.silent === s.silent;
        return { id: s.id, done: !!(unchanged && check && check.done) };
      });
      var hooks = Array.isArray(reel.hooks) ? u.clone(reel.hooks) : [];
      var currentHook = hooks.find(function (x) { return x && x.id === reel.currentHookId; }) || hooks[0];
      if (!currentHook || String(currentHook.text || "") !== String(revision.hook || "")) {
        currentHook = {
          id: u.uid("h"), text: String(revision.hook || ""), status: "todo", v: 1, clientOk: false,
          drive: "", note: "", results: {}, sourceIdeaId: i.id, sourceRevisionId: revId
        };
        hooks.push(currentHook);
      } else if (!currentHook.sourceIdeaId) {
        currentHook.sourceIdeaId = i.id;
        currentHook.sourceRevisionId = revId;
      }
      Object.assign(reel, {
        sourceIdeaId: i.id, creativeRevisionId: revId, creativeSnapshot: u.clone(revision),
        creativeHistory: creativeHistory, angleId: angle.id,
        mode: revision.mode === "I" ? "I" : "D", format: revision.format || "9x16",
        script: snapshotScript(revision), scenes: nextScenes,
        productionScenes: nextChecklist, hooks: hooks, currentHookId: currentHook.id
      });
    }

    var projectUpdate = S.patch("projects", p.id, { reels: reels }, { log: t("st_log_sent") + " · " + revision.title });
    if (!projectUpdate) return null;
    var board = i.boardId && S.get("boards", i.boardId);
    if (board) {
      var previousProjectId = String(i.projectId || "");
      var boardChanges = {};
      if (!board.projectId || board.projectId === previousProjectId) boardChanges.projectId = p.id;
      if (!board.clientId || board.clientId === revision.clientId) boardChanges.clientId = revision.clientId;
      if (Object.keys(boardChanges).length) S.patch("boards", board.id, boardChanges);
    }
    var handoffs = Array.isArray(i.handoffs) ? i.handoffs.slice() : [];
    handoffs.push({ projectId: p.id, reelId: reel.id, revisionId: revId });
    S.patch("ideas", i.id, {
      projectId: p.id, angleId: angle.id, angle: angle.name, reelId: reel.id,
      handoffs: handoffs
    }, { log: t("st_log_sent") });
    var updatedProject = m.project(p.id) || projectUpdate;
    var updatedReel = (updatedProject.reels || []).find(function (x) { return x.id === reel.id; }) || reel;
    var currentHookIndex = (updatedReel.hooks || []).findIndex(function (x) { return x.id === updatedReel.currentHookId; });
    return { project: updatedProject, reel: updatedReel, existing: false, hookIndex: Math.max(0, currentHookIndex) };
  }
  H.handoff = handoff;
  GK.act("st-send", function (e) {
    var i = collect(idOf(e)); if (!i) return;
    if (!m.can("projects.edit")) return ui.toast(t("st_d_send_need_rights"));
    var revision = H.selectedRevision(i); if (!revision) return ui.toast(t("st_no_revision"));
    var ps = sendableProjects(revision.snapshot.clientId);
    if (!ps.length) return ui.toast(t("st_d_send_no_proj"));
    var pre = ps.find(function (x) { return x.id === i.projectId; }) || ps[0];
    sendRevisionId = revision.id;
    ui.modal({
      title: t("st_d_send"), accent: "", label: m.brand(i.clientId),
      body: '<div id="st-send-body" class="stack">' + sendBody(i, pre.id, sendRevisionId) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("st_d_send_go"), "st-do-send", { cls: "primary", data: { id: i.id } })
    });
  });
  GK.change("st-s-proj", function (e) {
    var i = S.get("ideas", e.dataset.id), box = el("st-send-body"); if (!i || !box) return;
    box.innerHTML = sendBody(i, e.value, sendRevisionId);
  });
  GK.change("st-s-rev", function (e) {
    var i = S.get("ideas", e.dataset.id), box = el("st-send-body"); if (!i || !box) return;
    sendRevisionId = e.value;
    box.innerHTML = sendBody(i, u.val("st-s-proj"), sendRevisionId);
  });
  GK.act("st-do-send", function (e) {
    var i = S.get("ideas", idOf(e)), p = m.project(u.val("st-s-proj"));
    if (!i || !p) return;
    if (!m.can("projects.edit")) return ui.toast(t("st_d_send_need_rights"));
    var entry = H.selectedRevision(i, sendRevisionId), revision = entry && entry.snapshot;
    if (!revision || !validHandoffProject(revision, p)) return;
    var result = H.handoff(i, p, entry);
    if (!result || !result.project || !result.reel) return;
    var np = result.project, reel = result.reel, code = m.hookCode(np, reel, result.hookIndex || 0);
    if (result.existing) {
      ui.closeModal(true);
      ui.toast(t("st_d_existing_send"));
      return;
    }
    ui.modal({
      title: t("st_d_sent_t"), accent: t("st_d_sent_a"), label: m.projectLabel(np),
      body: '<div class="stack" style="gap:4px"><span class="lab sm">' + esc(t("st_d_file")) + '</span><span class="code">' + esc(code) + "</span></div>",
      foot: ui.btn(t("st_d_copy_code"), "st-copy-text", { cls: "ghost", data: { text: code } }) + ui.btn(t("st_d_open_prod"), "st-open-prod", { cls: "primary", data: { p: np.id } })
    });
  });
})(window.GK);
