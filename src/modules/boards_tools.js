/* GECKO Ops · boards: arrange tools for the editor (B.tools).
   Align, distribute, tidy into a grid, same width, order (front, forward, backward, back), lock, group and ungroup,
   palette from an image. Every action is one undo step (B.ed.commit). */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui;
  var B = GK.boards, G = B.geo;
  var X = function () { return B.ed; };
  var Tl = B.tools = {};

  /** selected items that can move (no arrows, nothing locked); toast when locked ones were left out */
  function movable() {
    var ed = X(), sel = ed.selItems(), out = sel.filter(function (i) { return i.t !== "arrow" && !i.lock; });
    if (out.length < sel.filter(function (i) { return i.t !== "arrow"; }).length) ui.toast(t("bd_locked"));
    return out;
  }
  function moveTo(it, x, y) { var b = X().bboxOf(it); X().shift(it, Math.round(x - b.x), Math.round(y - b.y)); }
  /** move an item and, when it is a frame or section, what sits inside it */
  function moveWith(it, dx, dy) {
    dx = Math.round(dx); dy = Math.round(dy); if (!dx && !dy) return;
    var inner = G.isBox(it) ? X().contents(it) : [];
    X().shift(it, dx, dy); inner.forEach(function (i) { X().shift(i, dx, dy); });
  }
  function done() { var ed = X(); ed.sync(false); ed.paintArrows(); ed.drawSel(); ed.commit(); }

  Tl.align = function (k) {
    var list = movable(); if (list.length < 2) return ui.toast(t("bd_need2"));
    var bb = X().unionBox(list);
    list.forEach(function (it) {
      var b = X().bboxOf(it), dx = 0, dy = 0;
      if (k === "al-l") dx = bb.x - b.x; else if (k === "al-r") dx = bb.x + bb.w - (b.x + b.w); else if (k === "al-c") dx = bb.x + bb.w / 2 - (b.x + b.w / 2);
      else if (k === "al-t") dy = bb.y - b.y; else if (k === "al-b") dy = bb.y + bb.h - (b.y + b.h); else if (k === "al-m") dy = bb.y + bb.h / 2 - (b.y + b.h / 2);
      moveWith(it, dx, dy);
    });
    done();
  };
  Tl.distribute = function (axis) {
    var list = movable(); if (list.length < 3) return ui.toast(t("bd_need3"));
    var h = axis === "di-h", bx = function (it) { return X().bboxOf(it); };
    list.sort(function (a, b) { return h ? bx(a).x - bx(b).x : bx(a).y - bx(b).y; });
    var first = bx(list[0]), last = bx(list[list.length - 1]);
    var span = h ? last.x + last.w - first.x : last.y + last.h - first.y;
    var sizes = list.reduce(function (s, it) { var b = bx(it); return s + (h ? b.w : b.h); }, 0);
    var gap = (span - sizes) / (list.length - 1), pos = h ? first.x : first.y;
    list.forEach(function (it) {
      var b = bx(it);
      if (h) moveWith(it, pos - b.x, 0); else moveWith(it, 0, pos - b.y);
      pos += (h ? b.w : b.h) + gap;
    });
    done();
  };
  /** width change that keeps media pictures true (height follows) and scales notes and swatches */
  function setWidth(it, w) {
    if (it.t === "media") { it.w = w; it.h = B.media.heightFor(it, w); }
    else if (it.t === "text") it.w = w;
    else if (it.t === "pen" || G.isLine(it) || G.isBox(it)) return;
    else { var k = w / (it.w || w); it.w = w; it.h = Math.max(30, Math.round(it.h * k)); }
  }
  Tl.sameWidth = function () {
    var list = movable().filter(function (i) { return !G.isBox(i) && i.t !== "pen" && !G.isLine(i); }); if (list.length < 2) return ui.toast(t("bd_need2"));
    var ws = list.map(function (i) { return i.w; }).sort(function (a, b) { return a - b; }), w = ws[Math.floor(ws.length / 2)];
    list.forEach(function (i) { setWidth(i, w); });
    done();
  };
  /** Masonry grid: same column width, pictures keep their shape, shortest column first. One section selected: tidy what is inside it and fit the section around. */
  Tl.grid = function () {
    var ed = X(), sel = ed.selItems(), sec = sel.length === 1 && G.isBox(sel[0]) ? sel[0] : null, list;
    if (sec) list = ed.contents(sec).filter(function (i) { return !G.isBox(i) && i.t !== "pen" && !G.isLine(i) && i.t !== "arrow"; });
    else list = movable().filter(function (i) { return !G.isBox(i) && i.t !== "pen" && !G.isLine(i); });
    if (list.length < 2) return ui.toast(t("bd_grid_need"));
    var gap = 16, bb = ed.unionBox(list);
    list.sort(function (a, b) { return Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x; });
    var ws = list.map(function (i) { return i.w; }).sort(function (a, b) { return a - b; });
    var colW = Math.max(140, Math.min(420, ws[Math.floor(ws.length / 2)]));
    var x0, y0, cols;
    if (sec) {
      x0 = sec.x + 20; y0 = sec.y + (sec.t === "section" ? ed.SEC_H + 16 : 20);
      cols = Math.max(1, Math.floor((sec.w - 40 + gap) / (colW + gap)));
      if (cols > list.length) cols = list.length;
    } else { x0 = bb.x; y0 = bb.y; cols = Math.max(1, Math.min(6, Math.round(Math.sqrt(list.length * 1.3)))); }
    var hs = []; for (var c = 0; c < cols; c++) hs.push(0);
    list.forEach(function (it) {
      setWidth(it, colW);
      var ci = 0; for (var j = 1; j < cols; j++) if (hs[j] < hs[ci] - 1) ci = j;
      moveTo(it, x0 + ci * (colW + gap), y0 + hs[ci]);
      var b = ed.bboxOf(it); hs[ci] += b.h + gap;
    });
    if (sec) {
      var needW = cols * (colW + gap) - gap + 40, needH = Math.max.apply(null, hs) - gap + (y0 - sec.y) + 20;
      sec.w = Math.max(sec.t === "frame" ? sec.w : needW, needW); sec.h = Math.max(sec.h, needH);
      if (sec.t === "frame") sec.h = Math.round(sec.w * 16 / 9) > sec.h ? Math.round(sec.w * 16 / 9) : sec.h;
    }
    done();
  };

  // ---------- order ----------
  function flatOrder() { var E = X().st(); return E.flat.slice(); }
  function renumberZ(arr) { arr.forEach(function (it, i) { it.z = i + 1; }); }
  Tl.toFront = function () {
    var ed = X(), sel = ed.selItems(); if (!sel.length) return;
    var z = ed.nextZ(); sel.slice().sort(u.by("z")).forEach(function (i) { i.z = z++; });
    done();
  };
  Tl.toBack = function () {
    var ed = X(), sel = ed.selItems(); if (!sel.length) return;
    var z = ed.minZ() - sel.length; sel.slice().sort(u.by("z")).forEach(function (i) { i.z = z++; });
    done();
  };
  /** one step forward (dir 1) or backward (dir -1) among the flat items */
  Tl.zStep = function (dir) {
    var ed = X(), E = ed.st(), ids = {}; ed.selItems().forEach(function (i) { ids[i.id] = 1; });
    if (!Object.keys(ids).length) return;
    var arr = flatOrder();
    if (dir > 0) { for (var i = arr.length - 2; i >= 0; i--) if (ids[arr[i].id] && !ids[arr[i + 1].id]) { var a = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = a; } }
    else { for (var j = 1; j < arr.length; j++) if (ids[arr[j].id] && !ids[arr[j - 1].id]) { var b = arr[j]; arr[j] = arr[j - 1]; arr[j - 1] = b; } }
    renumberZ(arr);
    var top = arr.length; E.vec.forEach(function (it) { it.z = ++top; });
    done();
  };

  // ---------- lock, group ----------
  Tl.lock = function () {
    var ed = X(), sel = ed.selItems(); if (!sel.length) return;
    var all = sel.every(function (i) { return i.lock; });
    sel.forEach(function (i) { if (all) delete i.lock; else i.lock = true; });
    ed.sync(false); ed.drawSel(); ed.commit();
  };
  Tl.group = function () {
    var ed = X(), sel = ed.selItems().filter(function (i) { return i.t !== "arrow"; });
    if (sel.length && sel.every(function (i) { return i.g && i.g === sel[0].g; })) return Tl.ungroup();
    if (sel.length < 2) return ui.toast(t("bd_need2"));
    var g = u.uid("g"); sel.forEach(function (i) { i.g = g; });
    ed.sync(false); ed.drawSel(); ed.commit();
  };
  Tl.ungroup = function () {
    var ed = X(), sel = ed.selItems(); if (!sel.some(function (i) { return i.g; })) return;
    sel.forEach(function (i) { delete i.g; });
    ed.sync(false); ed.drawSel(); ed.commit();
  };

  // ---------- palette ----------
  Tl.palette = function () {
    var ed = X(), sel = ed.selItems(), it = sel.length === 1 ? sel[0] : null;
    if (!it || it.t !== "media") return ui.toast(t("bd_pal_none"));
    var src = it.prov === "upload" ? GK.blobs.cachedUrl(it.blob) : B.media.info(it).poster;
    if (!src) return ui.toast(t("bd_pal_none"));
    var id = it.id;
    B.media.palette(src).then(function (cols) {
      var E = ed.st(), cur = E && E.map[id]; if (!cur || !cols.length) return ui.toast(t("bd_pal_fail"));
      var made = [], g = u.uid("g"), w = 72, h = 92, gap = 8, x = cur.x, y = cur.y + cur.h + 16;
      cols.slice(0, 5).forEach(function (hex, i) {
        var s = ed.addItem({ t: "swatch", x: x + i * (w + gap), y: y, w: w, h: h, hex: hex, text: "", c: "bounce", g: g });
        if (s) made.push(s.id);
      });
      if (made.length) { ed.setSel(made); ed.commit(); }
    }, function () { ui.toast(t("bd_pal_fail")); });
  };

  /** bar and popover buttons */
  Tl.run = function (k) {
    if (!X() || !X().st() || !X().canEdit()) return;
    if (/^al-/.test(k)) Tl.align(k);
    else if (k === "di-h" || k === "di-v") Tl.distribute(k);
    else if (k === "grid") Tl.grid();
    else if (k === "same-w") Tl.sameWidth();
    else if (k === "front") Tl.toFront();
    else if (k === "fwd") Tl.zStep(1);
    else if (k === "bwd") Tl.zStep(-1);
    else if (k === "toback") Tl.toBack();
    else if (k === "lock") Tl.lock();
    else if (k === "group") Tl.group();
    else if (k === "palette") Tl.palette();
  };
})(window.GK);
