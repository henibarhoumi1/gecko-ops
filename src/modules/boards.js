/* GECKO Ops · module: boards (whiteboards).
   boards.js       words, shared geometry, templates, styles, list view, board actions
   boards_edit.js  the editor (persistent canvas, tools, history, saving)
   boards_svg.js   GK.boardSVG(board, opts): read-only SVG for client pages, thumbnails, export */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  var B = GK.boards = GK.boards || {};

  GK.i18n.add({
    bd_title: ["Plan the", "Planifiez le"], bd_accent: ["shoot", "tournage"],
    bd_sub: ["Pin the ideas, frames and shot lists for a video or a campaign. Everything saves as you go.", "Posez les idées, les plans et les listes de plans d'une vidéo ou d'une campagne. Tout s'enregistre au fil de l'eau."],
    bd_new: ["New board", "Nouveau tableau"], bd_empty: ["No boards yet. Start from a template.", "Aucun tableau pour l'instant. Partez d'un modèle."],
    bd_no_match: ["No board matches these filters.", "Aucun tableau ne correspond à ces filtres."],
    bd_all_clients: ["All clients", "Tous les clients"], bd_all_kinds: ["All kinds", "Tous les types"], bd_no_client: ["No client", "Aucun client"],
    bd_k_free: ["Free board", "Tableau libre"], bd_k_storyboard: ["Storyboard", "Storyboard"], bd_k_angles: ["Angle map", "Carte d'angles"], bd_k_shotlist: ["Shot list", "Liste de plans"], bd_k_hooks: ["Hooks", "Hooks"],
    bd_a_free: ["board", "tableau"], bd_a_storyboard: ["storyboard", "storyboard"], bd_a_angles: ["angles", "angles"], bd_a_shotlist: ["shots", "plans"], bd_a_hooks: ["hooks", "hooks"],
    bd_k_moodboard: ["Moodboard", "Moodboard"], bd_k_campaign: ["Campaign map", "Carte de campagne"], bd_a_moodboard: ["mood", "ambiance"], bd_a_campaign: ["campaign", "campagne"],
    bd_tpl_blank: ["Blank", "Vierge"], bd_tpl_mood: ["Moodboard", "Moodboard"], bd_tpl_story: ["Storyboard", "Storyboard"], bd_tpl_angles: ["Angle map", "Carte d'angles"], bd_tpl_shots: ["Shot list", "Liste de plans"], bd_tpl_hooks: ["Hook brainstorm", "Brainstorm de hooks"], bd_tpl_plan: ["Weekly plan", "Plan par semaine"], bd_tpl_campaign: ["Campaign map", "Carte de campagne"],
    bd_tpl_blank_h: ["An empty canvas.", "Une toile vide."], bd_tpl_story_h: ["Six 9:16 panels with shot, voice and duration.", "Six cadres 9:16 avec plan, voix et durée."],
    bd_tpl_mood_h: ["Sections for look, motion and type, a palette, room for links and images.", "Des sections pour le style, le mouvement et la typo, une palette, de la place pour liens et images."],
    bd_tpl_campaign_h: ["Angles across, hooks down: one column per angle.", "Les angles en colonnes, les hooks en lignes."],
    bd_tpl_angles_h: ["One product in the middle, four angles around it.", "Un produit au centre, quatre angles autour."], bd_tpl_shots_h: ["Shot, where, gear, time.", "Plan, lieu, matériel, durée."],
    bd_tpl_hooks_h: ["A grid of sticky notes, one per hook.", "Une grille de notes, une par hook."], bd_tpl_plan_h: ["One column per week.", "Une colonne par semaine."],
    bd_template: ["Template", "Modèle"], bd_name: ["Title", "Titre"], bd_client: ["Client", "Client"], bd_create: ["Create board", "Créer le tableau"],
    bd_untitled: ["Untitled board", "Tableau sans titre"], bd_items: ["{n} items", "{n} éléments"], bd_item1: ["1 item", "1 élément"], bd_updated: ["Updated {d}", "Modifié {d}"],
    bd_open: ["Open", "Ouvrir"], bd_dup: ["Duplicate", "Dupliquer"], bd_rename: ["Rename", "Renommer"], bd_delete: ["Delete", "Supprimer"],
    bd_copy_suffix: ["(copy)", "(copie)"], bd_del_q: ["Delete this board?", "Supprimer ce tableau ?"], bd_del_b: ["\"{n}\" and everything on it will be gone.", "« {n} » et tout son contenu seront supprimés."],
    bd_del_no: ["Only the founder or the person who made a board can delete it.", "Seul le fondateur ou la personne qui a créé le tableau peut le supprimer."],
    bd_all_boards: ["All boards", "Tous les tableaux"], bd_back_idea: ["Back to idea", "Retour à l'idée"], bd_to_project: ["Project", "Projet"],
    bd_copy_text: ["Copy as text", "Copier en texte"], bd_save_svg: ["Save as SVG", "Enregistrer en SVG"], bd_rename_t: ["Rename board", "Renommer le tableau"],
    bd_missing: ["This board no longer exists.", "Ce tableau n'existe plus."],
    bd_remote: ["Updated by someone else.", "Modifié par quelqu'un d'autre."], bd_reload: ["Reload", "Recharger"],
    bd_ro: ["View only", "Lecture seule"],
    bd_saved: ["Saved", "Enregistré"], bd_saving: ["Saving", "Enregistrement"], bd_unsaved: ["Unsaved", "Non enregistré"], bd_toobig: ["This board is too big to save. Remove some drawings or items.", "Ce tableau est trop gros pour être enregistré. Retirez des dessins ou des éléments."],
    // tools
    bd_t_select: ["Select and move (V)", "Sélectionner et déplacer (V)"], bd_t_hand: ["Hand: drag the canvas (H)", "Main : déplacer la toile (H)"], bd_t_note: ["Sticky note (N)", "Note (N)"], bd_t_text: ["Text (T)", "Texte (T)"],
    bd_t_frame: ["Frame 9:16 (F)", "Cadre 9:16 (F)"], bd_t_link: ["Link card (K)", "Carte lien (K)"], bd_t_rect: ["Rectangle (R)", "Rectangle (R)"], bd_t_ellipse: ["Ellipse (O)", "Ellipse (O)"],
    bd_t_line: ["Line (L)", "Ligne (L)"], bd_t_arrow: ["Arrow between two items (A)", "Flèche entre deux éléments (A)"], bd_t_pen: ["Pen (P)", "Stylo (P)"], bd_t_eraser: ["Eraser (E)", "Gomme (E)"],
    bd_colour: ["Colour", "Couleur"], bd_c_gel: ["Gel pink", "Rose Gel"], bd_c_chroma: ["Chroma blue", "Bleu Chroma"], bd_c_bounce: ["Bounce white", "Blanc Bounce"], bd_c_slate: ["Slate black", "Noir Slate"],
    bd_undo: ["Undo (Ctrl+Z)", "Annuler (Ctrl+Z)"], bd_redo: ["Redo (Ctrl+Shift+Z)", "Rétablir (Ctrl+Maj+Z)"], bd_duplicate: ["Duplicate (Ctrl+D)", "Dupliquer (Ctrl+D)"], bd_front: ["Bring to front", "Mettre devant"],
    bd_remove: ["Delete selected (Delete)", "Supprimer la sélection (Suppr)"], bd_edit: ["Edit text (Enter)", "Modifier le texte (Entrée)"], bd_smaller: ["Smaller text", "Texte plus petit"], bd_bigger: ["Bigger text", "Texte plus grand"],
    bd_zoom_in: ["Zoom in", "Zoomer"], bd_zoom_out: ["Zoom out", "Dézoomer"], bd_fit: ["Fit everything", "Tout afficher"], bd_snap: ["Snap to grid", "Aimanter à la grille"], bd_renumber: ["Number frames", "Numéroter les cadres"],
    bd_note_ph: ["Double-click to write", "Double-clic pour écrire"], bd_text_ph: ["Text", "Texte"], bd_frame_ph: ["Caption", "Légende"], bd_open_link: ["Open", "Ouvrir"],
    bd_link_t: ["Link card", "Carte lien"], bd_link_title: ["Title", "Titre"], bd_link_url: ["Link (https://…)", "Lien (https://…)"], bd_link_bad: ["Use a link that starts with http:// or https://.", "Utilisez un lien qui commence par http:// ou https://."],
    bd_link_save: ["Save link", "Enregistrer le lien"],
    bd_cap_items: ["This board is full (300 items).", "Ce tableau est plein (300 éléments)."], bd_cap_pen: ["60 drawings is the limit on one board.", "60 dessins est la limite sur un tableau."], bd_cap_size: ["This board is getting too big to save. Erase some drawings.", "Ce tableau devient trop gros pour être enregistré. Effacez des dessins."],
    bd_arrow_pick: ["Now tap the item the arrow points to.", "Touchez maintenant l'élément visé par la flèche."], bd_arrow_none: ["Drag from one item to another.", "Glissez d'un élément à un autre."],
    bd_hint_ro: ["You can look and pan, not edit.", "Vous pouvez regarder et déplacer la vue, pas modifier."],
    bd_out_frames: ["Frames", "Cadres"], bd_out_loose: ["Other notes", "Autres notes"], bd_out_links: ["Links", "Liens"], bd_out_client: ["Client", "Client"], bd_out_frame: ["Frame", "Cadre"],
    bd_svg_empty: ["Empty board", "Tableau vide"],
    // V03 tools and media
    bd_t_section: ["Section with a title (S)", "Section avec un titre (S)"], bd_t_upload: ["Add images from this device (U)", "Ajouter des images de cet appareil (U)"], bd_t_swatch: ["Colour swatch (C)", "Pastille de couleur (C)"],
    bd_t_media: ["Add a link: video, post, pin, image or page (K)", "Ajouter un lien : vidéo, post, épingle, image ou page (K)"],
    bd_forward: ["Bring forward (])", "Avancer (])"], bd_backward: ["Send backward ([)", "Reculer ([)"], bd_toback: ["Send to back", "Mettre derrière"],
    bd_lock: ["Lock or unlock (Ctrl+L)", "Verrouiller ou déverrouiller (Ctrl+L)"], bd_group: ["Group (Ctrl+G)", "Grouper (Ctrl+G)"], bd_ungroup: ["Ungroup (Ctrl+Shift+G)", "Dégrouper (Ctrl+Maj+G)"],
    bd_arrange: ["Arrange: align, distribute, grid", "Organiser : aligner, répartir, grille"], bd_details: ["Details: title, caption, tags (I)", "Détails : titre, légende, tags (I)"],
    bd_like: ["Like", "J'aime"], bd_palette: ["Extract 5 colours from the image", "Extraire 5 couleurs de l'image"], bd_mini: ["Minimap (M)", "Mini-carte (M)"], bd_help: ["Keyboard shortcuts (?)", "Raccourcis clavier (?)"],
    bd_filter: ["Filter by tag", "Filtrer par tag"], bd_all_tags: ["All tags", "Tous les tags"], bd_fit_sel: ["Zoom to selection (Shift+2)", "Zoomer sur la sélection (Maj+2)"],
    bd_al_l: ["Align left", "Aligner à gauche"], bd_al_c: ["Align centres", "Centrer"], bd_al_r: ["Align right", "Aligner à droite"], bd_al_t: ["Align top", "Aligner en haut"], bd_al_m: ["Align middles", "Centrer verticalement"], bd_al_b: ["Align bottom", "Aligner en bas"],
    bd_di_h: ["Distribute across", "Répartir en largeur"], bd_di_v: ["Distribute down", "Répartir en hauteur"], bd_grid: ["Tidy into a grid", "Ranger en grille"], bd_same_w: ["Same width", "Même largeur"],
    bd_ar_align: ["Align", "Aligner"], bd_ar_space: ["Space and layout", "Espacement et grille"], bd_ar_order: ["Order", "Ordre"],
    bd_play: ["Play here", "Lire ici"], bd_stop: ["Close the player", "Fermer le lecteur"], bd_zoom_img: ["View large", "Voir en grand"], bd_open_orig: ["Open the original", "Ouvrir l'original"],
    bd_local: ["Saved on this device only", "Enregistré sur cet appareil seulement"], bd_local_t: ["Images you add are kept on this device only until the team backend is connected.", "Les images ajoutées restent sur cet appareil jusqu'à la connexion du serveur de l'équipe."],
    bd_missing_img: ["Image saved on another device", "Image enregistrée sur un autre appareil"], bd_noplay: ["If it does not play here, open the original.", "Si la lecture ne marche pas ici, ouvrez l'original."],
    bd_det_t: ["Details", "Détails"], bd_det_url: ["Link (https://…)", "Lien (https://…)"], bd_det_title: ["Title", "Titre"], bd_det_cap: ["Caption or note", "Légende ou note"], bd_det_tags: ["Tags, separated by commas", "Tags, séparés par des virgules"],
    bd_det_colour: ["Colour", "Couleur"], bd_det_name: ["Name", "Nom"], bd_add_link: ["Add to the board", "Ajouter au tableau"], bd_add_link_t: ["Add a link", "Ajouter un lien"],
    bd_add_link_h: ["YouTube, Shorts, Vimeo, Instagram posts and reels, TikTok, Pinterest pins, Google Drive files, images, videos or any page. Tip: paste a link straight onto the board with Ctrl+V.", "YouTube, Shorts, Vimeo, posts et reels Instagram, TikTok, épingles Pinterest, fichiers Google Drive, images, vidéos ou n'importe quelle page. Astuce : collez un lien directement sur le tableau avec Ctrl+V."],
    bd_swatch_t: ["Colour swatch", "Pastille de couleur"], bd_section_ph: ["Section title", "Titre de section"], bd_sec_default: ["Section", "Section"],
    bd_up_bad: ["Only images can be added this way.", "Seules les images peuvent être ajoutées ainsi."], bd_up_fail: ["This image could not be read.", "Cette image n'a pas pu être lue."],
    bd_pal_none: ["Select one image first.", "Sélectionnez d'abord une image."], bd_pal_fail: ["This picture cannot be read for colours (the site blocks it). Add the image from your device instead.", "Les couleurs de cette image ne peuvent pas être lues (le site bloque). Ajoutez plutôt l'image depuis votre appareil."],
    bd_locked: ["Locked items stay put. Unlock them first.", "Les éléments verrouillés ne bougent pas. Déverrouillez-les d'abord."], bd_need2: ["Select two items or more.", "Sélectionnez deux éléments ou plus."], bd_need3: ["Select three items or more.", "Sélectionnez trois éléments ou plus."],
    bd_grid_need: ["Select two items or more, or one section.", "Sélectionnez deux éléments ou plus, ou une section."], bd_added: ["{n} added", "{n} ajoutés"], bd_drop: ["Drop to add to the board", "Déposez pour ajouter au tableau"],
    bd_likes: ["{n} likes", "{n} j'aime"], bd_help_t: ["Shortcuts", "Raccourcis"], bd_tags_none: ["No tags yet. Add them in Details (I).", "Pas encore de tags. Ajoutez-les dans Détails (I)."],
    bd_k_paste: ["Paste a link or an image", "Coller un lien ou une image"], bd_k_copy: ["Copy, cut and paste items", "Copier, couper et coller des éléments"], bd_k_pan: ["Hold Space and drag to move around", "Maintenez Espace et glissez pour vous déplacer"],
    bd_k_zoom: ["Zoom in, out, fit everything", "Zoomer, dézoomer, tout afficher"], bd_k_nudge: ["Move the selection (Shift: 10px)", "Déplacer la sélection (Maj : 10px)"], bd_k_alt: ["Hold Alt while dragging to skip snapping", "Maintenez Alt en glissant pour ne pas aimanter"],
    bd_k_all: ["Select everything", "Tout sélectionner"],
    bd_m_title: ["Moodboard", "Moodboard"], bd_m_look: ["Look and feel", "Style et ambiance"], bd_m_motion: ["Motion references", "Références vidéo"], bd_m_palette: ["Palette", "Palette"], bd_m_type: ["Type and words", "Typo et mots"],
    bd_m_hint: ["Paste a YouTube, Instagram, TikTok or Pinterest link here, or drop images from your computer.", "Collez ici un lien YouTube, Instagram, TikTok ou Pinterest, ou déposez des images depuis votre ordinateur."],
    bd_m_words: ["Three words for the feeling", "Trois mots pour l'ambiance"],
    bd_sb_shot: ["Shot", "Plan"], bd_sb_voice: ["Voice", "Voix"], bd_sb_dur: ["Duration", "Durée"],
    bd_cm_title: ["Campaign map: angles x hooks", "Carte de campagne : angles x hooks"], bd_cm_angle: ["Angle {n}", "Angle {n}"], bd_cm_why: ["Who it is for, why it lands", "Pour qui, pourquoi ça marche"], bd_cm_hook: ["Hook {n}: the first 3 seconds", "Hook {n} : les 3 premières secondes"],
    // template text
    bd_s_hook: ["Hook", "Hook"], bd_s_problem: ["Problem", "Problème"], bd_s_product: ["Product", "Produit"], bd_s_proof: ["Proof", "Preuve"], bd_s_result: ["Result", "Résultat"], bd_s_cta: ["Call to action", "Appel à l'action"],
    bd_s_cap: ["What we see. What we say.", "Ce qu'on voit. Ce qu'on dit."],
    bd_a_product: ["Product", "Produit"], bd_a_n: ["Angle {n}", "Angle {n}"], bd_a_why: ["Who is this for? Why does it land?", "Pour qui ? Pourquoi ça marche ?"],
    bd_h_shot: ["Shot", "Plan"], bd_h_where: ["Where", "Lieu"], bd_h_gear: ["Gear", "Matériel"], bd_h_time: ["Time", "Durée"], bd_h_row: ["Shot {n}", "Plan {n}"],
    bd_hk_title: ["Hooks: the first 3 seconds", "Hooks : les 3 premières secondes"], bd_hk_n: ["Hook {n}", "Hook {n}"],
    bd_w_n: ["Week {n}", "Semaine {n}"], bd_w_post: ["Post", "Publication"], bd_w_ad: ["Ad", "Pub"], bd_w_check: ["Check results", "Vérifier les résultats"]
  });

  // ---------- shared geometry ----------
  var COLORS = ["gel", "chroma", "bounce", "slate"];
  var SIZE = { note: [180, 150], text: [260, 40], frame: [180, 320], link: [240, 76], shape: [200, 120], section: [520, 360], swatch: [96, 120], media: [300, 220] };
  var FILL = { gel: "var(--gel)", chroma: "var(--chroma)", bounce: "var(--bounce)", slate: "var(--slate)" };
  var INK = { gel: "var(--slate)", chroma: "var(--bounce)", bounce: "var(--slate)", slate: "var(--bounce)" };
  var STROKE = { gel: "var(--gel)", chroma: "var(--chroma)", bounce: "var(--tx-3)", slate: "var(--tx)" };
  function r1(n) { return Math.round(n * 10) / 10; }
  var G = B.geo = {
    COLORS: COLORS, SIZE: SIZE, FILL: FILL, INK: INK, STROKE: STROKE,
    col: function (c) { return COLORS.indexOf(c) >= 0 ? c : "gel"; },
    isLine: function (it) { return it.t === "shape" && it.shape === "line"; },
    /** items that hold other items (move together with what sits inside) */
    isBox: function (it) { return it && (it.t === "frame" || it.t === "section"); },
    /** label strip above a frame / inside a section header: how far the clickable area reaches above y */
    top: function (it) { return it.t === "frame" ? 28 : 0; },
    /** bounding box {x,y,w,h} of an item; byId needed for arrows */
    bbox: function (it, byId) {
      if (it.t === "pen" && it.pts && it.pts.length) {
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        it.pts.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      if (it.t === "arrow") {
        var g = G.arrow(it, byId); if (!g) return null;
        var xs = [g.p0[0], g.p1[0], g.c0[0], g.c1[0]], ys = [g.p0[1], g.p1[1], g.c0[1], g.c1[1]];
        var ax = Math.min.apply(null, xs), ay = Math.min.apply(null, ys);
        return { x: ax, y: ay, w: Math.max.apply(null, xs) - ax, h: Math.max.apply(null, ys) - ay };
      }
      var x = +it.x || 0, y = +it.y || 0, w = +it.w || 0, h = +it.h || 0;
      return { x: Math.min(x, x + w), y: Math.min(y, y + h), w: Math.abs(w), h: Math.abs(h) };
    },
    /** anchor point and outward normal on one side of a box */
    anchor: function (b, side) {
      if (side === "t") return { p: [b.x + b.w / 2, b.y], n: [0, -1] };
      if (side === "b") return { p: [b.x + b.w / 2, b.y + b.h], n: [0, 1] };
      if (side === "l") return { p: [b.x, b.y + b.h / 2], n: [-1, 0] };
      return { p: [b.x + b.w, b.y + b.h / 2], n: [1, 0] };
    },
    autoSide: function (a, b) {
      var dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
      if (Math.abs(dx) * (a.h + b.h + 1) > Math.abs(dy) * (a.w + b.w + 1)) return dx >= 0 ? "r" : "l";
      return dy >= 0 ? "b" : "t";
    },
    /** geometry of a connector: end points, control points and arrow head, or null when an end is missing */
    arrow: function (it, byId) {
      var a = it.from && byId[it.from.id], b = it.to && byId[it.to.id];
      if (!a || !b || a.t === "arrow" || b.t === "arrow" || a.t === "pen" || b.t === "pen") return null;
      var ba = G.bbox(a, byId), bb = G.bbox(b, byId);
      var sa = it.from.side && it.from.side !== "auto" ? it.from.side : G.autoSide(ba, bb);
      var sb = it.to.side && it.to.side !== "auto" ? it.to.side : G.autoSide(bb, ba);
      var A = G.anchor(ba, sa), Bn = G.anchor(bb, sb);
      var dist = Math.hypot(Bn.p[0] - A.p[0], Bn.p[1] - A.p[1]), k = Math.max(24, Math.min(140, dist * 0.4));
      var c0 = [A.p[0] + A.n[0] * k, A.p[1] + A.n[1] * k], c1 = [Bn.p[0] + Bn.n[0] * k, Bn.p[1] + Bn.n[1] * k];
      var dx = -Bn.n[0], dy = -Bn.n[1], px = -dy, py = dx, tip = Bn.p, base = [tip[0] - dx * 15, tip[1] - dy * 15];
      return {
        p0: A.p, p1: [tip[0] - dx * 8, tip[1] - dy * 8], c0: c0, c1: c1,
        head: [tip, [base[0] + px * 7, base[1] + py * 7], [base[0] - px * 7, base[1] - py * 7]]
      };
    },
    bez: function (g, s) {
      var a = 1 - s, w0 = a * a * a, w1 = 3 * a * a * s, w2 = 3 * a * s * s, w3 = s * s * s;
      return [w0 * g.p0[0] + w1 * g.c0[0] + w2 * g.c1[0] + w3 * g.p1[0], w0 * g.p0[1] + w1 * g.c0[1] + w2 * g.c1[1] + w3 * g.p1[1]];
    },
    arrowD: function (g) { return "M" + r1(g.p0[0]) + " " + r1(g.p0[1]) + "C" + r1(g.c0[0]) + " " + r1(g.c0[1]) + " " + r1(g.c1[0]) + " " + r1(g.c1[1]) + " " + r1(g.p1[0]) + " " + r1(g.p1[1]); },
    headPts: function (g) { return g.head.map(function (p) { return r1(p[0]) + "," + r1(p[1]); }).join(" "); },
    /** smooth path through freehand points (quadratic through midpoints) */
    penD: function (pts) {
      if (!pts || !pts.length) return "";
      if (pts.length === 1) return "M" + pts[0][0] + " " + pts[0][1] + "l.01 0";
      if (pts.length === 2) return "M" + pts[0][0] + " " + pts[0][1] + "L" + pts[1][0] + " " + pts[1][1];
      var d = "M" + pts[0][0] + " " + pts[0][1];
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        d += "Q" + pts[i][0] + " " + pts[i][1] + " " + r1(mx) + " " + r1(my);
      }
      var l = pts[pts.length - 1];
      return d + "L" + l[0] + " " + l[1];
    },
    /** Ramer-Douglas-Peucker, then even sampling down to max points; coordinates rounded to integers */
    simplify: function (pts, eps, max) {
      function dist(p, a, b) {
        var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
        if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]);
        var s = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
        return Math.hypot(p[0] - (a[0] + s * dx), p[1] - (a[1] + s * dy));
      }
      var out = pts;
      if (pts.length > 2) {
        var keep = new Array(pts.length), stack = [[0, pts.length - 1]];
        keep[0] = keep[pts.length - 1] = true;
        while (stack.length) {
          var s = stack.pop(), a = s[0], b = s[1], mx = 0, mi = -1;
          for (var i = a + 1; i < b; i++) { var d = dist(pts[i], pts[a], pts[b]); if (d > mx) { mx = d; mi = i; } }
          if (mx > eps && mi > 0) { keep[mi] = true; stack.push([a, mi], [mi, b]); }
        }
        out = pts.filter(function (p, i) { return keep[i]; });
      }
      if (out.length > max) { var step = (out.length - 1) / (max - 1), o2 = []; for (var j = 0; j < max; j++) o2.push(out[Math.round(j * step)]); out = o2; }
      return out.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; });
    },
    segDist: function (px, py, ax, ay, bx, by) {
      var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
      var s = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
      return Math.hypot(px - (ax + s * dx), py - (ay + s * dy));
    },
    /** a url that is safe to open (http or https only), else "" */
    safeUrl: function (s) { s = String(s || "").trim(); return /^https?:\/\/[^\s<>"']+$/i.test(s) ? s : ""; },
    host: function (s) { try { return new URL(s).hostname.replace(/^www\./, ""); } catch (e) { return ""; } },
    /** wrap text to lines of at most n characters (for SVG) */
    wrap: function (text, n) {
      var out = [];
      String(text || "").split("\n").forEach(function (para) {
        var words = para.split(/\s+/).filter(Boolean), line = "";
        if (!words.length) { out.push(""); return; }
        words.forEach(function (w) {
          while (w.length > n) { if (line) { out.push(line); line = ""; } out.push(w.slice(0, n)); w = w.slice(n); }
          if ((line + " " + w).trim().length > n) { out.push(line); line = w; } else line = (line + " " + w).trim();
        });
        out.push(line);
      });
      return out;
    }
  };

  // ---------- templates ----------
  var KINDS = ["free", "moodboard", "storyboard", "angles", "shotlist", "hooks", "campaign"];
  var TPL = [
    { k: "blank", kind: "free", name: "bd_tpl_blank", hint: "bd_tpl_blank_h" },
    { k: "mood", kind: "moodboard", name: "bd_tpl_mood", hint: "bd_tpl_mood_h" },
    { k: "story", kind: "storyboard", name: "bd_tpl_story", hint: "bd_tpl_story_h" },
    { k: "shots", kind: "shotlist", name: "bd_tpl_shots", hint: "bd_tpl_shots_h" },
    { k: "campaign", kind: "campaign", name: "bd_tpl_campaign", hint: "bd_tpl_campaign_h" },
    { k: "angles", kind: "angles", name: "bd_tpl_angles", hint: "bd_tpl_angles_h" },
    { k: "hooks", kind: "hooks", name: "bd_tpl_hooks", hint: "bd_tpl_hooks_h" },
    { k: "plan", kind: "free", name: "bd_tpl_plan", hint: "bd_tpl_plan_h" }
  ];
  B.templates = TPL;
  /** Item builder with sequential z. Also used by the sample data. */
  B.maker = function () {
    var items = [], z = 1;
    var api = {
      items: items,
      add: function (o) { o.id = u.uid("i"); o.z = z++; items.push(o); return o; },
      note: function (text, x, y, c, w, h) { return api.add({ t: "note", x: x, y: y, w: w || 180, h: h || 150, text: text, c: c || "gel" }); },
      text: function (text, x, y, c, w, fs) { return api.add({ t: "text", x: x, y: y, w: w || 300, h: Math.round((fs || 28) * 1.4), text: text, c: c || "slate", fs: fs || 28 }); },
      frame: function (n, text, x, y) { return api.add({ t: "frame", x: x, y: y, w: 180, h: 320, text: text || "", n: n, c: "slate" }); },
      section: function (title, x, y, w, h, c) { return api.add({ t: "section", x: x, y: y, w: w, h: h, text: title || "", c: c || "chroma" }); },
      swatch: function (hex, name, x, y) { return api.add({ t: "swatch", x: x, y: y, w: 96, h: 120, hex: hex, text: name || "" }); },
      /** a media card from a url (YouTube, Instagram, image...), top-left at x,y; o: {w, text, cap, poster, ratio, tags} */
      media: function (url, x, y, o) {
        o = o || {};
        var it = B.media && B.media.make(url, 0, 0, { text: o.text, cap: o.cap, poster: o.poster });
        if (!it) return null;
        if (o.ratio) it.ratio = o.ratio;
        it.w = o.w || it.w; it.h = B.media.heightFor(it, it.w); it.x = x; it.y = y;
        if (o.tags) it.tags = o.tags;
        if (o.likes) it.likes = o.likes;
        return api.add(it);
      },
      link: function (title, url, x, y, c) { return api.add({ t: "link", x: x, y: y, w: 240, h: 76, text: title, url: url, c: c || "bounce" }); },
      arrow: function (a, b, c, sa, sb) { return api.add({ t: "arrow", from: { id: a.id, side: sa || "auto" }, to: { id: b.id, side: sb || "auto" }, c: c || "slate" }); },
      shape: function (shape, x, y, w, h, c, text) { return api.add({ t: "shape", shape: shape, x: x, y: y, w: w, h: h, c: c || "bounce", text: text || "" }); }
    };
    return api;
  };
  B.templateItems = function (k) {
    var q = B.maker(), i, j;
    if (k === "mood") {
      q.section(t("bd_m_look"), 0, 0, 760, 560, "gel");
      q.section(t("bd_m_motion"), 800, 0, 560, 560, "chroma");
      q.section(t("bd_m_palette"), 0, 600, 760, 200, "bounce");
      q.section(t("bd_m_type"), 800, 600, 560, 200, "slate");
      q.text(t("bd_m_title"), 0, -80, "slate", 600, 36);
      q.note(t("bd_m_hint"), 24, 64, "bounce", 300, 130);
      q.note(t("bd_m_hint"), 824, 64, "bounce", 300, 130);
      [["#F6CBDA", "Gel"], ["#3946EC", "Chroma"], ["#0E0E0E", "Slate"], ["#F7F6F2", "Bounce"]].forEach(function (c, n) { q.swatch(c[0], c[1], 24 + n * 112, 660); });
      q.note(t("bd_m_words"), 824, 660, "gel", 240, 110);
    } else if (k === "story") {
      var names = ["bd_s_hook", "bd_s_problem", "bd_s_product", "bd_s_proof", "bd_s_result", "bd_s_cta"];
      var panel = t("bd_sb_shot") + ": \n" + t("bd_sb_voice") + ": \n" + t("bd_sb_dur") + ": 3 s";
      for (i = 0; i < 6; i++) {
        q.frame(i + 1, t(names[i]), i * 220, 0);
        q.note(panel, i * 220, 340, i % 2 ? "bounce" : "gel", 180, 130);
      }
    } else if (k === "campaign") {
      q.text(t("bd_cm_title"), 0, -80, "slate", 760, 30);
      for (i = 0; i < 3; i++) {
        var sx = i * 340;
        q.section(t("bd_cm_angle", { n: i + 1 }), sx, 0, 320, 700, ["gel", "chroma", "bounce"][i]);
        q.note(t("bd_cm_why"), sx + 20, 56, "slate", 280, 90);
        for (j = 0; j < 3; j++) q.note(t("bd_cm_hook", { n: j + 1 }) + "\n", sx + 20, 166 + j * 176, i === 1 ? "bounce" : "gel", 280, 156);
      }
    } else if (k === "angles") {
      var c = q.note(t("bd_a_product"), 0, 0, "chroma", 220, 130), spots = [[0, -260], [340, 0], [0, 260], [-340, 0]];
      for (i = 0; i < 4; i++) {
        var a = q.note(t("bd_a_n", { n: i + 1 }) + "\n" + t("bd_a_why"), spots[i][0] + 10, spots[i][1], i % 2 ? "bounce" : "gel", 200, 130);
        q.arrow(c, a, "slate");
      }
    } else if (k === "shots") {
      var heads = ["bd_h_shot", "bd_h_where", "bd_h_gear", "bd_h_time"], wd = [260, 200, 200, 120], xs = [0, 270, 480, 690];
      for (i = 0; i < 4; i++) q.note(t(heads[i]), xs[i], 0, "slate", wd[i], 52);
      for (j = 0; j < 6; j++) for (i = 0; i < 4; i++) q.note(i === 0 ? t("bd_h_row", { n: j + 1 }) + ": " : "", xs[i], 62 + j * 62, "bounce", wd[i], 52);
    } else if (k === "hooks") {
      q.text(t("bd_hk_title"), 0, -60, "slate", 600, 30);
      var cs = ["gel", "bounce", "chroma"];
      for (j = 0; j < 3; j++) for (i = 0; i < 4; i++) q.note(t("bd_hk_n", { n: j * 4 + i + 1 }) + "\n", i * 200, j * 170, cs[(i + j) % 3], 180, 150);
    } else if (k === "plan") {
      for (i = 0; i < 4; i++) {
        var x = i * 260;
        q.section(t("bd_w_n", { n: i + 1 }), x, 0, 240, 560, "bounce");
        q.note(t("bd_w_post"), x + 20, 56, "gel", 200, 140);
        q.note(t("bd_w_ad"), x + 20, 216, "chroma", 200, 140);
        q.note(t("bd_w_check"), x + 20, 376, "bounce", 200, 140);
      }
    }
    return q.items;
  };

  // ---------- helpers ----------
  B.canEdit = function () { return m.can("boards") && !S.readOnly; };
  B.kindLabel = function (k) { return t("bd_k_" + (KINDS.indexOf(k) >= 0 ? k : "free")); };
  B.kinds = KINDS;
  B.creator = function (b) { return b.by || (b.log && b.log[0] && b.log[0].who) || ""; };
  B.canDelete = function (b) { var me = GK.me(); return B.canEdit() && (m.isFounder() || (!!me && B.creator(b) === me.id)); };
  /** ids of images kept on this device (GK.blobs) that a board uses */
  B.blobIds = function (b) { return ((b && b.items) || []).filter(function (i) { return i && i.t === "media" && i.blob; }).map(function (i) { return String(i.blob); }); };
  function clientName(id) { var c = id && S.get("clients", id); return c ? c.brand : ""; }
  B.clientName = clientName;

  // ---------- styles: one <style id="gk-boards-css"> for every boards file, DESIGN.md token names only ----------
  // Each token falls back to its V02 name so the page still reads while tokens.css moves to the V03 names.
  var TOK = { "--tx": "--ink", "--tx-2": "--ink-2", "--tx-3": "--ink-3", "--s1": "--surface", "--s2": "--line-2", "--s3": "--line", "--chroma-soft": "--line-2", "--gel-soft": "--line-2", "--gel-deep": "--gel" };
  B.tok = function (css) { return String(css).replace(/var\((--[\w-]+)\)/g, function (all, n) { return TOK[n] ? "var(" + n + ",var(" + TOK[n] + "))" : all; }); };
  B.css = function (css) {
    var el = document.getElementById("gk-boards-css");
    if (!el) { el = document.createElement("style"); el.id = "gk-boards-css"; document.head.appendChild(el); }
    el.textContent += B.tok(css) + "\n";
  };
  B.injectStyle = function (id, css) { B.css(css); };
  B.css("" +
    ".bd-card{cursor:pointer;padding:0;gap:0;overflow:hidden;border-radius:22px}.bd-card:hover{border-color:var(--line-2)}" +
    ".bd-thumb{background:var(--s2);aspect-ratio:16/10;border-bottom:1px solid var(--line);overflow:hidden;position:relative}" +
    ".bd-thumb svg{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".bd-cb{padding:14px 20px 16px;display:flex;flex-direction:column;gap:8px}" +
    ".bd-cb h3{margin:0;font-size:16px;font-weight:600;overflow-wrap:anywhere;color:var(--tx)}" +
    ".bd-meta{color:var(--tx-2);font-size:12px;display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center;font-variant-numeric:tabular-nums}" +
    ".bd-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.bd-filters select{width:auto;min-width:160px;max-width:100%}" +
    ".bd-headwrap .head{padding-bottom:10px}.bd-headwrap .hl{font-size:clamp(24px,3.2vw,30px)}.bd-headwrap .head .t{gap:6px}" +
    ".bd-slot{display:block;min-height:420px}" +
    "@media (max-width:860px){.bd-headwrap .subline{display:none}.bd-headwrap .head{gap:8px}.bd-headwrap .actions{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;max-width:100%}.bd-headwrap .actions .btn{flex:none}}" +
    ".bd-tplgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}" +
    ".bd-tpl{all:unset;box-sizing:border-box;cursor:pointer;border:1px solid var(--line-2);background:var(--s2);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;min-height:72px;transition:border-color 140ms ease-out,background 140ms ease-out}" +
    ".bd-tpl strong{font-size:13px;font-weight:600;color:var(--tx)}.bd-tpl span{font-size:12px;color:var(--tx-2);line-height:1.35}.bd-tpl:hover{border-color:var(--tx-3)}" +
    ".bd-tpl[aria-pressed=true]{background:var(--chroma-soft);border-color:var(--chroma)}" +
    ".bd-tpl:focus-visible{outline:2px solid var(--chroma);outline-offset:2px}");

  // ---------- list view ----------
  var F = { client: "", kind: "" };
  var newTpl = "blank";

  function fmtUpdated(b) { return t("bd_updated", { d: u.fmtDate((b.updated || "").slice(0, 10)) }); }
  function countLabel(b) { var n = (b.items || []).filter(function (i) { return i.t !== "arrow"; }).length; return n === 1 ? t("bd_item1") : t("bd_items", { n: n }); }

  function listHTML() {
    var all = S.all("boards").sort(u.by("updated", "desc"));
    var clients = {};
    all.forEach(function (b) { if (b.clientId && clientName(b.clientId)) clients[b.clientId] = clientName(b.clientId); });
    var rows = all.filter(function (b) { return (!F.client || b.clientId === F.client) && (!F.kind || b.kind === F.kind); });
    var can = B.canEdit();
    var h = '<div class="bd-headwrap">' + ui.head({ label: t("nav_boards"), title: t("bd_title"), accent: t("bd_accent"), sub: esc(t("bd_sub")), actions: can ? ui.btn(t("bd_new"), "bd-new", { cls: "primary" }) : "" }) + "</div>";
    h += '<div class="bd-filters">' +
      '<select data-c="bd-fclient" aria-label="' + esc(t("bd_client")) + '"><option value="">' + esc(t("bd_all_clients")) + "</option>" +
      Object.keys(clients).sort(function (a, b) { return clients[a] < clients[b] ? -1 : 1; }).map(function (id) { return '<option value="' + esc(id) + '"' + (F.client === id ? " selected" : "") + ">" + esc(clients[id]) + "</option>"; }).join("") + "</select>" +
      '<select data-c="bd-fkind" aria-label="' + esc(t("bd_all_kinds")) + '"><option value="">' + esc(t("bd_all_kinds")) + "</option>" +
      KINDS.map(function (k) { return '<option value="' + k + '"' + (F.kind === k ? " selected" : "") + ">" + esc(t("bd_k_" + k)) + "</option>"; }).join("") + "</select></div>";
    if (!rows.length) return h + ui.empty(all.length ? t("bd_no_match") : t("bd_empty"));
    h += '<div class="grid3">' + rows.map(function (b) {
      var svg = GK.boardSVG ? GK.boardSVG(b, { width: 360, light: true, posters: false, local: true }) : "";
      var idea = b.ideaId && S.get("ideas", b.ideaId), proj = b.projectId && S.get("projects", b.projectId);
      var ctx = [clientName(b.clientId), idea ? idea.title : "", proj ? m.projectLabel(proj) : ""].filter(Boolean);
      return '<article class="panel bd-card" tabindex="0" data-a="bd-open" data-id="' + esc(b.id) + '">' +
        '<div class="bd-thumb" aria-hidden="true">' + svg + "</div>" +
        '<div class="bd-cb"><h3>' + esc(b.title || t("bd_untitled")) + "</h3>" +
        '<div class="bd-meta">' + ui.pill(B.kindLabel(b.kind)) + "<span>" + esc(countLabel(b)) + "</span><span>" + esc(fmtUpdated(b)) + "</span></div>" +
        (ctx.length ? '<div class="bd-meta"><span>' + esc(ctx.join(" · ")) + "</span></div>" : "") +
        (can ? '<div class="row">' + ui.btn(t("bd_dup"), "bd-dup", { cls: "ghost sm", data: { id: b.id } }) + ui.btn(t("bd_rename"), "bd-rename", { cls: "ghost sm", data: { id: b.id } }) +
          ui.btn(t("bd_delete"), "bd-del", { cls: "ghost sm", data: { id: b.id }, disabled: !B.canDelete(b), title: !B.canDelete(b) ? t("bd_del_no") : "" }) + "</div>" : "") +
        "</div></article>";
    }).join("") + "</div>";
    return h;
  }

  function clientOptions() { return [["", t("bd_no_client")]].concat(S.all("clients").sort(u.by("brand")).map(function (c) { return [c.id, c.brand]; })); }

  /** Create a board record from a template key. o: {tpl, title, clientId, projectId, ideaId, kind}. Returns the stored board. */
  B.create = function (o) {
    var tpl = TPL.filter(function (x) { return x.k === o.tpl; })[0] || TPL[0];
    return S.put("boards", {
      id: u.uid("b"), title: o.title || t("bd_untitled"), kind: o.kind || tpl.kind, clientId: o.clientId || "", projectId: o.projectId || "", ideaId: o.ideaId || "",
      items: B.templateItems(tpl.k), view: { x: 0, y: 0, z: 0 }, rev: 1, updated: u.nowStamp(), by: (GK.me() || {}).id || ""
    }, { log: "created" });
  };

  GK.change("bd-fclient", function (el) { F.client = el.value; ui.render(true); });
  GK.change("bd-fkind", function (el) { F.kind = el.value; ui.render(true); });
  GK.act("bd-open", function (el) { ui.go("boards", { id: el.dataset.id }); });
  GK.act("bd-new", function () {
    ui.modal({
      title: t("bd_new"), wide: true,
      body: '<div class="field"><label>' + esc(t("bd_template")) + '</label><div class="bd-tplgrid" id="bd-tplgrid">' +
        TPL.map(function (x) { return '<button type="button" class="bd-tpl" data-a="bd-tpl" data-k="' + x.k + '" aria-pressed="' + (x.k === newTpl) + '"><strong>' + esc(t(x.name)) + "</strong><span>" + esc(t(x.hint)) + "</span></button>"; }).join("") + "</div></div>" +
        '<div class="form">' + ui.field({ id: "bd-n-title", label: t("bd_name"), value: "" }) + ui.field({ id: "bd-n-client", label: t("bd_client"), type: "select", value: F.client || "", options: clientOptions() }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("bd_create"), "bd-create", { cls: "primary" })
    });
  });
  GK.act("bd-tpl", function (el) {
    newTpl = el.dataset.k;
    document.querySelectorAll("#bd-tplgrid .bd-tpl").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === newTpl)); });
  });
  GK.act("bd-create", function () {
    var tpl = TPL.filter(function (x) { return x.k === newTpl; })[0] || TPL[0];
    var title = u.val("bd-n-title").trim() || t(tpl.name), client = u.val("bd-n-client");
    ui.closeModal(true);
    var b = B.create({ tpl: tpl.k, title: title, clientId: client });
    if (b) ui.go("boards", { id: b.id });
  });
  GK.act("bd-dup", function (el) {
    var b = S.get("boards", el.dataset.id); if (!b) return;
    var c = u.clone(b); c.id = u.uid("b"); c.title = (b.title || t("bd_untitled")) + " " + t("bd_copy_suffix"); c.rev = 1; c.updated = u.nowStamp(); c.by = (GK.me() || {}).id || ""; c.log = [];
    S.put("boards", c, { log: "duplicated" }); ui.toast(t("saved"));
  });
  GK.act("bd-rename", function (el) {
    var b = S.get("boards", el.dataset.id); if (!b) return;
    ui.modal({
      title: t("bd_rename_t"),
      body: '<div class="form">' + ui.field({ id: "bd-r-title", label: t("bd_name"), value: b.title }) + ui.field({ id: "bd-r-client", label: t("bd_client"), type: "select", value: b.clientId || "", options: clientOptions() }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "bd-rename-save", { cls: "primary", data: { id: b.id } })
    });
  });
  GK.act("bd-rename-save", function (el) {
    var title = u.val("bd-r-title").trim(); if (!title) { u.focus("bd-r-title"); return ui.toast(t("required")); }
    var id = el.dataset.id, client = u.val("bd-r-client");
    if (B.flush) B.flush();
    ui.closeModal(true);
    S.patch("boards", id, { title: title, clientId: client, updated: u.nowStamp() });
    ui.render(true);
  });
  GK.act("bd-del", function (el) {
    var b = S.get("boards", el.dataset.id); if (!b) return;
    if (!B.canDelete(b)) return ui.toast(t("bd_del_no"));
    ui.confirm(t("bd_del_q"), t("bd_del_b", { n: b.title }), function () {
      if (B.drop) B.drop(b.id);
      var mine = B.blobIds(b), others = {};
      S.all("boards").forEach(function (o) { if (o.id !== b.id) B.blobIds(o).forEach(function (id) { others[id] = 1; }); });
      S.remove("boards", b.id);
      if (GK.blobs) mine.forEach(function (id) { if (!others[id]) GK.blobs.del(id); });
      if (ui.p("boards").id === b.id) ui.p("boards").id = "";
      ui.render(true);
    }, t("bd_delete"));
  });

  var warmed = {};
  function warmThumbs() {
    if (!GK.blobs) return;
    var need = [];
    S.all("boards").forEach(function (b) { B.blobIds(b).forEach(function (id) { if (!warmed[id] && !GK.blobs.cachedUrl(id)) { warmed[id] = 1; need.push(id); } }); });
    if (!need.length) return;
    Promise.all(need.map(function (id) { return GK.blobs.url(id); })).then(function (r) { if (r.some(Boolean) && ui.state.view === "boards" && !ui.p("boards").id) ui.render(true); });
  }

  GK.view("boards", {
    render: function () {
      var p = ui.p("boards");
      if (p.id && S.get("boards", p.id) && B.editorHTML) return B.editorHTML(p.id);
      if (p.id) p.id = "";
      return listHTML();
    },
    count: function () { return S.all("boards").length || ""; },
    after: function (main) {
      var p = ui.p("boards");
      if (p.id && S.get("boards", p.id) && B.editorAfter) B.editorAfter(main, p.id);
      else {
        if (B.flush) B.flush();
        warmThumbs();
      }
    }
  });
})(window.GK);
