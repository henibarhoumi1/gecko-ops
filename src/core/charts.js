/* GECKO Ops · charts. Plain SVG, no library. Palette (tokens, set in app.css): series 1 Chroma, then blue, pink, yellow, green (s2 to s5). No orange or red.
   Every chart returns an HTML string with a title, a legend (2+ series), hover tooltips (data-tip) and a "table view" for screen readers.
   Status is never shown by hue: use the series order, labels and the table. Max 3 series per chart; fold the rest into "Other". */
(function (GK) {
  "use strict";
  var u = GK.u, esc = u.esc, t = GK.t;
  var C = {};

  GK.i18n.add({ ch_table: ["Table view", "Vue tableau"], ch_none: ["No data yet.", "Pas encore de données."], ch_other: ["Other", "Autres"], ch_total: ["Total", "Total"] });

  /** 12500 -> "12.5k", 1200000 -> "1.2M" (axis labels) */
  C.compact = function (n) {
    var a = Math.abs(n), s = n < 0 ? "−" : "";
    if (a >= 1e6) return s + u.dec(a / 1e6, 1) + "M";
    if (a >= 1e4) return s + Math.round(a / 1e3) + "k";
    if (a >= 1e3) return s + u.dec(a / 1e3, 1) + "k";
    return s + Math.round(a);
  };
  function nice(max, ticks) {
    if (max <= 0) return { max: 1, step: 1 };
    var raw = max / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    var step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    return { max: Math.ceil(max / step) * step, step: step };
  }
  var uidN = 0;
  function cid() { return "ch" + (++uidN); }

  function head(o) {
    var h = '<div class="ch-head"><div><h3 class="sec">' + esc(o.title || "") + "</h3>" + (o.sub ? '<p class="small muted" style="margin:2px 0 0">' + esc(o.sub) + "</p>" : "") + "</div>";
    if (o.series && o.series.length > 1) {
      h += '<ul class="ch-legend">' + o.series.map(function (s, i) { return '<li><i class="sw s' + (s.c || i + 1) + '"></i>' + esc(s.name) + "</li>"; }).join("") + "</ul>";
    }
    return h + "</div>";
  }
  function tableView(o, labels, rows, fmt) {
    var h = '<details class="ch-table"><summary class="lab sm">' + esc(t("ch_table")) + "</summary><div class=\"tbl\"><table><thead><tr><th></th>" +
      o.series.map(function (s) { return '<th class="r">' + esc(s.name) + "</th>"; }).join("") + "</tr></thead><tbody>";
    labels.forEach(function (l, i) { h += "<tr><td>" + esc(l) + "</td>" + o.series.map(function (s, j) { return '<td class="r num">' + esc(fmt(rows[j][i])) + "</td>"; }).join("") + "</tr>"; });
    return h + "</tbody></table></div></details>";
  }
  function empty(o) { return '<figure class="chart">' + head(o) + '<p class="empty">' + esc(o.empty || t("ch_none")) + "</p></figure>"; }
  function anyData(rows) { return rows.some(function (r) { return r.some(function (v) { return v; }); }); }

  /** Vertical bars. o: {title, sub, labels:[], series:[{name, values:[], c?}], stacked, fmt, height, goal:{value,label}}
      Negative values draw below the zero line. */
  C.bars = function (o) {
    var series = o.series || [], labels = o.labels || [], fmt = o.fmt || u.money;
    var rows = series.map(function (s) { return s.values; });
    if (!labels.length || !anyData(rows)) return empty(o);
    var W = 640, H = o.height || 230, L = 46, R = 10, T = 12, B = 28, pw = W - L - R, ph = H - T - B;
    var pos = 0, neg = 0;
    labels.forEach(function (_, i) {
      if (o.stacked) { var p = 0, n = 0; rows.forEach(function (r) { var v = r[i] || 0; if (v >= 0) p += v; else n += v; }); pos = Math.max(pos, p); neg = Math.min(neg, n); }
      else rows.forEach(function (r) { var v = r[i] || 0; pos = Math.max(pos, v); neg = Math.min(neg, v); });
    });
    if (o.goal) pos = Math.max(pos, o.goal.value);
    var span = nice(pos - neg, 4), ymax = neg < 0 ? Math.ceil(pos / span.step) * span.step : span.max, ymin = neg < 0 ? Math.floor(neg / span.step) * span.step : 0;
    if (ymax === ymin) ymax = ymin + 1;
    function y(v) { return T + ph - (v - ymin) / (ymax - ymin) * ph; }
    var g = '<svg class="ch-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.title || "") + '" preserveAspectRatio="xMidYMid meet">';
    for (var v = ymin; v <= ymax + 1e-9; v += span.step) g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + esc(C.compact(v)) + "</text>";
    g += '<line class="zero" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    var gw = pw / labels.length, n = o.stacked ? 1 : series.length, bw = Math.min(34, (gw * 0.7) / n), gap = 2;
    labels.forEach(function (lab, i) {
      var cx = L + gw * i + gw / 2, x0 = cx - (bw * n + gap * (n - 1)) / 2, accP = 0, accN = 0;
      var tip = lab + " · " + series.map(function (s) { return s.name + " " + fmt(s.values[i] || 0); }).join(" · ");
      series.forEach(function (s, j) {
        var val = s.values[i] || 0; if (!val) return;
        var x = o.stacked ? cx - bw / 2 : x0 + j * (bw + gap), yTop, yBot;
        if (o.stacked) { if (val >= 0) { yBot = y(accP); accP += val; yTop = y(accP); } else { yTop = y(accN); accN += val; yBot = y(accN); } }
        else { yTop = y(Math.max(val, 0)); yBot = y(Math.min(val, 0)); }
        var h = Math.max(1, yBot - yTop - (o.stacked ? 2 : 0));
        g += '<rect class="bar s' + (s.c || j + 1) + '" x="' + x.toFixed(1) + '" y="' + yTop.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" data-tip="' + esc(tip) + '"/>';
      });
      g += '<rect class="hit" x="' + (L + gw * i).toFixed(1) + '" y="' + T + '" width="' + gw.toFixed(1) + '" height="' + ph + '" data-tip="' + esc(tip) + '"/>';
      g += '<text class="ax" x="' + cx.toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle">' + esc(lab) + "</text>";
    });
    if (o.goal) g += '<line class="goal" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(o.goal.value) + '" y2="' + y(o.goal.value) + '"/><text class="ax strong" x="' + (W - R) + '" y="' + (y(o.goal.value) - 5) + '" text-anchor="end">' + esc(o.goal.label || "") + "</text>";
    g += "</svg>";
    return '<figure class="chart">' + head(o) + g + tableView(o, labels, rows, fmt) + "</figure>";
  };

  /** Lines. o: {title, sub, labels, series:[{name, values, c?}], fmt, height, area (fill under the first series), goal} */
  C.line = function (o) {
    var series = o.series || [], labels = o.labels || [], fmt = o.fmt || u.money, rows = series.map(function (s) { return s.values; });
    if (labels.length < 2 || !anyData(rows)) return empty(o);
    var W = 640, H = o.height || 230, L = 46, R = 14, T = 12, B = 28, pw = W - L - R, ph = H - T - B;
    var mx = 0, mn = 0; rows.forEach(function (r) { r.forEach(function (v) { if (v != null) { mx = Math.max(mx, v); mn = Math.min(mn, v); } }); });
    if (o.goal) mx = Math.max(mx, o.goal.value);
    var span = nice(mx - mn, 4), ymax = mn < 0 ? Math.ceil(mx / span.step) * span.step : span.max, ymin = mn < 0 ? Math.floor(mn / span.step) * span.step : 0;
    if (ymax === ymin) ymax = ymin + 1;
    function y(v) { return T + ph - (v - ymin) / (ymax - ymin) * ph; }
    function x(i) { return L + pw * i / (labels.length - 1); }
    var g = '<svg class="ch-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.title || "") + '">';
    for (var v = ymin; v <= ymax + 1e-9; v += span.step) g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + esc(C.compact(v)) + "</text>";
    g += '<line class="zero" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    var step = Math.ceil(labels.length / 8);
    labels.forEach(function (lab, i) { if (i % step === 0 || i === labels.length - 1) g += '<text class="ax" x="' + x(i).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="' + (i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle") + '">' + esc(lab) + "</text>"; });
    if (o.goal) g += '<line class="goal" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(o.goal.value) + '" y2="' + y(o.goal.value) + '"/><text class="ax strong" x="' + (W - R) + '" y="' + (y(o.goal.value) - 5) + '" text-anchor="end">' + esc(o.goal.label || "") + "</text>";
    series.forEach(function (s, j) {
      var pts = s.values.map(function (val, i) { return val == null ? null : [x(i), y(val)]; }), d = "", started = false;
      pts.forEach(function (p) { if (!p) { started = false; return; } d += (started ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); started = true; });
      if (o.area && j === 0) { var f = pts.filter(Boolean); if (f.length > 1) g += '<path class="area s' + (s.c || 1) + '" d="' + d + "L" + f[f.length - 1][0].toFixed(1) + " " + y(0) + "L" + f[0][0].toFixed(1) + " " + y(0) + 'Z"/>'; }
      g += '<path class="ln s' + (s.c || j + 1) + (s.dash ? " dash" : "") + '" d="' + d + '"/>';
    });
    labels.forEach(function (lab, i) {
      var tip = lab + " · " + series.map(function (s) { return s.name + " " + (s.values[i] == null ? "—" : fmt(s.values[i])); }).join(" · ");
      series.forEach(function (s, j) { if (s.values[i] != null) g += '<circle class="dot s' + (s.c || j + 1) + '" cx="' + x(i).toFixed(1) + '" cy="' + y(s.values[i]).toFixed(1) + '" r="3"/>'; });
      var gw = pw / (labels.length - 1);
      g += '<rect class="hit" x="' + (x(i) - gw / 2).toFixed(1) + '" y="' + T + '" width="' + gw.toFixed(1) + '" height="' + ph + '" data-tip="' + esc(tip) + '"/>';
    });
    g += "</svg>";
    return '<figure class="chart">' + head(o) + g + tableView(o, labels, rows, fmt) + "</figure>";
  };

  /** Horizontal ranking bars. o: {title, sub, items:[{label, value, note?, c?, tip?}], fmt, max} Label left, value right, bar between. */
  C.hbars = function (o) {
    var items = o.items || [], fmt = o.fmt || u.money;
    if (!items.length || !items.some(function (i) { return i.value; })) return empty(o);
    var mx = o.max || Math.max.apply(null, items.map(function (i) { return Math.abs(i.value || 0); })) || 1;
    var h = '<figure class="chart">' + head(o) + '<ul class="hb">';
    items.forEach(function (it) {
      var w = Math.max(0.5, Math.abs(it.value || 0) / mx * 100), tip = it.tip || (it.label + " · " + fmt(it.value || 0));
      h += '<li data-tip="' + esc(tip) + '"><span class="hb-l">' + esc(it.label) + (it.note ? '<em class="small muted"> ' + esc(it.note) + "</em>" : "") + '</span><span class="hb-t"><i class="bar s' + (it.c || 1) + '" style="width:' + w.toFixed(1) + '%"></i></span><span class="hb-v num">' + esc(fmt(it.value || 0)) + "</span></li>";
    });
    return h + "</ul></figure>";
  };

  /** Funnel: stacked horizontal steps with conversion from the previous step. o: {title, steps:[{label, value}]} */
  C.funnel = function (o) {
    var steps = o.steps || [];
    if (!steps.length || !steps[0].value) return empty(o);
    var top = steps[0].value;
    var h = '<figure class="chart">' + head(o) + '<ul class="fn">';
    steps.forEach(function (s, i) {
      var prev = i ? steps[i - 1].value : null, conv = prev ? Math.round((s.value / prev) * 100) : null;
      h += '<li data-tip="' + esc(s.label + " · " + s.value + (conv != null ? " · " + conv + "%" : "")) + '"><span class="fn-l">' + esc(s.label) + '</span><span class="fn-t"><i class="bar s' + (i === steps.length - 1 ? 1 : 2) + '" style="width:' + Math.max(1.5, s.value / top * 100).toFixed(1) + '%"></i></span><span class="fn-v num">' + s.value + (conv != null ? ' <em class="small muted">' + u.pct(conv) + "</em>" : "") + "</span></li>";
    });
    return h + "</ul></figure>";
  };

  /** One number against a limit, as a ring. o: {title, value, max, label (centre text), sub, warnAt (0-1)} */
  C.ring = function (o) {
    var r = 52, cx = 64, cy = 64, circ = 2 * Math.PI * r, p = Math.max(0, Math.min(1, o.max ? o.value / o.max : 0));
    var svg = '<svg class="ring" viewBox="0 0 128 128" role="img" aria-label="' + esc((o.title || "") + " " + Math.round(p * 100) + "%") + '"><circle class="rg-bg" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/><circle class="rg-fg' + (o.warnAt && p >= o.warnAt ? " warn" : "") + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-dasharray="' + (circ * p).toFixed(1) + " " + circ.toFixed(1) + '" transform="rotate(-90 64 64)"/><text class="rg-t" x="64" y="70" text-anchor="middle">' + esc(o.label != null ? o.label : u.pct(p * 100)) + "</text></svg>";
    return '<figure class="chart ring-wrap" data-tip="' + esc(o.tip || "") + '">' + svg + '<figcaption><h3 class="sec">' + esc(o.title || "") + "</h3>" + (o.sub ? '<p class="small muted" style="margin:2px 0 0">' + esc(o.sub) + "</p>" : "") + "</figcaption></figure>";
  };

  /** Tiny trend line for KPI tiles. values:[], returns an inline svg. */
  C.spark = function (values, w, h) {
    w = w || 92; h = h || 26;
    var v = (values || []).filter(function (x) { return x != null; });
    if (v.length < 2) return "";
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), rg = mx - mn || 1;
    var d = v.map(function (x, i) { return (i ? "L" : "M") + (i / (v.length - 1) * (w - 4) + 2).toFixed(1) + " " + (h - 3 - (x - mn) / rg * (h - 6)).toFixed(1); }).join("");
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" aria-hidden="true"><path class="ln s1" d="' + d + '"/></svg>';
  };

  /** One headline number. o: {lab, value (formatted), note, trend:[numbers], delta:{text, up:boolean}} */
  C.stat = function (o) {
    return '<div class="stat"><span class="lab sm muted">' + esc(o.lab) + '</span><span class="v">' + esc(o.value) + "</span>" +
      '<span class="row" style="gap:8px;flex-wrap:nowrap">' + (o.delta ? '<span class="delta ' + (o.delta.up ? "up" : "down") + '">' + esc(o.delta.text) + "</span>" : "") + (o.note ? '<span class="n small muted">' + esc(o.note) + "</span>" : "") + "</span>" + (o.trend ? C.spark(o.trend) : "") + "</div>";
  };

  // ---------- tooltip (one element, delegated) ----------
  var tipEl = null;
  function showTip(el, ev) {
    var txt = el.getAttribute("data-tip"); if (!txt) return hideTip();
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; tipEl.setAttribute("role", "tooltip"); document.body.appendChild(tipEl); }
    tipEl.textContent = txt; tipEl.hidden = false;
    var x = ev.clientX + 12, y = ev.clientY + 14, w = tipEl.offsetWidth;
    if (x + w > window.innerWidth - 8) x = Math.max(8, ev.clientX - w - 12);
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; }
  document.addEventListener("mousemove", function (ev) { var el = ev.target.closest && ev.target.closest("[data-tip]"); if (el) showTip(el, ev); else hideTip(); });
  document.addEventListener("touchstart", function (ev) { var el = ev.target.closest && ev.target.closest("[data-tip]"); if (el && ev.touches[0]) { showTip(el, ev.touches[0]); setTimeout(hideTip, 2500); } else hideTip(); }, { passive: true });
  window.addEventListener("scroll", hideTip, true);

  GK.charts = C;
})(window.GK);
