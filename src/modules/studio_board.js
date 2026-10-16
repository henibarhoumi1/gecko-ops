/* GECKO Ops · module: studio_board. Storyboard and shot list for one script.
   Each scene of the script is a frame: a sketch or reference picture, what we see, what is said, and its shots.
   Stored on the idea's scenes: img (small JPEG data URL), shots [{ id, type, roll: "A" | "B", loc, props, note, done }].
   The shoot day page reads the same shots to build the day's shot list. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc, SH = GK.studio;
  var TYPES = ["wide", "medium", "close", "detail", "pov", "overhead", "screen"];

  GK.i18n.add({
    sb_title: ["Storyboard and shots", "Storyboard et plans"],
    sb_sub: ["One frame per scene. Add a sketch or a reference picture, then the shots you need for it. The shoot day turns these into the day's shot list.", "Une image par scène. Ajoutez un croquis ou une référence, puis les plans nécessaires. Le jour du tournage en fait la liste des plans."],
    sb_none: ["Add scenes to the script first. Each scene becomes a frame here.", "Ajoutez d'abord des scènes au script. Chaque scène devient une image ici."],
    sb_frame: ["Frame {n}", "Image {n}"], sb_add_img: ["Add picture", "Ajouter une image"], sb_change_img: ["Change", "Changer"], sb_rm_img: ["Remove picture", "Retirer l'image"],
    sb_add_shot: ["Add shot", "Ajouter un plan"], sb_rm_shot: ["Remove", "Retirer"],
    sb_type: ["Shot", "Plan"], sb_roll: ["Roll", "Type"], sb_loc: ["Location", "Lieu"], sb_props: ["Props", "Accessoires"], sb_note: ["Note", "Note"],
    sb_a: ["A-roll (talking)", "A-roll (parlé)"], sb_b: ["B-roll (cutaway)", "B-roll (illustration)"],
    sb_t_wide: ["Wide", "Plan large"], sb_t_medium: ["Medium", "Plan moyen"], sb_t_close: ["Close-up", "Gros plan"], sb_t_detail: ["Detail / product", "Détail / produit"],
    sb_t_pov: ["Point of view", "Point de vue"], sb_t_overhead: ["Top down", "Plongée"], sb_t_screen: ["Screen recording", "Capture d'écran"],
    sb_says: ["Says", "Dit"], sb_silent: ["No dialogue", "Sans dialogue"], sb_img_big: ["That picture couldn't be read. Try a JPG or PNG.", "Image illisible. Essayez un JPG ou PNG."],
    sb_shots_n: ["{n} shots", "{n} plans"]
  });

  function can() { return SH.h && SH.h.can ? SH.h.can() : m.can("ideas"); }
  function typeName(k) { return t("sb_t_" + k); }

  SH.boardPanel = function (i) {
    var sc = i.scenes || [], ok = can(), D = ok ? "" : " disabled";
    var h = '<section class="panel sb-panel"><div class="panel-h"><h2 class="sec" style="margin:0">' + esc(t("sb_title")) + "</h2>" +
      '<span class="small muted">' + esc(t("sb_shots_n", { n: u.sum(sc, function (s) { return (s.shots || []).length; }) })) + "</span></div>" +
      '<p class="small muted" style="margin:0">' + esc(t("sb_sub")) + "</p>";
    if (!sc.length) return h + ui.empty(t("sb_none")) + "</section>";
    h += '<div class="sb-grid">' + sc.map(function (s, k) {
      var shots = s.shots || [];
      return '<article class="sb-frame"><div class="sb-left">' +
        '<div class="sb-img">' + (s.img ? '<img src="' + esc(s.img) + '" alt="' + esc(t("sb_frame", { n: k + 1 })) + '">' : '<span class="small muted">' + esc(t("sb_frame", { n: k + 1 })) + "</span>") + "</div>" +
        (ok ? '<div class="row sb-img-actions"><label class="btn ghost sm">' + esc(s.img ? t("sb_change_img") : t("sb_add_img")) +
          '<input type="file" accept="image/*" hidden data-c="sb-img" data-id="' + esc(i.id) + '" data-k="' + k + '"></label>' +
          (s.img ? ui.btn(t("sb_rm_img"), "sb-img-rm", { cls: "ghost sm", data: { id: i.id, k: k } }) : "") + "</div>" : "") +
        '</div><div class="sb-right"><p class="sb-v"><b>' + esc(k + 1) + ".</b> " + esc(s.v || "—") + "</p>" +
        '<p class="small ' + (s.silent || !s.x ? "muted" : "") + '" style="margin:0">' + esc(s.silent || !s.x ? t("sb_silent") : t("sb_says") + ": " + s.x) + "</p>" +
        '<div class="sb-shots">' + shots.map(function (x, j) {
          var dd = ' data-id="' + esc(i.id) + '" data-k="' + k + '" data-j="' + j + '"' + D;
          return '<div class="sb-shot">' +
            '<select class="in" aria-label="' + esc(t("sb_type")) + '" data-c="sb-f" data-f="type"' + dd + ">" + TYPES.map(function (tp) { return '<option value="' + tp + '"' + (x.type === tp ? " selected" : "") + ">" + esc(typeName(tp)) + "</option>"; }).join("") + "</select>" +
            '<select class="in" aria-label="' + esc(t("sb_roll")) + '" data-c="sb-f" data-f="roll"' + dd + '><option value="A"' + (x.roll !== "B" ? " selected" : "") + ">" + esc(t("sb_a")) + '</option><option value="B"' + (x.roll === "B" ? " selected" : "") + ">" + esc(t("sb_b")) + "</option></select>" +
            '<input class="in" placeholder="' + esc(t("sb_loc")) + '" aria-label="' + esc(t("sb_loc")) + '" value="' + esc(x.loc || "") + '" data-c="sb-f" data-f="loc"' + dd + ">" +
            '<input class="in" placeholder="' + esc(t("sb_props")) + '" aria-label="' + esc(t("sb_props")) + '" value="' + esc(x.props || "") + '" data-c="sb-f" data-f="props"' + dd + ">" +
            '<input class="in sb-note" placeholder="' + esc(t("sb_note")) + '" aria-label="' + esc(t("sb_note")) + '" value="' + esc(x.note || "") + '" data-c="sb-f" data-f="note"' + dd + ">" +
            (ok ? ui.btn(t("sb_rm_shot"), "sb-shot-rm", { cls: "ghost sm", data: { id: i.id, k: k, j: j } }) : "") + "</div>";
        }).join("") + "</div>" +
        (ok ? '<div>' + ui.btn(t("sb_add_shot"), "sb-shot-add", { cls: "ghost sm", icon: "plus", data: { id: i.id, k: k } }) + "</div>" : "") +
        "</div></article>";
    }).join("") + "</div></section>";
    return h;
  };

  // ---------- edits: save the open form first so nothing typed is lost, then change the one scene ----------
  function editScene(id, k, fn, rerender) {
    var i = SH.collect && ui.p("studio").id === id ? SH.collect(id) : S.get("ideas", id);
    if (!i || !can()) return;
    var sc = u.clone(i.scenes || []); if (!sc[k]) return;
    fn(sc[k]);
    S.patch("ideas", id, { scenes: sc }, { log: "" });
    if (rerender !== false) ui.render(true);
  }
  GK.act("sb-shot-add", function (el) {
    editScene(el.dataset.id, +el.dataset.k, function (s) {
      var last = (s.shots || [])[(s.shots || []).length - 1];
      s.shots = (s.shots || []).concat([{ id: u.uid("sh"), type: last ? last.type : "medium", roll: s.silent || !s.x ? "B" : "A", loc: last ? last.loc : "", props: "", note: "", done: false }]);
    });
  });
  GK.act("sb-shot-rm", function (el) { editScene(el.dataset.id, +el.dataset.k, function (s) { s.shots = (s.shots || []).filter(function (x, j) { return j !== +el.dataset.j; }); }); });
  GK.change("sb-f", function (el) {
    editScene(el.dataset.id, +el.dataset.k, function (s) { var x = (s.shots || [])[+el.dataset.j]; if (x) x[el.dataset.f] = el.value; }, false);
  });
  GK.act("sb-img-rm", function (el) { editScene(el.dataset.id, +el.dataset.k, function (s) { delete s.img; }); });
  /** Shrink a picture to 640px on its long side, JPEG, so frames stay small in the team data. */
  function shrink(file) {
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onerror = no;
      r.onload = function () {
        var img = new Image();
        img.onerror = no;
        img.onload = function () {
          var k = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement("canvas");
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL("image/jpeg", 0.72));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  GK.change("sb-img", function (el) {
    var f = el.files && el.files[0]; if (!f) return;
    var id = el.dataset.id, k = +el.dataset.k;
    shrink(f).then(function (data) { editScene(id, k, function (s) { s.img = data; }); }, function () { ui.toast(t("sb_img_big")); });
  });

  /** Every shot of a list of scripts, flattened, for the shoot day. */
  SH.shotsOf = function (ideas) {
    var out = [];
    ideas.forEach(function (i) {
      (i.scenes || []).forEach(function (s, k) {
        (s.shots || []).forEach(function (x, j) { out.push({ idea: i, scene: s, k: k, j: j, shot: x }); });
      });
    });
    return out;
  };
  SH.shotTypeName = typeName;

  var css = document.createElement("style"); css.id = "gk-studio-board-css";
  css.textContent = ".sb-panel{display:flex;flex-direction:column;gap:var(--sp-3)}" +
    ".sb-grid{display:flex;flex-direction:column;gap:var(--sp-4)}" +
    ".sb-frame{display:grid;grid-template-columns:96px minmax(0,1fr);gap:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--line)}" +
    ".sb-left,.sb-right{display:flex;flex-direction:column;gap:var(--sp-2);min-width:0}.sb-img-actions{flex-direction:column;align-items:stretch;gap:4px}.sb-img-actions .btn{justify-content:center;padding-inline:6px}" +
    ".sb-img{aspect-ratio:9/16;width:96px;max-width:100%;border:1px solid var(--line);border-radius:var(--r-md);background:var(--s2);display:grid;place-items:center;overflow:hidden}" +
    ".sb-img img{width:100%;height:100%;object-fit:cover}" +
    ".sb-v{margin:0}.sb-shots{display:flex;flex-direction:column;gap:var(--sp-2)}" +
    ".sb-shot{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:var(--sp-2);border:1px solid var(--line);border-radius:var(--r-md)}" +
    ".sb-shot .in{min-width:0;height:34px;font-size:13px}.sb-shot .sb-note{grid-column:1/-1}.sb-shot .btn{grid-column:1/-1;justify-self:start}";
  document.head.appendChild(css);
})(window.GK);
