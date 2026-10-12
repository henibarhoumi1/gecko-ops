/* GECKO Ops · boards: the editor.
   The canvas is built once into a persistent DOM node. The store re-renders the whole app on any change, so the page only
   renders a head and an empty slot; after() moves the same node back into the slot. All editor state lives in module
   variables (E) and is saved to the store, debounced, but never read back from it while the board is open
   (except to pick up a newer revision saved by someone else).
   V03: media cards (paste or drop a link or an image), sections, swatches, lock, groups, tags and filter, likes,
   smart guides, minimap, shortcuts popover. Arrange, order, lock, group and palette live in boards_tools.js (B.tools)
   and work on this editor through B.ed. */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  var B = GK.boards, G = B.geo;
  var NS = "http://www.w3.org/2000/svg";
  var HIST = 80, MAX_ITEMS = 300, MAX_PEN = 60, MAX_PTS = 400, MAX_BYTES = 240000, GRID = 20, SEC_H = 40;
  var P = { snapOn: !!u.lsGet("gecko-bd-snap", false), color: G.col(u.lsGet("gecko-bd-color", "gel")), mini: u.lsGet("gecko-bd-mini", null) };
  var E = null;   // editor state for the open board
  var R = null;   // persistent DOM
  function MD() { return B.media; }

  B.css("" +
    ".bd-root{position:relative;display:flex;flex-direction:column;height:clamp(440px,calc(100dvh - 220px),1600px);border:1px solid var(--line);border-radius:22px;background:var(--bg);overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;color:var(--tx)}" +
    ".bd-bar{display:flex;align-items:center;gap:2px;padding:6px 8px;border-bottom:1px solid var(--line);background:var(--s1);overflow-x:auto;flex:none;scrollbar-width:none}.bd-bar::-webkit-scrollbar{display:none}" +
    ".bd-sep{width:1px;align-self:stretch;background:var(--line);margin:6px 6px;flex:none}" +
    ".bd-b{all:unset;box-sizing:border-box;flex:none;width:36px;height:36px;display:grid;place-items:center;cursor:pointer;border-radius:8px;color:var(--tx-2);font:600 11px/1 inherit;letter-spacing:.02em;transition:background 140ms ease-out,color 140ms ease-out}" +
    ".bd-b svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}" +
    ".bd-b:hover{background:var(--s2);color:var(--tx)}.bd-b[aria-pressed=true]{background:var(--chroma-soft);color:var(--tx);box-shadow:inset 0 0 0 1px var(--chroma)}.bd-b:disabled{opacity:.28;cursor:default;background:none}" +
    ".bd-b:focus-visible,.bd-mbtn:focus-visible{outline:2px solid var(--chroma);outline-offset:-2px}.bd-cv:focus-visible{outline:1px solid var(--line-2);outline-offset:-1px}" +
    ".bd-sw i{display:block;width:20px;height:20px;border-radius:999px;background:var(--bd-f);border:1px solid var(--line-2);pointer-events:none}.bd-sw[aria-pressed=true]{background:none;box-shadow:inset 0 0 0 2px var(--chroma);border-radius:999px}" +
    ".bd-zl{flex:none;min-width:44px;text-align:center;font:600 12px inherit;color:var(--tx-2);font-variant-numeric:tabular-nums}" +
    ".bd-ftag{flex:none;height:32px;max-width:150px;margin:0 4px;padding:0 8px;border-radius:8px;background:var(--s2);border:1px solid var(--line-2);color:var(--tx);font:500 12px inherit}.bd-ftag[hidden]{display:none}" +
    ".bd-hint{position:absolute;left:12px;bottom:12px;padding:6px 12px;border-radius:999px;background:var(--s1);border:1px solid var(--line-2);color:var(--tx-2);font:500 12px inherit;white-space:nowrap;pointer-events:none}.bd-hint[hidden]{display:none}" +
    ".bd-status{flex:none;margin-left:auto;padding:0 6px 0 10px;font:600 11px inherit;letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3);white-space:nowrap}" +
    ".bd-remote,.bd-rolabel{flex:none;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:6px 12px;background:var(--gel-soft);color:var(--tx);font-size:13px;border-bottom:1px solid var(--line)}.bd-remote[hidden],.bd-rolabel[hidden]{display:none}" +
    ".bd-body{flex:1;min-height:0;display:flex}" +
    ".bd-tools{flex:none;display:flex;flex-direction:column;gap:2px;padding:6px;border-right:1px solid var(--line);background:var(--s1);overflow-y:auto;scrollbar-width:none}.bd-tools::-webkit-scrollbar{display:none}.bd-tools .bd-sep{width:auto;height:1px;margin:4px 6px}" +
    ".bd-cv{position:relative;flex:1;min-width:0;overflow:hidden;touch-action:none;cursor:default;outline:none}" +
    ".bd-cv.tool-hand{cursor:grab}.bd-cv.panning{cursor:grabbing}.bd-cv.tool-note,.bd-cv.tool-text,.bd-cv.tool-frame,.bd-cv.tool-section,.bd-cv.tool-rect,.bd-cv.tool-ellipse,.bd-cv.tool-line,.bd-cv.tool-arrow,.bd-cv.tool-pen,.bd-cv.tool-eraser{cursor:crosshair}" +
    ".bd-grid{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:var(--line-2)}" +
    ".bd-world{position:absolute;left:0;top:0;transform-origin:0 0;--z:1;width:0;height:0}" +
    ".bd-hl,.bd-svg,.bd-ov{position:absolute;left:0;top:0;width:0;height:0;overflow:visible}.bd-svg{pointer-events:none;width:1px;height:1px;max-width:none}" +
    ".bd-g{color:var(--tx)}.bd-g path,.bd-g line{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}.bd-g polygon{fill:currentColor}" +
    ".bd-pen path{stroke-width:4}.bd-arrow path{stroke-width:3}.bd-lineshape line{stroke-width:4}.bd-tmp path{fill:none;stroke:var(--chroma);stroke-width:3;stroke-dasharray:8 6}" +
    ".bd-guides path{fill:none;stroke:var(--gel-deep);stroke-width:calc(1px / var(--z));stroke-dasharray:calc(4px / var(--z)) calc(3px / var(--z))}" +
    ".bd-c-gel{--bd-f:var(--gel);--bd-k:var(--slate);--bd-s:var(--gel)}.bd-c-chroma{--bd-f:var(--chroma);--bd-k:var(--bounce);--bd-s:var(--chroma)}.bd-c-bounce{--bd-f:var(--bounce);--bd-k:var(--slate);--bd-s:var(--tx-3)}.bd-c-slate{--bd-f:var(--slate);--bd-k:var(--bounce);--bd-s:var(--tx)}" +
    ".bd-g.bd-c-gel{color:var(--gel)}.bd-g.bd-c-chroma{color:var(--chroma)}.bd-g.bd-c-bounce{color:var(--tx-3)}.bd-g.bd-c-slate{color:var(--tx)}" +
    ".bd-i{position:absolute;left:0;top:0;box-sizing:border-box;pointer-events:none;overflow:hidden;font:500 17px/1.3 inherit;transition:opacity 140ms ease-out}" +
    ".bd-dim{opacity:.14}" +
    ".bd-tx{white-space:pre-wrap;overflow-wrap:anywhere}.bd-empty .bd-tx::before{content:attr(data-ph);opacity:.5}" +
    ".bd-note{background:var(--bd-f);color:var(--bd-k);border:1px solid var(--line);border-radius:6px;padding:12px 14px}.bd-note.bd-c-slate{border-color:var(--line-2)}" +
    ".bd-text{overflow:visible;font-weight:600;color:var(--tx);padding:2px 4px;line-height:1.25;height:auto}.bd-text.bd-c-gel{background:var(--gel);color:var(--slate);border-radius:4px}.bd-text.bd-c-chroma{color:var(--chroma)}.bd-text.bd-c-bounce{color:var(--tx-2)}" +
    ".bd-frame{overflow:visible;border:2px solid var(--tx-3);border-radius:12px;background:var(--s1)}" +
    ".bd-fh{position:absolute;left:-2px;bottom:calc(100% + 4px);display:flex;gap:8px;align-items:center;white-space:nowrap;max-width:none;height:24px;font:600 14px/1 inherit;color:var(--tx)}" +
    ".bd-fh b{display:grid;place-items:center;min-width:24px;height:22px;padding:0 6px;background:var(--bd-f);color:var(--bd-k);border:1px solid var(--line-2);border-radius:999px;font-weight:600;font-variant-numeric:tabular-nums}.bd-fh span{max-width:240px;overflow:hidden;text-overflow:ellipsis}" +
    ".bd-frame.bd-empty .bd-fh span::before,.bd-section.bd-empty .bd-sh span::before{content:attr(data-ph);opacity:.45;font-weight:500}.bd-frame .bd-tx,.bd-section .bd-tx{display:none}" +
    ".bd-section{overflow:visible;background:var(--s1);border:1px solid var(--line-2);border-radius:16px}" +
    ".bd-sh{position:absolute;left:0;right:0;top:0;height:" + SEC_H + "px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 14px;border-bottom:1px solid var(--line);font:600 16px/1 inherit;color:var(--tx);white-space:nowrap;overflow:hidden}" +
    ".bd-sh i{flex:none;width:10px;height:10px;border-radius:999px;background:var(--bd-f);border:1px solid var(--line-2)}.bd-sh span{overflow:hidden;text-overflow:ellipsis}" +
    ".bd-swatch{background:var(--s1);border:1px solid var(--line-2);border-radius:12px;padding:6px;display:flex;flex-direction:column;gap:6px}" +
    ".bd-swc{flex:1;min-height:20px;border-radius:8px;border:1px solid var(--line)}.bd-swl{flex:none;display:flex;flex-direction:column;gap:2px;font:600 12px/1.15 inherit;color:var(--tx);font-variant-numeric:tabular-nums;overflow:hidden}.bd-swl span{font-weight:500;font-size:11px;color:var(--tx-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".bd-shape{background:var(--bd-f);color:var(--bd-k);border:2px solid var(--bd-s);display:flex;align-items:center;justify-content:center;text-align:center;padding:8px;border-radius:8px}.bd-ellipse{border-radius:50%}.bd-shape.bd-empty .bd-tx::before{content:none}" +
    // media cards
    ".bd-media{background:var(--s1);border:1px solid var(--line-2);border-radius:12px;color:var(--tx);font-size:13px}" +
    ".bd-mw{display:flex;flex-direction:column;width:100%;height:100%}" +
    ".bd-mv{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;background:var(--s2);border-radius:11px 11px 0 0}" +
    ".bd-mph{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:6px;text-align:center;padding:12px;background:repeating-linear-gradient(135deg,var(--s2) 0 14px,var(--s3) 14px 15px);color:var(--tx-3);font:600 11px/1.3 inherit;letter-spacing:.08em;text-transform:uppercase}" +
    ".bd-mph.pl{align-content:start;padding-top:46px}.bd-mph b{font-size:22px;letter-spacing:0;text-transform:none;color:var(--tx-2);font-weight:600}" +
    ".bd-mp,.bd-mfr{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}.bd-mp{object-fit:cover}.bd-mfr{pointer-events:auto;background:var(--slate)}" +
    ".bd-mb{position:absolute;left:8px;top:8px;padding:4px 9px;border-radius:999px;background:color-mix(in srgb,var(--bg) 74%,transparent);color:var(--tx);font:600 11px/1 inherit;border:1px solid var(--line-2)}" +
    ".bd-mbtn{all:unset;box-sizing:border-box;pointer-events:auto;cursor:pointer;display:inline-grid;grid-auto-flow:column;gap:4px;place-items:center;min-width:30px;height:30px;padding:0 6px;border-radius:8px;color:var(--tx-2);font:600 12px/1 inherit;font-variant-numeric:tabular-nums}" +
    ".bd-mbtn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.bd-mbtn:hover{background:var(--s2);color:var(--tx)}" +
    ".bd-mplay{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:999px;background:color-mix(in srgb,var(--bg) 66%,transparent);border:1px solid var(--line-2);color:var(--tx)}.bd-mplay svg{width:22px;height:22px;fill:currentColor;stroke:none;margin-left:3px}.bd-mplay:hover{background:var(--chroma);color:var(--bounce)}" +
    ".bd-mstop,.bd-mzoom{position:absolute;right:8px;top:8px;background:color-mix(in srgb,var(--bg) 74%,transparent);border:1px solid var(--line-2);color:var(--tx)}" +
    ".bd-mf{flex:none;height:50px;display:flex;align-items:center;gap:8px;padding:0 6px 0 12px;box-sizing:border-box;border-top:1px solid var(--line)}" +
    ".bd-mtx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.bd-mt{font-weight:600;font-size:13px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bd-mc{font-size:12px;line-height:1.2;color:var(--tx-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".bd-mact{flex:none;display:flex;gap:2px}.bd-like.on{color:var(--gel-deep)}.bd-like.on svg{fill:currentColor}" +
    ".bd-nov .bd-mf{height:100%;align-items:flex-start;padding:12px 6px 10px 12px;border-top:0}.bd-nov .bd-mt{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:15px}.bd-nov .bd-mc{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
    ".bd-fav{flex:none;width:32px;height:32px;border-radius:8px;background:var(--s2);border:1px solid var(--line);display:grid;place-items:center;position:relative;overflow:hidden;font:600 14px inherit;color:var(--tx-2)}.bd-fav img{position:absolute;inset:6px;width:20px;height:20px}" +
    // badges and tags on any item
    ".bd-bdg{position:absolute;right:6px;top:6px;display:flex;gap:4px;pointer-events:none;z-index:1}.bd-bdg:empty,.bd-tags:empty{display:none}" +
    ".bd-lk{width:24px;height:24px;border-radius:999px;background:var(--bg);color:var(--tx);border:1px solid var(--line-2);display:grid;place-items:center}.bd-lk svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2}" +
    ".bd-bdg .bd-mbtn{height:24px;min-width:24px;border-radius:999px;background:var(--bg);color:var(--gel-deep);border:1px solid var(--line-2)}.bd-bdg .bd-mbtn svg{width:13px;height:13px;fill:currentColor;stroke:none}" +
    ".bd-media .bd-bdg{top:auto;bottom:58px}.bd-section .bd-bdg{top:8px;right:10px}" +
    ".bd-tags{position:absolute;left:6px;bottom:6px;display:flex;gap:4px;flex-wrap:wrap;max-width:calc(100% - 12px);pointer-events:none}.bd-media .bd-tags{bottom:56px}" +
    ".bd-tags span{font:600 10px/1 inherit;padding:4px 7px;border-radius:999px;background:var(--bg);color:var(--tx);border:1px solid var(--line-2);white-space:nowrap}" +
    // editing
    ".bd-edit{position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;margin:0;border:0;border-radius:0;background:var(--bd-f);color:var(--bd-k);font:inherit;line-height:inherit;padding:inherit;resize:none;overflow:hidden;pointer-events:auto;-webkit-user-select:text;user-select:text;outline:2px solid var(--chroma);outline-offset:-2px;text-align:inherit}" +
    ".bd-note .bd-edit{padding:12px 14px;background:transparent}.bd-text .bd-edit{background:var(--bg);color:var(--tx);padding:2px 4px;position:relative;display:block}.bd-text.bd-c-gel .bd-edit{background:var(--gel);color:var(--slate)}" +
    ".bd-frame .bd-edit{position:absolute;left:0;top:auto;bottom:calc(100% + 2px);width:240px;height:26px;padding:0 6px;font:600 16px/26px inherit;background:var(--bg);color:var(--tx)}" +
    ".bd-section .bd-edit{height:" + SEC_H + "px;padding:0 14px 0 32px;font:600 16px/" + SEC_H + "px inherit;background:transparent;color:var(--tx);border-radius:16px 16px 0 0}" +
    ".bd-shape .bd-edit{padding:8px;background:transparent;text-align:center}" +
    ".bd-editing .bd-tx{visibility:hidden}.bd-frame.bd-editing .bd-fh span,.bd-section.bd-editing .bd-sh span{visibility:hidden}" +
    ".bd-sel{position:absolute;box-sizing:border-box;pointer-events:none;border:calc(2px / var(--z)) solid var(--chroma);border-radius:calc(4px / var(--z))}.bd-sel.dash{border-style:dashed}.bd-sel.grp{border-width:calc(1px / var(--z));border-style:dashed;border-color:var(--tx-3)}" +
    ".bd-hnd{position:absolute;box-sizing:border-box;pointer-events:none;width:calc(14px / var(--z));height:calc(14px / var(--z));background:var(--bg);border:calc(2px / var(--z)) solid var(--chroma);border-radius:calc(4px / var(--z))}" +
    ".bd-prev{position:absolute;box-sizing:border-box;pointer-events:none;border:calc(2px / var(--z)) dashed var(--chroma);border-radius:calc(8px / var(--z))}" +
    ".bd-marq{position:absolute;box-sizing:border-box;border:1px dashed var(--chroma);background:var(--chroma-soft);pointer-events:none}.bd-marq[hidden]{display:none}" +
    // drop target, minimap, popovers
    ".bd-root.bd-drop .bd-cv::after{content:attr(data-drop);position:absolute;inset:12px;border:2px dashed var(--chroma);border-radius:16px;display:grid;place-items:center;font:600 14px inherit;color:var(--tx);background:var(--chroma-soft);pointer-events:none}" +
    ".bd-mini{position:absolute;right:12px;bottom:12px;width:200px;height:132px;border:1px solid var(--line-2);border-radius:12px;background:var(--s1);cursor:pointer;touch-action:none}.bd-mini[hidden]{display:none}" +
    ".bd-pop{position:absolute;z-index:6;top:54px;background:var(--s1);border:1px solid var(--line-2);border-radius:16px;padding:12px;box-sizing:border-box;max-width:calc(100% - 24px);max-height:calc(100% - 66px);overflow:auto;color:var(--tx)}.bd-pop[hidden]{display:none}" +
    ".bd-pop h4{margin:0 0 8px;font:600 11px/1 inherit;letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3)}.bd-pop .bd-pg{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:10px}.bd-pop .bd-pg:last-child{margin-bottom:0}" +
    ".bd-help{right:12px;width:340px}.bd-help dl{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;margin:0;font-size:13px}.bd-help dt{white-space:nowrap}.bd-help dd{margin:0;color:var(--tx-2)}" +
    ".bd-help kbd{display:inline-block;min-width:18px;padding:3px 6px;border-radius:6px;background:var(--s2);border:1px solid var(--line-2);font:600 11px/1 inherit;text-align:center;color:var(--tx)}" +
    ".bd-lb{display:block;max-width:100%;max-height:70vh;margin:0 auto;border-radius:12px;object-fit:contain;background:var(--s2)}" +
    ".bd-ro .bd-ed,.bd-ro .bd-tools{display:none}" +
    "@media (max-width:860px){.bd-root{height:clamp(420px,calc(100dvh - 140px),1600px);border-radius:16px}.bd-body{flex-direction:column-reverse}.bd-tools{flex-direction:row;border-right:0;border-top:1px solid var(--line);overflow-x:auto;overflow-y:hidden}.bd-tools .bd-sep{width:1px;height:auto;margin:6px 4px}.bd-mini{width:140px;height:92px;right:8px;bottom:8px}.bd-help{left:12px;right:12px;width:auto}.bd-hint{bottom:8px;left:8px}}" +
    "@media (pointer:coarse){.bd-b{width:44px;height:44px}.bd-mbtn{min-width:36px;height:36px}}");

  // ---------- icons ----------
  var IC = {
    select: "M5 3l14 8-6 2-3 6z", hand: "M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3",
    note: "M4 4h16v10l-6 6H4zM14 20v-6h6", text: "M5 6V4h14v2M12 4v16M9 20h6", frame: "M7 2h10v20H7zM10 6h4", section: "M3 5h18v15H3zM3 10h18M7 7.5h4",
    media: "M3 5h18v14H3zM10 9l5 3-5 3z", upload: "M12 15V4M7 9l5-5 5 5M4 15v5h16v-5", swatch: "M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z",
    link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
    rect: "M4 6h16v12H4z", ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6"/>', line: "M5 19L19 5", arrow: "M5 19L19 5M10 5h9v9",
    pen: "M4 20l1-4L16 5l3 3L8 19zM14 7l3 3", eraser: "M20 20H9L4 15l9-9 7 7-6 7M9 20l-5-5",
    undo: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3", redo: "M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3",
    dup: "M8 8h12v12H8zM4 16V4h12", front: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5", del: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6",
    edit: "M4 20l1-4L16 5l3 3L8 19z", zin: "M12 5v14M5 12h14", zout: "M5 12h14", fit: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5", snap: "M4 4h16v16H4zM4 12h16M12 4v16",
    num: "M9 4L7 20M17 4l-2 16M4 9h16M3 15h16", lock: "M6 11h12v9H6zM9 11V8a3 3 0 016 0v3", group: "M3 3h8v8H3zM13 13h8v8h-8zM7 11v6h6M11 7h6v6",
    arrange: "M4 4v16M8 7h12M8 12h7M8 17h10", details: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.5",
    like: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z", palette: "M12 3a9 9 0 100 18c1 0 1.6-.8 1.6-1.6 0-1.4-1.2-1.6-1.2-2.8 0-1 .8-1.6 1.8-1.6H17a4 4 0 004-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7h.01M15 7h.01",
    mini: "M3 5h18v14H3zM13 12h6v5h-6z", help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.6 9.2a2.5 2.5 0 114.6 1.3c-.7.9-2.2 1.3-2.2 2.9M12 17h.01",
    play: '<path d="M7 4.5l13 7.5-13 7.5z"/>', x: "M6 6l12 12M18 6L6 18", open: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6", expand: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"
  };
  function icon(k) { var s = IC[k]; return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (s.charAt(0) === "<" ? s : '<path d="' + s + '"/>') + "</svg>"; }
  B.icon = icon; B.IC = IC;
  var TOOLS = ["select", "hand", "|", "note", "text", "section", "frame", "@media", "@upload", "@swatch", "|", "rect", "ellipse", "line", "arrow", "pen", "eraser"];

  // ---------- state helpers ----------
  function canEdit() { return B.canEdit(); }
  function pending() { return !!(E && (E.dirty || E.timer || E.editId || E.gest)); }
  function reindex() {
    E.map = {}; E.flat = []; E.vec = [];
    E.items.forEach(function (it) { E.map[it.id] = it; });
    E.items.forEach(function (it) { (it.t === "pen" || it.t === "arrow" || G.isLine(it) ? E.vec : E.flat).push(it); });
    E.flat.sort(u.by("z")); E.vec.sort(u.by("z"));
  }
  function nextZ() { var z = 0; E.items.forEach(function (i) { if ((i.z || 0) > z) z = i.z || 0; }); return z + 1; }
  function minZ() { var z = 0; E.items.forEach(function (i) { if ((i.z || 0) < z) z = i.z || 0; }); return z - 1; }
  var TYPES = ["note", "text", "frame", "link", "shape", "arrow", "pen", "media", "section", "swatch"];
  function strList(a, max, len) { return Array.isArray(a) ? a.map(function (s) { return String(s || "").trim().slice(0, len); }).filter(Boolean).filter(function (s, i, arr) { return arr.indexOf(s) === i; }).slice(0, max) : []; }
  /** Load-time clean up and migration (V02 link cards become media cards; bad fields dropped). Exposed for the SVG and tests. */
  function cleanItems(arr) {
    var out = [], seen = {};
    (arr || []).forEach(function (raw, i) {
      if (!raw || typeof raw !== "object" || !raw.id || seen[raw.id]) return;
      if (TYPES.indexOf(raw.t) < 0) return;
      var c = u.clone(raw);
      if (c.t === "link" && MD()) c = MD().migrate(c);
      seen[c.id] = 1; c.c = G.col(c.c); if (c.z == null) c.z = i + 1;
      if (c.t !== "arrow" && c.t !== "pen") { c.x = +c.x || 0; c.y = +c.y || 0; c.w = +c.w || (G.SIZE[c.t] || [160, 80])[0]; c.h = +c.h || (G.SIZE[c.t] || [160, 80])[1]; }
      if (c.t === "media") {
        c.url = G.safeUrl(c.url) || "";
        if (!c.prov && MD()) { var p = MD().parse(c.url); if (p) { c.prov = p.prov; c.kind = p.kind; c.mid = p.mid; c.ratio = p.ratio; } }
        c.prov = String(c.prov || "link"); c.kind = String(c.kind || "link"); c.ratio = +c.ratio || 0;
        if (c.poster && !G.safeUrl(c.poster)) delete c.poster;
        if (c.blob) c.blob = String(c.blob).replace(/[^\w-]/g, "").slice(0, 40);
      }
      if (c.t === "swatch") c.hex = (MD() && MD().validHex(c.hex)) || "#3946EC";
      if (c.tags != null) { c.tags = strList(c.tags, 8, 24); if (!c.tags.length) delete c.tags; }
      if (c.likes != null) { c.likes = strList(c.likes, 50, 40); if (!c.likes.length) delete c.likes; }
      if (c.lock != null) { if (c.lock) c.lock = true; else delete c.lock; }
      if (c.g != null) { c.g = String(c.g).slice(0, 24); if (!c.g) delete c.g; }
      out.push(c);
    });
    var ids = {}; out.forEach(function (i) { ids[i.id] = 1; });
    return out.filter(function (i) { return i.t !== "arrow" || (i.from && i.to && ids[i.from.id] && ids[i.to.id]); });
  }
  B.cleanItems = cleanItems;
  function newState(b) {
    var v = b.view || {};
    var items = cleanItems(b.items);
    return {
      id: b.id, items: items, view: { x: +v.x || 0, y: +v.y || 0, z: +v.z || 0 }, rev: b.rev || 0, updated: b.updated || "", savedJson: JSON.stringify(b.items || []),
      undo: [], redo: [], snap: JSON.stringify(items), lastKey: "", lastAt: 0, sel: [], tool: "select", dirty: false, viewDirty: false, timer: null,
      remote: false, editId: "", gest: null, ptrs: {}, pinch: null, ignore: null, lastTap: null, arrowFrom: null, space: false, needFit: !(+v.z), map: {}, flat: [], vec: [], hover: null
    };
  }
  function loadBoard(b) {
    if (E && E.id !== b.id && (E.dirty || E.viewDirty)) save(true);
    E = newState(b);
    if (R) { R.play = {}; R.tag = ""; }
    reindex(); wipe(); sync(true);
  }
  function wipe() { if (!R) return; R.hl.innerHTML = ""; R.vec.innerHTML = ""; R.ov.innerHTML = ""; R.els = {}; }

  // ---------- persistence ----------
  function setStatus(k) { if (R) R.status.textContent = k ? t("bd_" + k) : ""; }
  function markDirty() {
    if (!E || !canEdit()) return;
    E.dirty = true; setStatus("unsaved");
    clearTimeout(E.timer); E.timer = setTimeout(function () { save(); }, 600);
  }
  /** One write: items + view + rev + updated. now=true ignores a gesture in progress (leaving the board). */
  function save(now) {
    if (!E) return;
    clearTimeout(E.timer); E.timer = null;
    if (!E.dirty && !E.viewDirty) return;
    if (E.gest && !now) { E.timer = setTimeout(function () { save(); }, 300); return; }
    if (!S.get("boards", E.id) || !canEdit()) { E.dirty = E.viewDirty = false; return; }
    var view = { x: Math.round(E.view.x), y: Math.round(E.view.y), z: Math.round(E.view.z * 1000) / 1000 };
    var rec;
    if (E.dirty) {
      var json = JSON.stringify(E.items);
      if (json.length > MAX_BYTES) { ui.toast(t("bd_toobig")); setStatus("unsaved"); return; }
      var rev = (E.rev || 0) + 1, stamp = u.nowStamp();
      rec = S.patch("boards", E.id, { items: E.items, view: view, rev: rev, updated: stamp });
      if (rec) { E.rev = rev; E.updated = stamp; E.savedJson = json; }
    } else rec = S.patch("boards", E.id, { view: view });
    if (rec) { E.dirty = false; E.viewDirty = false; E.remote = false; if (R) R.remote.hidden = true; setStatus("saved"); } else setStatus("unsaved");
  }
  B.flush = function () {
    if (!E) return;
    endEdit();
    if (E.gest) finishGesture(false);
    if (E.dirty || E.viewDirty) save(true);
  };
  B.drop = function (id) { if (E && E.id === id) { clearTimeout(E.timer); E.dirty = E.viewDirty = false; E.timer = null; E = null; } };
  window.addEventListener("pagehide", function () { B.flush(); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") B.flush(); });
  document.addEventListener("click", function (ev) { if (E && ev.target.closest && ev.target.closest('[data-a="nav"]')) B.flush(); }, true);

  // ---------- history ----------
  function commit(key) {
    if (!E) return;
    var now = JSON.stringify(E.items);
    if (now === E.snap) return;
    var co = key && E.lastKey === key && Date.now() - E.lastAt < 700;
    if (!co) { E.undo.push(E.snap); if (E.undo.length > HIST) E.undo.shift(); }
    E.lastKey = key || ""; E.lastAt = Date.now(); E.snap = now; E.redo = [];
    markDirty(); syncBar(); miniSoon();
  }
  /** fold a background change (a preview title, a picture's real ratio) into the current step: no new undo entry */
  function amend() {
    if (!E) return;
    var now = JSON.stringify(E.items); if (now === E.snap) return;
    E.snap = now; markDirty(); miniSoon();
  }
  function afterHistory() {
    reindex();
    E.sel = E.sel.filter(function (id) { return E.map[id]; });
    sync(false); drawSel(); syncBar(); markDirty(); miniSoon();
  }
  function undo() {
    if (!E || !E.undo.length || !canEdit()) return;
    endEdit(); if (!E.undo.length) return;
    var prev = E.undo.pop(); E.redo.push(E.snap); E.snap = prev; E.items = JSON.parse(prev); E.lastKey = ""; afterHistory();
  }
  function redo() {
    if (!E || !E.redo.length || !canEdit()) return;
    endEdit();
    var nx = E.redo.pop(); E.undo.push(E.snap); E.snap = nx; E.items = JSON.parse(nx); E.lastKey = ""; afterHistory();
  }

  // ---------- painting ----------
  function meId() { var me = GK.me(); return me ? me.id : "me"; }
  function elOf(it) {
    var el = R.els[it.id]; if (el) return el;
    if (it.t === "arrow") { el = document.createElementNS(NS, "g"); el.innerHTML = '<path/><polygon/>'; el._svg = true; R.vec.appendChild(el); }
    else if (it.t === "pen") { el = document.createElementNS(NS, "g"); el.innerHTML = "<path/>"; el._svg = true; R.vec.appendChild(el); }
    else if (G.isLine(it)) { el = document.createElementNS(NS, "g"); el.innerHTML = "<line/>"; el._svg = true; R.vec.appendChild(el); }
    else {
      el = document.createElement("div");
      el.innerHTML = (it.t === "frame" ? '<div class="bd-fh"><b></b><span></span></div>' :
        it.t === "section" ? '<div class="bd-sh"><i></i><span></span></div>' :
        it.t === "media" ? '<div class="bd-mw"></div>' :
        it.t === "swatch" ? '<div class="bd-swc"></div><div class="bd-swl"><b></b><span></span></div>' :
        '<div class="bd-tx"></div>') + '<div class="bd-tags"></div><div class="bd-bdg"></div>';
      el._tags = el.children[el.children.length - 2]; el._bdg = el.lastChild;
      R.hl.appendChild(el);
    }
    el._t = it.t;
    R.els[it.id] = el; return el;
  }
  function dimmed(it) { return !!(R.tag && (it.tags || []).indexOf(R.tag) < 0); }
  function paint(it) {
    var el = R.els[it.id];
    if (el && el._t !== it.t) { el.remove(); delete R.els[it.id]; }
    el = elOf(it); var c = G.col(it.c);
    if (el._svg) {
      var cls = "bd-g bd-" + (it.t === "arrow" ? "arrow" : it.t === "pen" ? "pen" : "lineshape") + " bd-c-" + c + (dimmed(it) ? " bd-dim" : "");
      if (el._cls !== cls) { el.setAttribute("class", cls); el._cls = cls; }
      if (it.t === "arrow") {
        var g = G.arrow(it, E.map);
        if (!g) { el.style.display = "none"; return; }
        el.style.display = "";
        el.firstChild.setAttribute("d", G.arrowD(g)); el.lastChild.setAttribute("points", G.headPts(g));
      } else if (it.t === "pen") el.firstChild.setAttribute("d", G.penD(it.pts));
      else { var l = el.firstChild; l.setAttribute("x1", it.x); l.setAttribute("y1", it.y); l.setAttribute("x2", it.x + it.w); l.setAttribute("y2", it.y + it.h); }
      return;
    }
    var noView = it.t === "media" && MD() && !MD().hasView(it);
    var k = "bd-i bd-" + it.t + " bd-c-" + c + (it.t === "shape" ? " bd-" + it.shape : "") + (E.editId === it.id ? " bd-editing" : "") + (it.text || it.t === "media" || it.t === "swatch" ? "" : " bd-empty") + (noView ? " bd-nov" : "") + (dimmed(it) ? " bd-dim" : "");
    if (el._cls !== k) { el.className = k; el._cls = k; }
    el.style.transform = "translate(" + it.x + "px," + it.y + "px)";
    el.style.width = it.w + "px";
    el.style.height = it.t === "text" ? "" : it.h + "px";
    if (it.t === "text") el.style.fontSize = (it.fs || 26) + "px";
    if (it.t === "frame") {
      var fh = el.firstChild; fh.firstChild.textContent = it.n == null ? "" : it.n;
      var sp = fh.lastChild; if (sp.textContent !== (it.text || "")) sp.textContent = it.text || ""; sp.setAttribute("data-ph", t("bd_frame_ph"));
    } else if (it.t === "section") {
      var ss = el.firstChild.lastChild; if (ss.textContent !== (it.text || "")) ss.textContent = it.text || ""; ss.setAttribute("data-ph", t("bd_section_ph"));
    } else if (it.t === "media") paintMedia(el, it);
    else if (it.t === "swatch") {
      var hex = (MD() && MD().validHex(it.hex)) || "";
      el.firstChild.style.background = hex;
      el.children[1].firstChild.textContent = hex;
      el.children[1].children[1].textContent = it.text || "";
    } else {
      var tx = el.querySelector(".bd-tx");
      if (tx.textContent !== (it.text || "")) tx.textContent = it.text || "";
      tx.setAttribute("data-ph", it.t === "note" ? t("bd_note_ph") : it.t === "text" ? t("bd_text_ph") : "");
    }
    paintBadges(el, it);
    if (it.t === "text" && el.isConnected && el.offsetHeight > 0) it.h = el.offsetHeight;
  }
  function paintBadges(el, it) {
    var n = (it.likes || []).length, mine = (it.likes || []).indexOf(meId()) >= 0, tags = (it.tags || []).slice(0, 3);
    var sig = n + "|" + mine + "|" + !!it.lock + "|" + tags.join(",");
    if (el._bsig === sig) return; el._bsig = sig;
    var h = "";
    if (it.lock) h += '<span class="bd-lk" title="' + esc(t("bd_lock")) + '">' + icon("lock") + "</span>";
    if (n && it.t !== "media") h += '<button type="button" class="bd-mbtn" data-a="bd-like" data-id="' + esc(it.id) + '" title="' + esc(t("bd_likes", { n: n })) + '">' + icon("like") + "<span>" + n + "</span></button>";
    el._bdg.innerHTML = h;
    el._tags.innerHTML = tags.map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("");
  }
  function paintMedia(el, it) {
    var M = MD(); if (!M) return;
    var inf = M.info(it), view = M.hasView(it), playing = !!(R.play[it.id] && inf.playable), safe = G.safeUrl(it.url);
    var blobUrl = it.blob && GK.blobs ? GK.blobs.cachedUrl(it.blob) : "";
    var poster = it.prov === "upload" ? blobUrl : inf.poster;
    var missing = it.prov === "upload" && !blobUrl && R.missing[it.blob];
    var sig = [it.prov, it.kind, it.url, it.mid, poster, view, playing, missing, R.lang].join("|");
    var wrap = el.firstChild;
    if (el._msig !== sig) {
      el._msig = sig;
      var h = "", id = esc(it.id);
      if (view) {
        h += '<div class="bd-mv"><div class="bd-mph' + (inf.playable ? " pl" : "") + '">' + (missing ? "<span>" + esc(t("bd_missing_img")) + "</span>" : "<b>" + esc(inf.name) + "</b>" + (G.host(safe) ? "<span>" + esc(G.host(safe)) + "</span>" : "")) + "</div>";
        if (playing) h += inf.video ? '<video class="bd-mfr" src="' + esc(inf.embed) + '" controls autoplay playsinline preload="metadata"></video>'
          : '<iframe class="bd-mfr" src="' + esc(inf.embed) + '" title="' + esc(M.title(it)) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
        else if (poster) h += '<img class="bd-mp" alt="" draggable="false" decoding="async" referrerpolicy="no-referrer" src="' + esc(poster) + '">';
        if (!playing) h += '<span class="bd-mb">' + esc(inf.name) + "</span>";
        if (inf.playable && !playing) h += '<button type="button" class="bd-mbtn bd-mplay" data-a="bd-mplay" data-id="' + id + '" aria-label="' + esc(t("bd_play")) + '" title="' + esc(t("bd_play")) + '">' + icon("play") + "</button>";
        if (playing) h += '<button type="button" class="bd-mbtn bd-mstop" data-a="bd-mstop" data-id="' + id + '" aria-label="' + esc(t("bd_stop")) + '" title="' + esc(t("bd_stop")) + '">' + icon("x") + "</button>";
        else if (inf.image && poster) h += '<button type="button" class="bd-mbtn bd-mzoom" data-a="bd-mzoom" data-id="' + id + '" aria-label="' + esc(t("bd_zoom_img")) + '" title="' + esc(t("bd_zoom_img")) + '">' + icon("expand") + "</button>";
        h += "</div>";
      }
      h += '<div class="bd-mf">' + (view ? "" : '<span class="bd-fav"><span>' + esc((G.host(safe) || "?").charAt(0).toUpperCase()) + "</span>" + (inf.favicon ? '<img alt="" draggable="false" referrerpolicy="no-referrer" src="' + esc(inf.favicon) + '">' : "") + "</span>") +
        '<div class="bd-mtx"><div class="bd-mt"></div><div class="bd-mc"></div></div><span class="bd-mact">' +
        '<button type="button" class="bd-mbtn bd-like" data-a="bd-like" data-id="' + id + '" aria-label="' + esc(t("bd_like")) + '" title="' + esc(t("bd_like")) + '">' + icon("like") + "<span></span></button>" +
        (safe ? '<a class="bd-mbtn bd-mopen" href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t("bd_open_orig")) + '" title="' + esc(t("bd_open_orig")) + '">' + icon("open") + "</a>" : "") + "</span></div>";
      wrap.innerHTML = h;
      el._lk = wrap.querySelector(".bd-like");
      var img = wrap.querySelector(".bd-mp"), fav = wrap.querySelector(".bd-fav img"), vid = wrap.querySelector("video.bd-mfr");
      if (img) { img.onerror = function () { img.remove(); }; img.onload = function () { fixRatio(it.id, img.naturalWidth, img.naturalHeight); }; }
      if (fav) fav.onerror = function () { fav.remove(); };
      if (vid) vid.onloadedmetadata = function () { fixRatio(it.id, vid.videoWidth, vid.videoHeight); };
      if (it.prov === "upload" && it.blob && !blobUrl && !R.missing[it.blob] && GK.blobs) {
        GK.blobs.url(it.blob).then(function (url) {
          if (!url) R.missing[it.blob] = 1;
          var cur = E && E.map[it.id]; if (cur && R.els[it.id] === el) { el._msig = null; paintMedia(el, cur); }
        });
      }
    }
    var tt = wrap.querySelector(".bd-mt"), cc = wrap.querySelector(".bd-mc");
    var title = M.title(it), sub = playing ? t("bd_noplay") : (it.cap || (it.prov === "upload" ? t("bd_local") : G.host(safe)));
    if (tt.textContent !== title) tt.textContent = title;
    if (cc.textContent !== sub) cc.textContent = sub;
    var n = (it.likes || []).length, lk = el._lk;
    if (lk) { lk.lastChild.textContent = n ? n : ""; lk.classList.toggle("on", (it.likes || []).indexOf(meId()) >= 0); }
  }
  /** a picture or video told us its real shape: keep the card true to it (no undo step) */
  function fixRatio(id, w, h) {
    var it = E && E.map[id]; if (!it || !w || !h) return;
    if (!(it.kind === "image" || it.prov === "upload" || it.prov === "video")) return;
    var r = w / h; if (!(r > 0.2 && r < 5)) return;
    if (Math.abs(r - MD().ratioOf(it)) / r < 0.03) return;
    it.ratio = Math.round(r * 10000) / 10000; it.h = MD().heightFor(it, it.w);
    paint(it); paintArrows(); drawSel();
    if (canEdit()) amend(); else E.snap = JSON.stringify(E.items);
  }
  function paintArrows() { E.vec.forEach(function (it) { if (it.t === "arrow") paint(it); }); }
  /** reconcile DOM with the items array. full = repaint everything. */
  function sync(full) {
    if (!R) return;
    reindex();
    var seen = {};
    E.items.forEach(function (it) {
      seen[it.id] = 1;
      var el = R.els[it.id], sig = it.t === "arrow" ? null : JSON.stringify(it) + (R.lang || "") + R.tag;
      if (full || !el || el._sig !== sig || it.t === "arrow") { paint(it); R.els[it.id]._sig = sig; }
    });
    Object.keys(R.els).forEach(function (id) { if (!seen[id]) { R.els[id].remove(); delete R.els[id]; delete R.play[id]; } });
    E.flat.forEach(function (it, i) { var el = R.els[it.id]; if (R.hl.children[i] !== el) R.hl.insertBefore(el, R.hl.children[i] || null); });
    E.vec.forEach(function (it, i) { var el = R.els[it.id]; if (R.vec.children[i] !== el) R.vec.insertBefore(el, R.vec.children[i] || null); });
    miniSoon();
  }
  function bboxOf(it) { return G.bbox(it, E.map); }
  function resizable(it) { return it && !it.lock && (it.t === "note" || it.t === "text" || it.t === "frame" || it.t === "section" || it.t === "media" || it.t === "swatch" || (it.t === "shape" && !G.isLine(it))); }
  function handlePos(it) { return G.isLine(it) ? [it.x + it.w, it.y + it.h] : (function (b) { return [b.x + b.w, b.y + b.h]; })(bboxOf(it)); }
  function drawSel() {
    if (!R || !E) return;
    var h = "", groups = {};
    E.sel.forEach(function (id) {
      var it = E.map[id], b = it && bboxOf(it); if (!b) return;
      if (it.g) groups[it.g] = 1;
      var pad = it.t === "pen" || it.t === "arrow" || G.isLine(it) ? 6 : 0;
      h += '<div class="bd-sel' + (pad ? " dash" : "") + '" style="left:' + (b.x - pad) + "px;top:" + (b.y - pad) + "px;width:" + (b.w + pad * 2) + "px;height:" + (b.h + pad * 2) + 'px"></div>';
    });
    Object.keys(groups).forEach(function (g) {
      var bb = unionBox(E.items.filter(function (i) { return i.g === g; })); if (!bb) return;
      h += '<div class="bd-sel grp" style="left:' + (bb.x - 8) + "px;top:" + (bb.y - 8) + "px;width:" + (bb.w + 16) + "px;height:" + (bb.h + 16) + 'px"></div>';
    });
    if (E.sel.length === 1 && canEdit()) {
      var one = E.map[E.sel[0]];
      if (resizable(one) || (G.isLine(one) && !one.lock)) { var hp = handlePos(one), hs = 7 / E.view.z; h += '<div class="bd-hnd" style="left:' + (hp[0] - hs) + "px;top:" + (hp[1] - hs) + 'px"></div>'; }
    }
    R.ov.innerHTML = h;
  }
  function unionBox(list) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(function (it) { var b = bboxOf(it); if (!b) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y - G.top(it)); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    return x0 > x1 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  var viewRaf = 0;
  function applyView() {
    if (!R || viewRaf) return;
    viewRaf = requestAnimationFrame(function () {
      viewRaf = 0; if (!E) return;
      var v = E.view;
      R.world.style.transform = "translate(" + v.x + "px," + v.y + "px) scale(" + v.z + ")";
      R.world.style.setProperty("--z", v.z);
      var gs = 24 * v.z; while (gs < 14) gs *= 2;
      var pat = R.pat; pat.setAttribute("width", gs); pat.setAttribute("height", gs);
      pat.setAttribute("x", ((v.x - gs / 2) % gs + gs) % gs); pat.setAttribute("y", ((v.y - gs / 2) % gs + gs) % gs);
      R.dot.setAttribute("cx", gs / 2); R.dot.setAttribute("cy", gs / 2);
      R.zl.textContent = Math.round(v.z * 100) + "%";
      drawMini();
    });
  }
  function setView(x, y, z) { E.view.x = x; E.view.y = y; E.view.z = Math.max(0.1, Math.min(4, z)); E.viewDirty = true; applyView(); }
  function zoomAt(f, cx, cy) {
    var v = E.view, z = Math.max(0.1, Math.min(4, v.z * f)), wx = (cx - v.x) / v.z, wy = (cy - v.y) / v.z;
    setView(cx - wx * z, cy - wy * z, z);
  }
  function fitBox(bb, maxZ) {
    var W = R.cv.clientWidth, H = R.cv.clientHeight; if (!W || !H) return;
    if (!bb) { setView(60, 60, 1); return; }
    var bw = Math.max(1, bb.w), bh = Math.max(1, bb.h), z = Math.max(0.1, Math.min(maxZ || 1.5, (W - 80) / bw, (H - 80) / bh));
    setView((W - bw * z) / 2 - bb.x * z, (H - bh * z) / 2 - bb.y * z, z);
  }
  function fit() { if (E && R) fitBox(unionBox(E.items)); }
  function fitSel() { if (E && R) { var s = selItems(); if (s.length) fitBox(unionBox(s), 2); else fit(); } }

  // ---------- minimap ----------
  var miniRaf = 0;
  function miniSoon() { if (!R || miniRaf) return; miniRaf = requestAnimationFrame(function () { miniRaf = 0; drawMini(); }); }
  function cssVar(name, fb) { var v = getComputedStyle(R.root).getPropertyValue(name).trim(); return v || (fb ? getComputedStyle(R.root).getPropertyValue(fb).trim() : "") || "gray"; }
  function drawMini() {
    if (!R || !E) return;
    var cv = R.mini, on = miniOn();
    cv.hidden = !on; if (!on || !R.cv.clientWidth) return;
    var W = cv.clientWidth || 200, H = cv.clientHeight || 132, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var cx = cv.getContext("2d"); if (!cx) return;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    var v = E.view, vw = { x: -v.x / v.z, y: -v.y / v.z, w: R.cv.clientWidth / v.z, h: R.cv.clientHeight / v.z };
    var bb = unionBox(E.items) || vw;
    var x0 = Math.min(bb.x, vw.x), y0 = Math.min(bb.y, vw.y), x1 = Math.max(bb.x + bb.w, vw.x + vw.w), y1 = Math.max(bb.y + bb.h, vw.y + vw.h);
    var pad = 8, s = Math.min((W - pad * 2) / Math.max(1, x1 - x0), (H - pad * 2) / Math.max(1, y1 - y0));
    var ox = pad + ((W - pad * 2) - (x1 - x0) * s) / 2 - x0 * s, oy = pad + ((H - pad * 2) - (y1 - y0) * s) / 2 - y0 * s;
    R.miniT = { s: s, ox: ox, oy: oy };
    var col = { gel: cssVar("--gel"), chroma: cssVar("--chroma"), item: cssVar("--tx-3", "--ink-3"), box: cssVar("--line-2"), view: cssVar("--chroma") };
    E.flat.forEach(function (it) {
      var b = bboxOf(it); if (!b) return;
      if (G.isBox(it)) { cx.strokeStyle = col.box; cx.lineWidth = 1; cx.strokeRect(ox + b.x * s, oy + b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s)); return; }
      cx.fillStyle = it.t === "note" && it.c === "gel" ? col.gel : it.t === "note" && it.c === "chroma" ? col.chroma : it.t === "swatch" ? (MD().validHex(it.hex) || col.item) : col.item;
      cx.globalAlpha = dimmed(it) ? 0.25 : 0.9;
      cx.fillRect(ox + b.x * s, oy + b.y * s, Math.max(1.5, b.w * s), Math.max(1.5, b.h * s));
      cx.globalAlpha = 1;
    });
    cx.strokeStyle = col.view; cx.lineWidth = 1.5;
    cx.strokeRect(ox + vw.x * s, oy + vw.y * s, vw.w * s, vw.h * s);
  }
  function miniOn() { return P.mini == null ? window.innerWidth > 860 : !!P.mini; }
  function miniGo(ev) {
    if (!R.miniT) return;
    var r = R.mini.getBoundingClientRect(), T = R.miniT;
    var wx = (ev.clientX - r.left - T.ox) / T.s, wy = (ev.clientY - r.top - T.oy) / T.s;
    setView(R.cv.clientWidth / 2 - wx * E.view.z, R.cv.clientHeight / 2 - wy * E.view.z, E.view.z);
  }

  // ---------- selection & bar ----------
  function setSel(ids) { E.sel = ids; drawSel(); syncBar(); }
  function selItems() { return E.sel.map(function (id) { return E.map[id]; }).filter(Boolean); }
  /** an item and the rest of its group */
  function withGroup(it) { return it.g ? E.items.filter(function (i) { return i.g === it.g; }).map(function (i) { return i.id; }) : [it.id]; }
  function allTags() { var o = {}; E.items.forEach(function (i) { (i.tags || []).forEach(function (s) { o[s] = 1; }); }); return Object.keys(o).sort(); }
  function syncBar() {
    if (!R || !E) return;
    var ed = canEdit(), sel = selItems(), first = sel[0];
    R.root.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tool === E.tool)); });
    var cur = first ? G.col(first.c) : P.color;
    R.root.querySelectorAll("[data-col]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.col === cur)); });
    function dis(k, v) { var b = R.root.querySelector('[data-k="' + k + '"]'); if (b) b.disabled = !!v; }
    var movable = sel.filter(function (i) { return i.t !== "arrow"; });
    dis("undo", !E.undo.length); dis("redo", !E.redo.length);
    dis("dup", !sel.length); dis("del", !sel.length); dis("lock", !sel.length); dis("like", !sel.length || sel.length > 1);
    dis("group", movable.length < 2 && !sel.some(function (i) { return i.g; }));
    dis("details", sel.length !== 1);
    dis("palette", !(sel.length === 1 && first.t === "media" && (first.kind === "image" || first.prov === "upload" || first.poster || first.prov === "youtube" || first.prov === "drive")));
    dis("edit", !(sel.length === 1 && (["note", "text", "frame", "section", "media", "swatch"].indexOf(sel[0].t) >= 0 || (sel[0].t === "shape" && !G.isLine(sel[0])))));
    var hasText = sel.some(function (i) { return i.t === "text"; });
    dis("smaller", !hasText); dis("bigger", !hasText);
    var gb = R.root.querySelector('[data-k="group"]');
    if (gb) { var ug = sel.length && sel.every(function (i) { return i.g && i.g === sel[0].g; }); gb.setAttribute("data-t", ug ? "bd_ungroup" : "bd_group"); gb.title = t(ug ? "bd_ungroup" : "bd_group"); gb.setAttribute("aria-label", gb.title); }
    var lb = R.root.querySelector('[data-k="lock"]'); if (lb) lb.setAttribute("aria-pressed", String(!!sel.length && sel.every(function (i) { return i.lock; })));
    var sn = R.root.querySelector('[data-k="snap"]'); if (sn) sn.setAttribute("aria-pressed", String(P.snapOn));
    var mn = R.root.querySelector('[data-k="mini"]'); if (mn) mn.setAttribute("aria-pressed", String(miniOn()));
    var tags = allTags(), sig = tags.join("|") + R.lang;
    if (R.ftag._sig !== sig) {
      R.ftag._sig = sig;
      R.ftag.innerHTML = '<option value="">' + esc(t("bd_all_tags")) + "</option>" + tags.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + "</option>"; }).join("");
    }
    if (R.tag && tags.indexOf(R.tag) < 0) { R.tag = ""; sync(true); }
    R.ftag.value = R.tag; R.ftag.hidden = !tags.length;
    R.hint.hidden = !E.items.some(function (i) { return i.t === "media" && i.prov === "upload"; });
    R.root.classList.toggle("bd-ro", !ed);
    R.cv.className = "bd-cv tool-" + E.tool + (E.gest && E.gest.type === "pan" ? " panning" : "");
    R.ro.hidden = ed;
    R.remote.hidden = !E.remote;
  }
  function setTool(tool) {
    if (!E) return;
    endEdit(); E.tool = tool; E.arrowFrom = null; syncBar();
  }

  // ---------- item operations ----------
  function snapV(v) { return P.snapOn ? Math.round(v / GRID) * GRID : Math.round(v); }
  function penCount() { return E.items.filter(function (i) { return i.t === "pen"; }).length; }
  function countFlat() { return E.items.filter(function (i) { return i.t !== "arrow"; }).length; }
  function addItem(o) {
    if (countFlat() >= MAX_ITEMS) { ui.toast(t("bd_cap_items")); return null; }
    o.id = u.uid("i"); o.z = G.isBox(o) ? minZ() : nextZ();
    E.items.push(o); reindex(); paint(o); R.els[o.id]._sig = null; return o;
  }
  function removeIds(ids) {
    var gone = {}; ids.forEach(function (id) { gone[id] = 1; });
    E.items.forEach(function (i) { if (i.t === "arrow" && (gone[i.from.id] || gone[i.to.id])) gone[i.id] = 1; });
    E.items = E.items.filter(function (i) { return !gone[i.id]; });
    Object.keys(gone).forEach(function (id) { if (R.els[id]) { R.els[id].remove(); delete R.els[id]; } delete R.play[id]; });
    reindex(); E.sel = E.sel.filter(function (id) { return !gone[id]; });
  }
  function deleteSel() {
    if (!canEdit() || !E.sel.length) return;
    endEdit();
    var ids = selItems().filter(function (i) { return !i.lock; }).map(function (i) { return i.id; });
    if (ids.length < E.sel.length) ui.toast(t("bd_locked"));
    if (!ids.length) return;
    removeIds(ids); paintArrows(); drawSel(); commit(); syncBar();
  }
  /** copies of items (and the arrows between them), offset by dx,dy, with fresh ids and groups; returns the new ids */
  function cloneIn(src, dx, dy) {
    var all = src.filter(function (i) { return i.t !== "arrow"; }), map = {}, gmap = {}, made = [];
    if (countFlat() + all.length > MAX_ITEMS) { ui.toast(t("bd_cap_items")); return null; }
    if (penCount() + all.filter(function (i) { return i.t === "pen"; }).length > MAX_PEN) { ui.toast(t("bd_cap_pen")); return null; }
    var z = nextZ(), zb = minZ();
    all.slice().sort(u.by("z")).forEach(function (it) {
      var c = u.clone(it); c.id = u.uid("i"); c.z = G.isBox(c) ? zb-- : z++; map[it.id] = c.id;
      if (c.g) { gmap[c.g] = gmap[c.g] || u.uid("g"); c.g = gmap[c.g]; }
      delete c.lock;
      if (c.t === "pen") c.pts = c.pts.map(function (p) { return [p[0] + dx, p[1] + dy]; }); else { c.x += dx; c.y += dy; }
      E.items.push(c); made.push(c.id);
    });
    src.filter(function (i) { return i.t === "arrow" && map[i.from.id] && map[i.to.id]; }).forEach(function (a) {
      var c = u.clone(a); c.id = u.uid("i"); c.z = z++; c.from.id = map[a.from.id]; c.to.id = map[a.to.id]; E.items.push(c);
    });
    return made;
  }
  function selWithArrows() {
    var ids = {}; E.sel.forEach(function (id) { ids[id] = 1; });
    return E.items.filter(function (i) { return ids[i.id] || (i.t === "arrow" && ids[i.from.id] && ids[i.to.id]); });
  }
  function duplicateSel() {
    if (!canEdit() || !E.sel.length) return;
    endEdit();
    var src = selWithArrows(), made = cloneIn(src, 24, 24); if (!made) return;
    E.items.forEach(function (i) { if (made.indexOf(i.id) >= 0 && i.t === "frame") i.n = (i.n || 0) + 1; });
    sync(false); setSel(made); commit();
  }
  function colourSel(c) {
    P.color = c; u.lsSet("gecko-bd-color", c);
    var sel = selItems().filter(function (i) { return !i.lock; });
    if (sel.length && canEdit()) { sel.forEach(function (i) { i.c = c; }); sync(false); commit(); }
    syncBar();
  }
  function textSize(d) {
    selItems().forEach(function (i) { if (i.t === "text" && !i.lock) i.fs = Math.max(14, Math.min(96, (i.fs || 26) + d)); });
    sync(true); drawSel(); commit("fs");
  }
  function renumber() {
    var fr = E.items.filter(function (i) { return i.t === "frame"; }).sort(function (a, b) { return Math.abs(a.y - b.y) > 120 ? a.y - b.y : a.x - b.x; });
    fr.forEach(function (f, i) { f.n = i + 1; }); sync(false); commit();
  }
  function shift(it, dx, dy) { if (it.t === "pen") it.pts = it.pts.map(function (p) { return [p[0] + dx, p[1] + dy]; }); else if (it.t !== "arrow") { it.x += dx; it.y += dy; } }
  function nudge(dx, dy) {
    var mv = selItems().filter(function (i) { return i.t !== "arrow" && !i.lock; });
    if (!mv.length || !canEdit()) return;
    mv.forEach(function (i) { shift(i, dx, dy); });
    sync(false); drawSel(); commit("nudge");
  }
  /** what sits inside a frame or section (centre inside), not locked, not arrows */
  function contents(f) {
    var area = f.w * f.h;
    return E.flat.concat(E.vec).filter(function (it) {
      if (it.id === f.id || it.t === "arrow" || it.lock) return false;
      if (G.isBox(it) && it.w * it.h >= area) return false;
      var b = bboxOf(it); if (!b) return false;
      var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      return cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h;
    });
  }
  function toggleLike(id) {
    var it = E && E.map[id]; if (!it) return;
    if (!canEdit()) return ui.toast(t("bd_hint_ro"));
    var me = meId(), l = (it.likes || []).slice(), i = l.indexOf(me);
    if (i >= 0) l.splice(i, 1); else l.push(me);
    if (l.length) it.likes = l; else delete it.likes;
    paint(it); commit();
  }

  // ---------- text editing ----------
  function startEdit(it) {
    if (!canEdit() || !it) return;
    if (it.lock) return ui.toast(t("bd_locked"));
    if (it.t === "media" || it.t === "swatch") return detailsModal(it);
    if (["note", "text", "frame", "section", "shape"].indexOf(it.t) < 0 || G.isLine(it)) return;
    endEdit();
    var el = R.els[it.id]; if (!el) return;
    E.editId = it.id; setSel([it.id]);
    el.classList.add("bd-editing");
    var ta = document.createElement("textarea");
    ta.className = "bd-edit"; ta.value = it.text || ""; ta.maxLength = G.isBox(it) ? 80 : 1200; ta.rows = 1;
    ta.setAttribute("aria-label", t("bd_edit")); ta.setAttribute("spellcheck", "false");
    el.appendChild(ta); R.ta = ta; E.selRange = [ta.value.length, ta.value.length];
    function remember() { E.selRange = [ta.selectionStart, ta.selectionEnd]; }
    ta.addEventListener("input", function () {
      it.text = ta.value;
      var tx = el.querySelector(".bd-tx"); if (tx) tx.textContent = it.text;
      el.classList.toggle("bd-empty", !it.text);
      if (it.t === "note" || it.t === "text") {
        ta.style.height = "0"; var need = ta.scrollHeight + (it.t === "note" ? 2 : 0); ta.style.height = "";
        if (it.t === "text") { it.h = Math.max(Math.ceil((it.fs || 26) * 1.3), need); ta.style.height = it.h + "px"; }
        else if (need > it.h) { it.h = need; el.style.height = need + "px"; }
        drawSel();
      }
      remember(); markDirty();
    });
    ["select", "keyup", "click", "pointerup"].forEach(function (ev) { ta.addEventListener(ev, remember); });
    ta.addEventListener("keydown", function (ev) {
      ev.stopPropagation();
      if (ev.key === "Escape" || (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey || G.isBox(it)))) { ev.preventDefault(); ta.blur(); }
    });
    ta.addEventListener("paste", function (ev) { ev.stopPropagation(); });
    ta.addEventListener("blur", function () { if (E && E.editId === it.id && R.ta === ta) endEdit(); });
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length); remember();
  }
  function endEdit() {
    if (!E || !E.editId) return;
    var id = E.editId, ta = R && R.ta; E.editId = ""; if (R) R.ta = null;
    var it = E.map[id], el = R && R.els[id];
    if (ta && ta.parentNode) ta.remove();
    if (el) el.classList.remove("bd-editing");
    if (it && it.t === "text" && !String(it.text || "").trim()) { removeIds([id]); paintArrows(); }
    else if (it) { it.text = String(it.text || "").slice(0, 1200); paint(it); }
    drawSel(); commit("text"); syncBar();
    // the core holds store updates back while a text field is focused and only replays them on focusout,
    // which never reaches the document when the field is removed from the page: replay them ourselves
    if (ta) setTimeout(function () { ui.render(); }, 0);
  }

  // ---------- modals: add a link, details, swatch ----------
  function viewCentre() { return s2w([R.cv.clientWidth / 2, R.cv.clientHeight / 2]); }
  /** where pasted things land: under the pointer when it is on the canvas, else the middle of the view */
  function landing() { return E.hover && Date.now() - E.hover.t < 30000 ? [E.hover.x, E.hover.y] : viewCentre(); }
  function linkModal(pos) {
    if (!canEdit()) return;
    var at = pos || landing();
    ui.modal({
      title: t("bd_add_link_t"),
      body: '<p class="small muted" style="margin:0">' + esc(t("bd_add_link_h")) + "</p>" +
        '<div class="form">' + ui.field({ id: "bd-l-url", label: t("bd_det_url"), value: "", placeholder: "https://", span: true }) +
        ui.field({ id: "bd-l-title", label: t("bd_det_title"), value: "" }) + ui.field({ id: "bd-l-cap", label: t("bd_det_cap"), value: "" }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("bd_add_link"), "bd-link-save", { cls: "primary", data: { x: Math.round(at[0]), y: Math.round(at[1]) } })
    });
  }
  GK.act("bd-link-save", function (el) {
    var url = MD().normUrl(u.val("bd-l-url"));
    if (!url) { u.focus("bd-l-url"); return ui.toast(t("bd_link_bad")); }
    var title = u.val("bd-l-title").trim().slice(0, 120), cap = u.val("bd-l-cap").trim().slice(0, 240);
    ui.closeModal(true);
    if (!E) return;
    var made = addUrls([url], [+el.dataset.x || 0, +el.dataset.y || 0], { text: title, cap: cap });
    if (made.length) setTool("select");
    ui.render(true);
  });
  function parseTags(s) { return strList(String(s || "").split(","), 8, 24).map(function (x) { return x.toLowerCase(); }); }
  function detailsModal(it) {
    if (!it) return;
    if (!canEdit()) return;
    var body = '<div class="form">';
    if (it.t === "media") {
      if (it.prov !== "upload") body += ui.field({ id: "bd-d-url", label: t("bd_det_url"), value: it.url || "", span: true });
      body += ui.field({ id: "bd-d-title", label: t("bd_det_title"), value: it.text || "", placeholder: MD().title(it) }) + ui.field({ id: "bd-d-cap", label: t("bd_det_cap"), value: it.cap || "" });
    } else if (it.t === "swatch") {
      body += ui.field({ id: "bd-d-hex", label: t("bd_det_colour"), type: "color", value: (MD().validHex(it.hex) || "#3946EC").toLowerCase() }) + ui.field({ id: "bd-d-name", label: t("bd_det_name"), value: it.text || "" });
    }
    body += ui.field({ id: "bd-d-tags", label: t("bd_det_tags"), value: (it.tags || []).join(", "), placeholder: "hero, warm, ugc", span: true }) + "</div>";
    ui.modal({ title: it.t === "swatch" ? t("bd_swatch_t") : t("bd_det_t"), body: body, foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("save"), "bd-det-save", { cls: "primary", data: { id: it.id } }) });
  }
  GK.act("bd-det-save", function (el) {
    var it = E && E.map[el.dataset.id]; if (!it) return ui.closeModal(true);
    if (it.t === "media" && it.prov !== "upload") {
      var url = MD().normUrl(u.val("bd-d-url"));
      if (!url) { u.focus("bd-d-url"); return ui.toast(t("bd_link_bad")); }
      if (url !== it.url) {
        var p = MD().parse(url);
        it.url = p.url; it.prov = p.prov; it.kind = p.kind; it.mid = p.mid; it.ratio = Math.round(p.ratio * 10000) / 10000; delete it.poster; delete R.play[it.id];
        it.h = MD().heightFor(it, it.w);
      }
    }
    if (it.t === "media") { it.text = u.val("bd-d-title").trim().slice(0, 120); it.cap = u.val("bd-d-cap").trim().slice(0, 240); if (!it.cap) delete it.cap; }
    if (it.t === "swatch") { it.hex = MD().validHex(u.val("bd-d-hex")) || it.hex; it.text = u.val("bd-d-name").trim().slice(0, 40); }
    var tags = parseTags(u.val("bd-d-tags")); if (tags.length) it.tags = tags; else delete it.tags;
    ui.closeModal(true);
    paint(it); paintArrows(); drawSel(); commit(); enrich(it.id);
    ui.render(true);
  });
  function swatchModal() {
    if (!canEdit()) return;
    var at = landing();
    ui.modal({
      title: t("bd_swatch_t"),
      body: '<div class="form">' + ui.field({ id: "bd-s-hex", label: t("bd_det_colour"), type: "color", value: "#3946ec" }) + ui.field({ id: "bd-s-name", label: t("bd_det_name"), value: "" }) + "</div>",
      foot: ui.btn(t("cancel"), "close", { cls: "ghost" }) + ui.btn(t("bd_add_link"), "bd-sw-save", { cls: "primary", data: { x: Math.round(at[0]), y: Math.round(at[1]) } })
    });
  }
  GK.act("bd-sw-save", function (el) {
    var hex = MD().validHex(u.val("bd-s-hex")); if (!hex) return u.focus("bd-s-hex");
    var name = u.val("bd-s-name").trim().slice(0, 40);
    ui.closeModal(true); if (!E) return;
    var s = G.SIZE.swatch, n = addItem({ t: "swatch", x: snapV(+el.dataset.x - s[0] / 2), y: snapV(+el.dataset.y - s[1] / 2), w: s[0], h: s[1], hex: hex, text: name, c: "bounce" });
    if (n) { setSel([n.id]); commit(); }
    ui.render(true);
  });

  // ---------- media: links, uploads, paste, drop, copy ----------
  /** nudge a new card off a spot where another card already sits at the same corner (repeated pastes cascade) */
  function freeSpot(it) {
    for (var n = 0; n < 40 && E.items.some(function (o) { return o.t !== "arrow" && o.t !== "pen" && !G.isBox(o) && Math.abs(o.x - it.x) < 12 && Math.abs(o.y - it.y) < 12; }); n++) { it.x += 24; it.y += 24; }
  }
  /** add media cards for urls around a point; returns their ids */
  function addUrls(urls, at, extra) {
    if (!canEdit() || !MD()) return [];
    var made = [], x = at[0], y = at[1], gap = 24, list = [];
    urls.forEach(function (url) { var it = MD().make(url, 0, 0, extra); if (it) list.push(it); });
    if (!list.length) return [];
    var total = list.reduce(function (s, it) { return s + it.w; }, 0) + gap * (list.length - 1), cx = x - total / 2;
    list.forEach(function (it) {
      it.x = snapV(cx); it.y = snapV(y - it.h / 2); cx += it.w + gap; freeSpot(it);
      var n = addItem(it); if (n) made.push(n.id);
    });
    if (made.length) { setSel(made); commit(); made.forEach(enrich); if (made.length > 1) ui.toast(t("bd_added", { n: made.length })); }
    return made;
  }
  /** ask GK.linkPreview for a title and picture; folds into the current undo step */
  function enrich(id) {
    var it = E && E.map[id]; if (!it || !MD() || !MD().wantsPreview(it) || !GK.linkPreview) return;
    var url = it.url;
    GK.linkPreview(url).then(function (p) {
      var cur = E && E.map[id]; if (!p || !cur || cur.url !== url) return;
      var ch = false;
      if (p.title && !cur.text) { cur.text = p.title.slice(0, 120); ch = true; }
      if (p.image && !cur.poster && cur.prov !== "youtube" && cur.prov !== "drive") {
        var hadView = MD().hasView(cur); cur.poster = p.image;
        if (cur.kind === "link" && !hadView) { cur.ratio = 1.91; cur.w = Math.max(cur.w, 300); cur.h = MD().heightFor(cur, cur.w); }
        ch = true;
      }
      if (ch) { paint(cur); paintArrows(); drawSel(); amend(); }
    });
  }
  var localTold = false;
  function uploadFiles(files, at) {
    if (!canEdit() || !MD()) return;
    var imgs = [].slice.call(files || []).filter(function (f) { return f && /^image\//.test(f.type || ""); });
    if (!imgs.length) { if (files && files.length) ui.toast(t("bd_up_bad")); return; }
    var x = at[0], made = [], left = imgs.length;
    imgs.slice(0, 24).forEach(function (f, i) {
      MD().ingest(f).then(function (r) {
        if (!E) return;
        var it = { t: "media", x: 0, y: 0, w: 0, h: 0, url: "", prov: "upload", kind: "image", mid: "", blob: r.id, ratio: Math.round(r.w / r.h * 10000) / 10000, text: r.name || "", c: "bounce" };
        it.w = r.w >= r.h ? 320 : 240; it.h = MD().heightFor(it, it.w);
        it.x = snapV(x + i * 24 - it.w / 2); it.y = snapV(at[1] + i * 24 - it.h / 2); freeSpot(it);
        var n = addItem(it); if (n) made.push(n.id);
      }, function () { ui.toast(t("bd_up_fail")); }).then(function () {
        if (--left) return;
        if (made.length && E) { setSel(made); commit(); syncBar(); if (!localTold) { localTold = true; ui.toast(t("bd_local_t")); } }
      });
    });
  }
  /** a pasted or dropped text: only links -> media cards; an <img> in html -> image card; any other text -> a note */
  function handleText(text, html, at) {
    var urls = MD().urlsIn(String(text || "").split(/\r?\n/).filter(function (l) { return l.charAt(0) !== "#"; }).join("\n"));
    if (!urls.length && html) { var mm = /<img[^>]+src=["'](https?:[^"']+)["']/i.exec(html); if (mm && MD().normUrl(mm[1].replace(/&amp;/g, "&"))) urls = [MD().normUrl(mm[1].replace(/&amp;/g, "&"))]; }
    if (urls.length) return addUrls(urls, at).length > 0;
    text = String(text || "").trim(); if (!text) return false;
    var s = G.SIZE.note, n = addItem({ t: "note", x: snapV(at[0] - s[0] / 2), y: snapV(at[1] - s[1] / 2), w: Math.max(s[0], Math.min(320, text.length * 4)), h: s[1], text: text.slice(0, 1200), c: P.color });
    if (n) { setSel([n.id]); commit(); }
    return !!n;
  }
  function pasteItems(json, at) {
    var data; try { data = JSON.parse(json); } catch (e) { return false; }
    var src = cleanItems(data && data.items); if (!src.length) return false;
    var bb = unionBox(src.filter(function (i) { return i.t !== "arrow"; }).map(function (i) { return i; })) || { x: 0, y: 0, w: 0, h: 0 };
    var map = {}; src.forEach(function (i) { map[i.id] = i; });
    // bbox of arrows needs the source map; boxes only for the rest
    var dx = Math.round(at[0] - (bb.x + bb.w / 2)), dy = Math.round(at[1] - (bb.y + bb.h / 2));
    var made = cloneIn(src, dx, dy); if (!made) return false;
    sync(false); setSel(made); commit();
    return true;
  }
  function typing(el) { var tag = el && el.tagName; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el && el.isContentEditable); }
  function active() { return !!(E && R && R.root.isConnected && ui.state.view === "boards" && !ui.modalOpen()); }
  document.addEventListener("paste", function (ev) {
    if (!active() || typing(ev.target) || !canEdit()) return;
    var cd = ev.clipboardData; if (!cd) return;
    var custom = ""; try { custom = cd.getData("application/x-gk-board"); } catch (e) {}
    var at = landing();
    if (custom && pasteItems(custom, at)) { ev.preventDefault(); return; }
    var files = [].slice.call(cd.files || []);
    if (!files.length && cd.items) [].forEach.call(cd.items, function (x) { if (x.kind === "file") { var f = x.getAsFile(); if (f) files.push(f); } });
    files = files.filter(function (f) { return /^image\//.test(f.type || ""); });
    if (files.length) { ev.preventDefault(); uploadFiles(files, at); return; }
    if (handleText(cd.getData("text/uri-list") || cd.getData("text/plain"), cd.getData("text/html"), at)) ev.preventDefault();
  });
  function onCopy(ev, cut) {
    if (!active() || typing(ev.target) || !E.sel.length) return;
    var sel = window.getSelection && window.getSelection(); if (sel && String(sel)) return;
    var items = selWithArrows();
    try {
      ev.clipboardData.setData("application/x-gk-board", JSON.stringify({ v: 3, items: items }));
      ev.clipboardData.setData("text/plain", items.map(function (i) { return i.t === "media" ? (i.url || MD().title(i)) : i.t === "swatch" ? i.hex : (i.text || ""); }).filter(Boolean).join("\n"));
      ev.preventDefault();
    } catch (e) { return; }
    if (cut && canEdit()) deleteSel();
  }
  document.addEventListener("copy", function (ev) { onCopy(ev, false); });
  document.addEventListener("cut", function (ev) { onCopy(ev, true); });
  function dropKinds(dt) { var ty = [].slice.call((dt && dt.types) || []); return ty.indexOf("Files") >= 0 || ty.indexOf("text/uri-list") >= 0 || ty.indexOf("text/plain") >= 0 || ty.indexOf("text/html") >= 0; }
  function onDragOver(ev) {
    if (!E || !canEdit() || !dropKinds(ev.dataTransfer)) return;
    ev.preventDefault(); try { ev.dataTransfer.dropEffect = "copy"; } catch (e) {}
    R.root.classList.add("bd-drop");
  }
  function onDrop(ev) {
    R.root.classList.remove("bd-drop");
    if (!E || !canEdit()) return;
    ev.preventDefault();
    R.rect = R.cv.getBoundingClientRect();
    var at = s2w(localPt(ev)), dt = ev.dataTransfer; if (!dt) return;
    var files = [].slice.call(dt.files || []);
    if (files.length) return uploadFiles(files, at);
    handleText(dt.getData("text/uri-list") || dt.getData("text/plain"), dt.getData("text/html"), at);
  }

  // ---------- hit testing ----------
  function hitVec(it, x, y, tol) {
    var b = bboxOf(it); if (!b) return false;
    if (x < b.x - tol - 6 || x > b.x + b.w + tol + 6 || y < b.y - tol - 6 || y > b.y + b.h + tol + 6) return false;
    if (it.t === "pen") {
      var p = it.pts; if (p.length === 1) return Math.hypot(x - p[0][0], y - p[0][1]) < tol + 4;
      for (var i = 1; i < p.length; i++) if (G.segDist(x, y, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]) < tol + 4) return true;
      return false;
    }
    if (it.t === "arrow") {
      var g = G.arrow(it, E.map); if (!g) return false;
      var prev = G.bez(g, 0);
      for (var s = 1; s <= 24; s++) { var q = G.bez(g, s / 24); if (G.segDist(x, y, prev[0], prev[1], q[0], q[1]) < tol + 4) return true; prev = q; }
      return false;
    }
    return G.segDist(x, y, it.x, it.y, it.x + it.w, it.y + it.h) < tol + 4;
  }
  function hitFlat(it, x, y, tol) {
    var b = bboxOf(it);
    if (G.isBox(it)) {
      var inBox = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
      if (it.t === "frame" && x >= b.x && x <= b.x + b.w && y >= b.y - 28 && y <= b.y) return true;
      if (it.t === "section" && inBox && y <= b.y + SEC_H) return true;
      if (E.sel.indexOf(it.id) >= 0 && inBox) return true;
      var inner = x >= b.x + tol + 2 && x <= b.x + b.w - tol - 2 && y >= b.y + tol + 2 && y <= b.y + b.h - tol - 2;
      return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol && !inner;
    }
    if (it.t === "shape" && it.shape === "ellipse") {
      var rx = b.w / 2 || 1, ry = b.h / 2 || 1, dx = (x - (b.x + rx)) / rx, dy = (y - (b.y + ry)) / ry;
      return dx * dx + dy * dy <= 1;
    }
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }
  function hit(x, y, tol) {
    var i;
    for (i = E.vec.length - 1; i >= 0; i--) if (!dimmed(E.vec[i]) && hitVec(E.vec[i], x, y, tol)) return E.vec[i];
    for (i = E.flat.length - 1; i >= 0; i--) if (!dimmed(E.flat[i]) && hitFlat(E.flat[i], x, y, tol)) return E.flat[i];
    return null;
  }
  function hitConnectable(x, y, tol) {
    for (var i = E.flat.length - 1; i >= 0; i--) {
      var it = E.flat[i], b = bboxOf(it);
      if (G.isBox(it) ? (x >= b.x && x <= b.x + b.w && y >= b.y - G.top(it) && y <= b.y + b.h) : hitFlat(it, x, y, tol)) return it;
    }
    return null;
  }
  function s2w(p) { return [(p[0] - E.view.x) / E.view.z, (p[1] - E.view.y) / E.view.z]; }
  function w2s(p) { return [p[0] * E.view.z + E.view.x, p[1] * E.view.z + E.view.y]; }
  function localPt(ev) { var r = R.rect || R.cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }

  // ---------- gestures ----------
  function abortGesture() {
    var g = E.gest; E.gest = null;
    if (!g) return;
    if (["drag", "resize", "pen", "erase", "create"].indexOf(g.type) >= 0) { E.items = JSON.parse(E.snap); sync(false); reindex(); E.sel = E.sel.filter(function (id) { return E.map[id]; }); drawSel(); }
    hideTmp();
  }
  function hideTmp() { R.tmp.innerHTML = ""; R.guides.innerHTML = ""; R.prev.hidden = true; R.marq.hidden = true; syncBar(); }
  function startPinch() {
    abortGesture();
    var ids = Object.keys(E.ptrs), a = E.ptrs[ids[0]], b = E.ptrs[ids[1]];
    E.pinch = { d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, v0: { x: E.view.x, y: E.view.y, z: E.view.z } };
  }
  function doPinch() {
    var ids = Object.keys(E.ptrs); if (ids.length < 2 || !E.pinch) return;
    var a = E.ptrs[ids[0]], b = E.ptrs[ids[1]], pn = E.pinch;
    var d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var z = Math.max(0.1, Math.min(4, pn.v0.z * d / pn.d0)), wx = (pn.mx - pn.v0.x) / pn.v0.z, wy = (pn.my - pn.v0.y) / pn.v0.z;
    setView(mx - wx * z, my - wy * z, z);
  }
  var THR_MOUSE = 4, THR_TOUCH = 9;
  function closePops() { if (!R) return; R.help.hidden = true; R.arr.hidden = true; }

  function onDown(ev) {
    if (!E) return;
    var tg = ev.target;
    if (tg.closest && tg.closest("a.bd-mopen, .bd-edit, .bd-mbtn, .bd-mfr, .bd-mini, .bd-pop")) return;
    if (ev.pointerType === "mouse" && ev.button > 1) return;
    ev.preventDefault();
    closePops();
    if (document.activeElement && document.activeElement !== R.cv && document.activeElement.blur) document.activeElement.blur();
    endEdit();
    try { R.cv.focus({ preventScroll: true }); } catch (e) {}
    try { R.cv.setPointerCapture(ev.pointerId); } catch (e) {}
    R.rect = R.cv.getBoundingClientRect();
    var p = localPt(ev);
    E.ptrs[ev.pointerId] = { x: p[0], y: p[1] };
    var n = Object.keys(E.ptrs).length;
    if (n === 2) { startPinch(); return; }
    if (n > 2 || E.pinch) return;
    var w = s2w(p), z = E.view.z, touch = ev.pointerType !== "mouse", tol = (touch ? 10 : 5) / z;
    var tool = E.tool, ro = !canEdit();
    var g = { id: ev.pointerId, sx: p[0], sy: p[1], wx: w[0], wy: w[1], moved: false, touch: touch, shift: ev.shiftKey || ev.ctrlKey || ev.metaKey, alt: ev.altKey };
    E.gest = g;
    E.hover = { x: w[0], y: w[1], t: Date.now() };
    if (ev.button === 1 || E.space || tool === "hand" || ro) { g.type = "pan"; g.vx = E.view.x; g.vy = E.view.y; syncBar(); return; }

    if (tool === "select") {
      var h = handleHit(p, touch);
      if (h) { g.type = "resize"; g.item = h.id; g.orig = { x: h.x, y: h.y, w: h.w, h: h.h }; return; }
      var it = hit(w[0], w[1], tol);
      g.hit = it ? it.id : "";
      if (it) {
        var ids = withGroup(it);
        if (g.shift) {
          if (ids.every(function (id) { return E.sel.indexOf(id) >= 0; })) { setSel(E.sel.filter(function (id) { return ids.indexOf(id) < 0; })); g.type = "none"; return; }
          setSel(E.sel.concat(ids.filter(function (id) { return E.sel.indexOf(id) < 0; })));
        } else if (E.sel.indexOf(it.id) < 0) setSel(ids);
        g.type = "drag";
      } else {
        if (!g.shift) setSel([]);
        if (touch) { g.type = "pan"; g.vx = E.view.x; g.vy = E.view.y; g.fromEmpty = true; } else g.type = "marq";
      }
      return;
    }
    if (tool === "pen") {
      if (penCount() >= MAX_PEN) { ui.toast(t("bd_cap_pen")); g.type = "none"; return; }
      if (JSON.stringify(E.items).length > MAX_BYTES - 6000) { ui.toast(t("bd_cap_size")); g.type = "none"; return; }
      var st = addItem({ t: "pen", pts: [[Math.round(w[0]), Math.round(w[1])]], c: P.color });
      if (!st) { g.type = "none"; return; }
      g.type = "pen"; g.item = st.id; g.raw = [[w[0], w[1]]]; setSel([]); return;
    }
    if (tool === "eraser") { g.type = "erase"; eraseAt(w, tol); return; }
    if (tool === "arrow") {
      var a = hitConnectable(w[0], w[1], tol);
      if (E.arrowFrom && a && a.id !== E.arrowFrom) { makeArrow(E.arrowFrom, a.id); E.arrowFrom = null; g.type = "none"; return; }
      if (!a) { E.arrowFrom = null; g.type = "none"; return; }
      g.type = "arrow"; g.from = a.id; setSel([a.id]); return;
    }
    g.type = "create"; g.tool = tool;
  }

  function handleHit(p, touch) {
    if (E.sel.length !== 1) return null;
    var it = E.map[E.sel[0]]; if (!it || !(resizable(it) || (G.isLine(it) && !it.lock))) return null;
    var hp = w2s(handlePos(it));
    if (Math.hypot(p[0] - hp[0], p[1] - hp[1]) <= (touch ? 26 : 14)) return { id: it.id, x: it.x, y: it.y, w: it.w, h: it.h };
    return null;
  }
  function eraseAt(w, tol) {
    var it = hit(w[0], w[1], tol); if (!it || it.lock) return;
    removeIds([it.id]); E.gest.erased = true; paintArrows(); drawSel();
  }
  function makeArrow(a, b) {
    if (E.items.filter(function (i) { return i.t === "arrow" && i.from.id === a && i.to.id === b; }).length) return;
    var ar = addItem({ t: "arrow", from: { id: a, side: "auto" }, to: { id: b, side: "auto" }, c: P.color === "gel" || P.color === "bounce" ? "slate" : P.color });
    if (ar) { paint(ar); setSel([ar.id]); commit(); }
  }

  function onMove(ev) {
    if (!E) return;
    if (!E.ptrs[ev.pointerId]) {
      if (ev.pointerType === "mouse" && !(ev.target.closest && ev.target.closest(".bd-mini, .bd-pop"))) { R.rect = R.rect || R.cv.getBoundingClientRect(); var hp = s2w(localPt(ev)); E.hover = { x: hp[0], y: hp[1], t: Date.now() }; }
      return;
    }
    var p = localPt(ev); E.ptrs[ev.pointerId].x = p[0]; E.ptrs[ev.pointerId].y = p[1];
    if (E.pinch) { doPinch(); return; }
    var g = E.gest; if (!g || g.id !== ev.pointerId) return;
    g.alt = ev.altKey;
    var dxs = p[0] - g.sx, dys = p[1] - g.sy, z = E.view.z;
    if (!g.moved && Math.hypot(dxs, dys) > (g.touch ? THR_TOUCH : THR_MOUSE)) { g.moved = true; if (g.type === "drag") beginDrag(g); }
    var w = s2w(p);
    switch (g.type) {
      case "pan":
        if (g.moved) { setView(g.vx + dxs, g.vy + dys, E.view.z); R.cv.classList.add("panning"); }
        break;
      case "drag": if (g.moved) moveDrag(g, dxs / z, dys / z); break;
      case "resize": doResize(g, w); break;
      case "marq":
        if (g.moved) { var x = Math.min(g.sx, p[0]), y = Math.min(g.sy, p[1]); R.marq.hidden = false; R.marq.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + Math.abs(dxs) + "px;height:" + Math.abs(dys) + "px"; }
        break;
      case "pen": {
        var last = g.raw[g.raw.length - 1];
        if (Math.hypot(w[0] - last[0], w[1] - last[1]) * z >= 2 && g.raw.length < 3000) {
          g.raw.push([w[0], w[1]]);
          var it = E.map[g.item]; it.pts = g.raw.map(function (q) { return [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]; });
          R.els[it.id].firstChild.setAttribute("d", G.penD(it.pts));
        }
        break;
      }
      case "erase": eraseAt(w, 6 / z); break;
      case "arrow": {
        var a = E.map[g.from]; if (!a) break;
        var ba = bboxOf(a), c = [ba.x + ba.w / 2, ba.y + ba.h / 2];
        R.tmp.innerHTML = '<path d="M' + c[0] + " " + c[1] + "L" + w[0] + " " + w[1] + '"/>';
        break;
      }
      case "create": if (g.moved) previewCreate(g, w); break;
    }
  }

  function beginDrag(g) {
    var ids = {}, list = [];
    function add(it) { if (!ids[it.id] && it.t !== "arrow" && !it.lock) { ids[it.id] = 1; list.push(it); } }
    selItems().forEach(add);
    selItems().forEach(function (f) { if (G.isBox(f) && !f.lock) contents(f).forEach(add); });
    if (!list.length && selItems().some(function (i) { return i.lock; })) ui.toast(t("bd_locked"));
    g.moving = list.map(function (it) { return it.t === "pen" ? { id: it.id, pts: it.pts.map(function (p) { return p.slice(); }) } : { id: it.id, x: it.x, y: it.y }; });
    g.primary = g.moving.filter(function (o) { return o.id === g.hit; })[0] || g.moving[0];
    g.box = unionBox(list);
    // smart guides: edges and centres of everything that stays put (visible part of the board)
    var v = E.view, vw = { x: -v.x / v.z - 200, y: -v.y / v.z - 200, w: R.cv.clientWidth / v.z + 400, h: R.cv.clientHeight / v.z + 400 };
    g.tx = []; g.ty = [];
    E.flat.forEach(function (it) {
      if (ids[it.id]) return;
      var b = bboxOf(it); if (!b || b.x > vw.x + vw.w || b.x + b.w < vw.x || b.y > vw.y + vw.h || b.y + b.h < vw.y) return;
      g.tx.push([b.x, b], [b.x + b.w / 2, b], [b.x + b.w, b]); g.ty.push([b.y, b], [b.y + b.h / 2, b], [b.y + b.h, b]);
    });
  }
  function guideSnap(g, dx, dy) {
    var out = { dx: dx, dy: dy, lines: "" };
    if (!g.box || g.alt || P.snapOn) return out;
    var tol = 6 / E.view.z, b = g.box, mx = [b.x + dx, b.x + dx + b.w / 2, b.x + dx + b.w], my = [b.y + dy, b.y + dy + b.h / 2, b.y + dy + b.h];
    var bx = null, by = null;
    mx.forEach(function (v) { g.tx.forEach(function (tt) { var d = tt[0] - v; if (Math.abs(d) <= tol && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d: d, at: tt[0], o: tt[1] }; }); });
    my.forEach(function (v) { g.ty.forEach(function (tt) { var d = tt[0] - v; if (Math.abs(d) <= tol && (!by || Math.abs(d) < Math.abs(by.d))) by = { d: d, at: tt[0], o: tt[1] }; }); });
    if (bx) { out.dx += bx.d; var y0 = Math.min(b.y + out.dy, bx.o.y) - 12, y1 = Math.max(b.y + out.dy + b.h, bx.o.y + bx.o.h) + 12; out.lines += '<path d="M' + bx.at + " " + y0 + "V" + y1 + '"/>'; }
    if (by) { out.dy += by.d; var x0 = Math.min(b.x + out.dx, by.o.x) - 12, x1 = Math.max(b.x + out.dx + b.w, by.o.x + by.o.w) + 12; out.lines += '<path d="M' + x0 + " " + by.at + "H" + x1 + '"/>'; }
    return out;
  }
  function moveDrag(g, dx, dy) {
    if (!g.moving || !g.moving.length) return;
    if (P.snapOn && g.primary && g.primary.x != null) { dx = snapV(g.primary.x + dx) - g.primary.x; dy = snapV(g.primary.y + dy) - g.primary.y; }
    else { var sn = guideSnap(g, dx, dy); dx = Math.round(sn.dx); dy = Math.round(sn.dy); R.guides.innerHTML = sn.lines; }
    g.moving.forEach(function (o) {
      var it = E.map[o.id]; if (!it) return;
      if (it.t === "pen") it.pts = o.pts.map(function (p) { return [p[0] + dx, p[1] + dy]; }); else { it.x = o.x + dx; it.y = o.y + dy; }
      paint(it);
    });
    paintArrows(); drawSel(); miniSoon();
  }
  function doResize(g, w) {
    var it = E.map[g.item]; if (!it) return;
    var o = g.orig;
    if (G.isLine(it)) { it.w = snapV(w[0]) - it.x; it.h = snapV(w[1]) - it.y; }
    else if (it.t === "media") {
      it.w = Math.max(120, snapV(w[0]) - o.x);
      it.h = MD().hasView(it) ? MD().heightFor(it, it.w) : Math.max(84, snapV(w[1]) - o.y);
    } else {
      var minW = it.t === "section" ? 160 : it.t === "swatch" ? 56 : 40, minH = it.t === "section" ? 100 : it.t === "swatch" ? 72 : 30;
      var nw = Math.max(minW, snapV(w[0]) - o.x), nh = Math.max(minH, snapV(w[1]) - o.y);
      if (it.t === "frame") { nw = Math.max(54, nw); nh = Math.round(nw * 16 / 9); }
      it.w = nw; if (it.t !== "text") it.h = nh;
    }
    g.moved = true; paint(it); paintArrows(); drawSel();
  }
  function previewCreate(g, w) {
    var t0 = g.tool, x0 = g.wx, y0 = g.wy;
    if (t0 === "line") { R.prev.hidden = true; R.tmp.innerHTML = '<path d="M' + x0 + " " + y0 + "L" + w[0] + " " + w[1] + '"/>'; return; }
    var r = createRect(g, w);
    R.prev.hidden = false; R.prev.style.cssText = "left:" + r.x + "px;top:" + r.y + "px;width:" + r.w + "px;height:" + r.h + "px";
  }
  function createRect(g, w) {
    var x0 = g.wx, y0 = g.wy, r = { x: Math.min(x0, w[0]), y: Math.min(y0, w[1]), w: Math.max(30, Math.abs(w[0] - x0)), h: Math.max(30, Math.abs(w[1] - y0)) };
    if (g.tool === "frame") { r.h = Math.max(60, Math.abs(w[1] - y0)); r.w = Math.round(r.h * 9 / 16); }
    if (g.tool === "section") { r.w = Math.max(160, r.w); r.h = Math.max(100, r.h); }
    return r;
  }

  function onUp(ev) {
    if (!E) return;
    var had = E.ptrs[ev.pointerId]; delete E.ptrs[ev.pointerId];
    try { R.cv.releasePointerCapture(ev.pointerId); } catch (e) {}
    if (E.pinch) { if (Object.keys(E.ptrs).length < 2) { E.pinch = null; E.ignore = Object.keys(E.ptrs)[0] || null; } return; }
    if (E.ignore && String(E.ignore) === String(ev.pointerId)) { E.ignore = null; return; }
    if (!had) return;
    var g = E.gest; if (!g || g.id !== ev.pointerId) return;
    if (ev.type === "pointercancel") { abortGesture(); return; }
    var p = localPt(ev);
    g.ex = p; g.ew = s2w(p);
    finishGesture(true);
  }

  function finishGesture(ok) {
    var g = E.gest; E.gest = null; if (!g) return;
    R.cv.classList.remove("panning");
    hideTmp();
    var w = g.ew || [g.wx, g.wy];
    switch (g.type) {
      case "pan":
        if (!g.moved && g.fromEmpty) tapEmpty(g);
        break;
      case "drag":
        if (g.moved) commit(); else tapItem(g);
        break;
      case "resize": if (g.moved) commit(); break;
      case "marq":
        if (g.moved && g.ex) {
          var a = s2w([Math.min(g.sx, g.ex[0]), Math.min(g.sy, g.ex[1])]), b = s2w([Math.max(g.sx, g.ex[0]), Math.max(g.sy, g.ex[1])]), ids = [];
          E.flat.concat(E.vec).forEach(function (it) {
            if (it.t === "arrow" || dimmed(it)) return;
            var bb = bboxOf(it); if (bb && bb.x <= b[0] && bb.x + bb.w >= a[0] && bb.y <= b[1] && bb.y + bb.h >= a[1]) withGroup(it).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
          });
          setSel(g.shift ? E.sel.concat(ids.filter(function (id) { return E.sel.indexOf(id) < 0; })) : ids);
        } else tapEmpty(g);
        break;
      case "pen": {
        var it = E.map[g.item];
        if (it) {
          var eps = Math.max(0.8, 1.4 / E.view.z), pts = G.simplify(g.raw.map(function (q) { return [q[0], q[1]]; }), eps, MAX_PTS);
          if (JSON.stringify(E.items).length + pts.length * 12 > MAX_BYTES) { removeIds([it.id]); ui.toast(t("bd_cap_size")); }
          else { it.pts = pts; paint(it); commit(); }
        }
        break;
      }
      case "erase": if (g.erased) commit(); break;
      case "arrow": {
        var tgt = hitConnectable(w[0], w[1], 8 / E.view.z);
        if (tgt && tgt.id !== g.from) { makeArrow(g.from, tgt.id); E.arrowFrom = null; }
        else if (!g.moved) { E.arrowFrom = g.from; ui.toast(t("bd_arrow_pick")); }
        else ui.toast(t("bd_arrow_none"));
        break;
      }
      case "create": finishCreate(g, w); break;
    }
    syncBar(); miniSoon();
  }

  function tapItem(g) {
    var it = E.map[g.hit]; if (!it) return;
    var now = Date.now(), lt = E.lastTap;
    if (lt && lt.id === it.id && now - lt.t < 450 && Math.hypot(lt.x - g.sx, lt.y - g.sy) < 30) { E.lastTap = null; startEdit(it); return; }
    E.lastTap = { id: it.id, t: now, x: g.sx, y: g.sy };
  }
  function tapEmpty(g) {
    if (!canEdit() || g.shift) return;
    var now = Date.now(), lt = E.lastTap;
    if (lt && lt.id === "" && now - lt.t < 450 && Math.hypot(lt.x - g.sx, lt.y - g.sy) < 30) {
      E.lastTap = null;
      var s = G.SIZE.note, n = addItem({ t: "note", x: snapV(g.wx - s[0] / 2), y: snapV(g.wy - s[1] / 2), w: s[0], h: s[1], text: "", c: P.color });
      if (n) { setSel([n.id]); commit(); startEdit(n); }
      return;
    }
    E.lastTap = { id: "", t: now, x: g.sx, y: g.sy };
  }
  function finishCreate(g, w) {
    var tool = g.tool, o = null, sz;
    if (tool === "note" || tool === "text" || tool === "frame" || tool === "section" || tool === "rect" || tool === "ellipse") {
      var r;
      if (g.moved) r = createRect(g, w);
      else { sz = tool === "rect" || tool === "ellipse" ? G.SIZE.shape : G.SIZE[tool]; r = { x: g.wx - sz[0] / 2, y: g.wy - sz[1] / 2, w: sz[0], h: sz[1] }; }
      r.x = snapV(r.x); r.y = snapV(r.y);
      if (tool === "note") o = { t: "note", x: r.x, y: r.y, w: r.w, h: r.h, text: "", c: P.color };
      else if (tool === "text") o = { t: "text", x: r.x, y: r.y, w: g.moved ? Math.max(80, r.w) : 260, h: 36, text: "", c: P.color === "gel" ? "slate" : P.color, fs: 26 };
      else if (tool === "frame") {
        var n = 0; E.items.forEach(function (i) { if (i.t === "frame" && (i.n || 0) > n) n = i.n; });
        o = { t: "frame", x: r.x, y: r.y, w: r.w, h: r.h, text: "", n: n + 1, c: "slate" };
      } else if (tool === "section") o = { t: "section", x: r.x, y: r.y, w: Math.round(r.w), h: Math.round(r.h), text: "", c: P.color };
      else o = { t: "shape", shape: tool, x: r.x, y: r.y, w: r.w, h: r.h, text: "", c: P.color };
    } else if (tool === "line") {
      var x1 = g.moved ? w[0] : g.wx + 160, y1 = g.moved ? w[1] : g.wy;
      o = { t: "shape", shape: "line", x: snapV(g.wx), y: snapV(g.wy), w: snapV(x1) - snapV(g.wx), h: snapV(y1) - snapV(g.wy), c: P.color === "gel" ? "slate" : P.color };
    }
    if (!o) return;
    var item = addItem(o);
    if (!item) return;
    setSel([item.id]); commit();
    if (tool !== "line") setTool("select");
    if (item.t === "note" || item.t === "text" || item.t === "section") startEdit(item);
  }

  function onWheel(ev) {
    if (!E) return;
    if (ev.target.closest && ev.target.closest(".bd-pop")) return;
    ev.preventDefault();
    R.rect = R.cv.getBoundingClientRect();
    var p = localPt(ev), dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY, dx = ev.deltaMode === 1 ? ev.deltaX * 16 : ev.deltaX;
    if (ev.shiftKey && !ev.ctrlKey) { setView(E.view.x - (dy || dx), E.view.y, E.view.z); return; }
    if (!ev.ctrlKey && !ev.metaKey && Math.abs(dx) > Math.abs(dy)) { setView(E.view.x - dx, E.view.y, E.view.z); return; }
    zoomAt(Math.exp(-dy * (ev.ctrlKey ? 0.01 : 0.0015)), p[0], p[1]);
  }

  // ---------- keyboard ----------
  function T() { return B.tools || {}; }
  document.addEventListener("keydown", function (ev) {
    if (!E || !R || !R.root.isConnected || ui.modalOpen()) return;
    var tg = ev.target, tag = tg && tg.tagName;
    if (typing(tg)) return;
    if (ui.state.view !== "boards") return;
    var k = ev.key, mod = ev.ctrlKey || ev.metaKey, ed = canEdit(), lk = String(k).toLowerCase();
    if (k === " " && tag !== "BUTTON") { E.space = true; ev.preventDefault(); return; }
    if (k === "?") { ev.preventDefault(); togglePop("help"); return; }
    if (k === "Escape" && (!R.help.hidden || !R.arr.hidden)) { closePops(); return; }
    if (ev.shiftKey && !mod && ev.code === "Digit1") { ev.preventDefault(); fit(); return; }
    if (ev.shiftKey && !mod && ev.code === "Digit2") { ev.preventDefault(); fitSel(); return; }
    if (k === "+" || k === "=") { if (!mod) { zoomAt(1.25, R.cv.clientWidth / 2, R.cv.clientHeight / 2); ev.preventDefault(); } return; }
    if (k === "-" && !mod) { zoomAt(0.8, R.cv.clientWidth / 2, R.cv.clientHeight / 2); ev.preventDefault(); return; }
    if (k === "0" && !mod) { fit(); return; }
    if (lk === "m" && !mod && !ev.altKey) { toggleMini(); return; }
    if (!ed) return;
    if (mod && lk === "z") { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); return; }
    if (mod && lk === "y") { ev.preventDefault(); redo(); return; }
    if (mod && lk === "d") { ev.preventDefault(); duplicateSel(); return; }
    if (mod && lk === "a") { ev.preventDefault(); setSel(E.items.filter(function (i) { return i.t !== "arrow" && !dimmed(i); }).map(function (i) { return i.id; })); return; }
    if (mod && lk === "g") { ev.preventDefault(); if (ev.shiftKey) T().ungroup && T().ungroup(); else T().group && T().group(); return; }
    if (mod && lk === "l") { ev.preventDefault(); if (T().lock) T().lock(); return; }
    if (mod) return;
    if (k === "Delete" || k === "Backspace") { ev.preventDefault(); deleteSel(); return; }
    if (k === "Escape") { E.arrowFrom = null; if (E.sel.length) setSel([]); else if (E.tool !== "select") setTool("select"); return; }
    if (k === "Enter") { if (E.sel.length === 1) { ev.preventDefault(); startEdit(E.map[E.sel[0]]); } return; }
    if (k === "]" || k === "[") { ev.preventDefault(); if (T().zStep) T().zStep(k === "]" ? 1 : -1); return; }
    if (k.indexOf("Arrow") === 0) {
      if (!E.sel.length) return;
      ev.preventDefault();
      var st = ev.shiftKey ? 10 : 1; if (P.snapOn) st = GRID;
      nudge(k === "ArrowLeft" ? -st : k === "ArrowRight" ? st : 0, k === "ArrowUp" ? -st : k === "ArrowDown" ? st : 0); return;
    }
    if (ev.altKey) return;
    if (lk === "k") { ev.preventDefault(); linkModal(); return; }
    if (lk === "u") { ev.preventDefault(); R.file.click(); return; }
    if (lk === "c") { ev.preventDefault(); swatchModal(); return; }
    if (lk === "i") { if (E.sel.length === 1) { ev.preventDefault(); detailsModal(E.map[E.sel[0]]); } return; }
    var map = { v: "select", h: "hand", n: "note", t: "text", f: "frame", s: "section", r: "rect", o: "ellipse", l: "line", a: "arrow", p: "pen", e: "eraser" };
    if (map[lk]) { ev.preventDefault(); setTool(map[lk]); }
  });
  document.addEventListener("keyup", function (ev) { if (E && ev.key === " ") E.space = false; });
  window.addEventListener("blur", function () { if (E) E.space = false; });

  // ---------- popovers: arrange, shortcuts ----------
  function togglePop(which, anchor) {
    var el = which === "help" ? R.help : R.arr, other = which === "help" ? R.arr : R.help;
    other.hidden = true;
    el.hidden = !el.hidden;
    if (!el.hidden && anchor && which === "arr") {
      var rb = R.root.getBoundingClientRect(), ab = anchor.getBoundingClientRect();
      var left = Math.max(12, Math.min(ab.left - rb.left - 8, rb.width - 300));
      el.style.left = left + "px"; el.style.right = "auto";
    }
  }
  function arrangeHTML() {
    function b(k, lab) { return '<button type="button" class="bd-b" data-a="bd-act" data-k="' + k + '" data-t="' + lab + '">' + icon(k) + "</button>"; }
    IC["al-l"] = "M4 3v18M8 7h12M8 15h8"; IC["al-c"] = "M12 3v18M6 7h12M8 15h8"; IC["al-r"] = "M20 3v18M4 7h12M8 15h8";
    IC["al-t"] = "M3 4h18M7 8v12M15 8v8"; IC["al-m"] = "M3 12h18M7 6v12M15 8v8"; IC["al-b"] = "M3 20h18M7 4v12M15 8v8";
    IC["di-h"] = "M4 3v18M20 3v18M10 7h4v10h-4z"; IC["di-v"] = "M3 4h18M3 20h18M7 10h10v4H7z"; IC.grid = "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z";
    IC["same-w"] = "M4 7h16M4 17h16M4 4v6M20 4v6M4 14v6M20 14v6"; IC.fwd = "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"; IC.bwd = "M3 11l9 5 9-5M12 3l9 5-9 5-9-5z"; IC.toback = "M3 8l9 5 9-5M3 13l9 5 9-5M12 3v5";
    return '<h4 data-tx="bd_ar_align"></h4><div class="bd-pg">' + b("al-l", "bd_al_l") + b("al-c", "bd_al_c") + b("al-r", "bd_al_r") + b("al-t", "bd_al_t") + b("al-m", "bd_al_m") + b("al-b", "bd_al_b") + "</div>" +
      '<h4 data-tx="bd_ar_space"></h4><div class="bd-pg">' + b("di-h", "bd_di_h") + b("di-v", "bd_di_v") + b("grid", "bd_grid") + b("same-w", "bd_same_w") + "</div>" +
      '<h4 data-tx="bd_ar_order"></h4><div class="bd-pg">' + b("front", "bd_front") + b("fwd", "bd_forward") + b("bwd", "bd_backward") + b("toback", "bd_toback") + b("num", "bd_renumber") + "</div>";
  }
  var KEYS = [
    ["V", "bd_t_select"], ["H", "bd_t_hand"], ["N", "bd_t_note"], ["T", "bd_t_text"], ["S", "bd_t_section"], ["F", "bd_t_frame"], ["K", "bd_t_media"], ["U", "bd_t_upload"], ["C", "bd_t_swatch"],
    ["R O L", "bd_t_rect"], ["A", "bd_t_arrow"], ["P", "bd_t_pen"], ["E", "bd_t_eraser"], ["Ctrl V", "bd_k_paste"], ["Ctrl C X V", "bd_k_copy"], ["Ctrl D", "bd_duplicate"],
    ["Ctrl Z", "bd_undo"], ["Ctrl Shift Z", "bd_redo"], ["Ctrl G", "bd_group"], ["Ctrl Shift G", "bd_ungroup"], ["Ctrl L", "bd_lock"], ["[ ]", "bd_backward"], ["I", "bd_details"],
    ["Enter", "bd_edit"], ["Del", "bd_remove"], ["Arrows", "bd_k_nudge"], ["Ctrl A", "bd_k_all"], ["Space", "bd_k_pan"], ["+ - 0", "bd_k_zoom"], ["Shift 2", "bd_fit_sel"], ["M", "bd_mini"], ["Alt", "bd_k_alt"]
  ];
  function helpHTML() {
    return '<h4 data-tx="bd_help_t"></h4><dl>' + KEYS.map(function (k) {
      return "<dt>" + k[0].split(" ").map(function (x) { return "<kbd>" + esc(x) + "</kbd>"; }).join(" ") + '</dt><dd data-tx="' + k[1] + '"></dd>';
    }).join("") + "</dl>";
  }
  function toggleMini() { P.mini = !miniOn(); u.lsSet("gecko-bd-mini", P.mini); drawMini(); syncBar(); }

  // ---------- DOM ----------
  function btn(k, extra, content) { return '<button type="button" class="bd-b ' + (extra || "") + '" ' + k + ">" + content + "</button>"; }
  function act(k, cls, label) { return btn('data-a="bd-act" data-k="' + k + '" data-t="' + label + '"', cls, icon(k)); }
  function buildRoot() {
    var root = document.createElement("div");
    root.className = "bd-root";
    var h = '<div class="bd-bar" role="toolbar">';
    h += G.COLORS.map(function (c) { return btn('data-a="bd-colour" data-col="' + c + '" data-t="bd_c_' + c + '" aria-pressed="false"', "bd-sw bd-ed bd-c-" + c, "<i></i>"); }).join("");
    h += '<span class="bd-sep bd-ed"></span>' + act("undo", "bd-ed", "bd_undo") + act("redo", "bd-ed", "bd_redo");
    h += '<span class="bd-sep bd-ed"></span>' + act("dup", "bd-ed", "bd_duplicate") + act("del", "bd-ed", "bd_remove") + act("edit", "bd-ed", "bd_edit") + act("details", "bd-ed", "bd_details");
    h += act("lock", "bd-ed", "bd_lock") + act("group", "bd-ed", "bd_group") + act("arrange", "bd-ed", "bd_arrange") + act("like", "bd-ed", "bd_like") + act("palette", "bd-ed", "bd_palette");
    h += btn('data-a="bd-act" data-k="smaller" data-t="bd_smaller"', "bd-ed", "A−") + btn('data-a="bd-act" data-k="bigger" data-t="bd_bigger"', "bd-ed", "A+");
    h += '<span class="bd-sep"></span>' + act("zout", "", "bd_zoom_out") + '<span class="bd-zl">100%</span>' + act("zin", "", "bd_zoom_in") + act("fit", "", "bd_fit") + act("mini", "", "bd_mini") + btn('data-a="bd-act" data-k="snap" data-t="bd_snap" aria-pressed="false"', "bd-ed", icon("snap"));
    h += '<select class="bd-ftag" data-t="bd_filter" hidden></select>' + act("help", "", "bd_help");
    h += '<span class="bd-status" aria-live="polite"></span></div>';
    h += '<div class="bd-remote" hidden><span></span><button type="button" class="btn sm" data-a="bd-reload"></button></div><div class="bd-rolabel" hidden><span></span></div>';
    h += '<div class="bd-body"><div class="bd-tools" role="toolbar">' + TOOLS.map(function (k) {
      if (k === "|") return '<span class="bd-sep"></span>';
      if (k.charAt(0) === "@") { k = k.slice(1); return btn('data-a="bd-add" data-k="' + k + '" data-t="bd_t_' + k + '"', "", icon(k)); }
      return btn('data-a="bd-tool" data-tool="' + k + '" data-t="bd_t_' + k + '" aria-pressed="false"', "", icon(k));
    }).join("") + "</div>";
    h += '<div class="bd-cv" tabindex="0"><svg class="bd-grid" aria-hidden="true"><defs><pattern id="bd-gp" patternUnits="userSpaceOnUse" width="24" height="24"><circle cx="12" cy="12" r="1.1" fill="currentColor"/></pattern></defs><rect width="100%" height="100%" fill="url(#bd-gp)"/></svg>' +
      '<div class="bd-world"><div class="bd-hl"></div><svg class="bd-svg" width="1" height="1"><g class="bd-vec"></g><g class="bd-tmp"></g><g class="bd-guides"></g></svg><div class="bd-ov"></div><div class="bd-prev" hidden></div></div><div class="bd-marq" hidden></div>' +
      '<canvas class="bd-mini" aria-hidden="true"></canvas><span class="bd-hint" data-tx="bd_local" hidden></span></div></div>';
    h += '<div class="bd-pop bd-arr" hidden role="dialog">' + arrangeHTML() + '</div><div class="bd-pop bd-help" hidden role="dialog">' + helpHTML() + "</div>";
    h += '<input type="file" accept="image/*" multiple hidden class="bd-file">';
    root.innerHTML = h;
    R = {
      root: root, cv: root.querySelector(".bd-cv"), world: root.querySelector(".bd-world"), hl: root.querySelector(".bd-hl"), vec: root.querySelector(".bd-vec"), tmp: root.querySelector(".bd-tmp"), guides: root.querySelector(".bd-guides"),
      ov: root.querySelector(".bd-ov"), prev: root.querySelector(".bd-prev"), marq: root.querySelector(".bd-marq"), zl: root.querySelector(".bd-zl"), status: root.querySelector(".bd-status"),
      remote: root.querySelector(".bd-remote"), ro: root.querySelector(".bd-rolabel"), pat: root.querySelector("#bd-gp"), dot: root.querySelector("#bd-gp circle"), els: {}, lang: "", bar: root.querySelector(".bd-bar"), tools: root.querySelector(".bd-tools"), sc: { bar: 0, tools: 0 },
      mini: root.querySelector(".bd-mini"), help: root.querySelector(".bd-help"), arr: root.querySelector(".bd-arr"), ftag: root.querySelector(".bd-ftag"), hint: root.querySelector(".bd-hint"), file: root.querySelector(".bd-file"),
      play: {}, missing: {}, tag: ""
    };
    var cv = R.cv;
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("pointerleave", function () { if (E && E.hover) E.hover.t = 0; });
    cv.addEventListener("wheel", onWheel, { passive: false });
    // overflow:hidden boxes still scroll when something inside takes focus (a card button, Tab): keep the canvas pinned
    [cv, root].forEach(function (el) { el.addEventListener("scroll", function () { if (el.scrollTop || el.scrollLeft) { el.scrollTop = 0; el.scrollLeft = 0; } }); });
    cv.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    cv.addEventListener("dragstart", function (ev) { ev.preventDefault(); });
    cv.addEventListener("dragenter", onDragOver);
    cv.addEventListener("dragover", onDragOver);
    cv.addEventListener("dragleave", function (ev) { if (!ev.relatedTarget || !cv.contains(ev.relatedTarget)) R.root.classList.remove("bd-drop"); });
    cv.addEventListener("drop", onDrop);
    var mdown = false;
    R.mini.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); ev.preventDefault(); mdown = true; try { R.mini.setPointerCapture(ev.pointerId); } catch (e) {} miniGo(ev); });
    R.mini.addEventListener("pointermove", function (ev) { if (mdown) miniGo(ev); });
    R.mini.addEventListener("pointerup", function () { mdown = false; });
    R.mini.addEventListener("pointercancel", function () { mdown = false; });
    R.ftag.addEventListener("change", function () { R.tag = R.ftag.value; if (E) { E.sel = E.sel.filter(function (id) { return !dimmed(E.map[id]); }); sync(true); drawSel(); syncBar(); } });
    R.file.addEventListener("change", function () { var f = R.file.files; if (f && f.length && E) uploadFiles(f, viewCentre()); R.file.value = ""; });
    R.bar.addEventListener("scroll", function () { R.sc.bar = R.bar.scrollLeft; });
    R.tools.addEventListener("scroll", function () { R.sc.tools = R.tools.scrollLeft || R.tools.scrollTop; });
    document.addEventListener("pointerdown", function (ev) { if (R && !(ev.target.closest && ev.target.closest('.bd-pop, [data-k="arrange"], [data-k="help"]'))) closePops(); }, true);
    return root;
  }
  function applyLabels() {
    R.root.querySelectorAll("[data-t]").forEach(function (b) { var s = t(b.dataset.t); b.setAttribute("title", s); b.setAttribute("aria-label", s); });
    R.root.querySelectorAll("[data-tx]").forEach(function (b) { b.textContent = t(b.dataset.tx); });
    R.remote.firstChild.textContent = t("bd_remote"); R.remote.lastChild.textContent = t("bd_reload");
    R.ro.firstChild.textContent = t("bd_ro") + ". " + t("bd_hint_ro");
    R.bar.setAttribute("aria-label", t("bd_colour"));
    R.cv.setAttribute("data-drop", t("bd_drop"));
    R.ftag._sig = "";
  }

  // ---------- page integration ----------
  function boardNow(id) {
    var b = S.get("boards", id); if (!b) return null;
    if (E && E.id === id) { b = Object.assign({}, b, { items: E.items }); }
    return b;
  }
  B.currentBoard = boardNow;
  B.state = function () { return E; };
  B.editorHTML = function (id) {
    var b = S.get("boards", id), can = B.canEdit();
    var idea = b.ideaId && S.get("ideas", b.ideaId), proj = b.projectId && S.get("projects", b.projectId);
    var acts = ui.btn(t("bd_all_boards"), "bd-back", { cls: "ghost sm" });
    if (idea) acts += ui.btn(t("bd_back_idea"), "bd-idea", { cls: "sm", data: { id: idea.id } });
    if (proj) acts += ui.btn(t("bd_to_project") + ": " + m.projectLabel(proj), "bd-proj", { cls: "sm", data: { id: proj.id } });
    acts += ui.btn(t("bd_copy_text"), "bd-copy", { cls: "sm", data: { id: id } }) + ui.btn(t("bd_save_svg"), "bd-svg", { cls: "sm", data: { id: id } });
    if (can) acts += ui.btn(t("bd_rename"), "bd-rename", { cls: "ghost sm", data: { id: id } });
    var sub = [B.clientName(b.clientId), B.kindLabel(b.kind), u.fmtDate((b.updated || "").slice(0, 10))].filter(Boolean).join(" · ");
    return '<div class="bd-headwrap">' + ui.head({ label: t("nav_boards"), title: b.title || t("bd_untitled"), accent: t("bd_a_" + (B.kinds.indexOf(b.kind) >= 0 ? b.kind : "free")), sub: esc(sub), actions: acts }) + '</div><div class="bd-slot" id="bd-slot"></div>';
  };
  B.editorAfter = function (main, id) {
    var b = S.get("boards", id); if (!b) return;
    if (!R) buildRoot();
    var fresh = false;
    if (!E || E.id !== id) { loadBoard(b); fresh = true; }
    else {
      var changed = (b.rev || 0) > E.rev || (b.updated !== E.updated && JSON.stringify(b.items || []) !== E.savedJson);
      if (changed) {
        if (pending()) E.remote = true;
        else { loadBoard(b); fresh = true; }
      } else if (b.updated !== E.updated) E.updated = b.updated;
    }
    if (fresh) { E.updated = b.updated; }
    var slot = main.querySelector("#bd-slot");
    if (slot) slot.replaceWith(R.root);
    if (fresh) sync(true);
    if (E.gest) { E.ptrs = {}; E.pinch = null; finishGesture(true); }
    if (R.lang !== GK.i18n.lang()) { R.lang = GK.i18n.lang(); applyLabels(); sync(true); }
    R.bar.scrollLeft = R.sc.bar; R.tools.scrollLeft = R.sc.tools;
    // on a phone the canvas is the page: bring it to the top when a board is opened
    if (fresh && window.innerWidth <= 860 && main.scrollTo) {
      var mt = main.getBoundingClientRect().top, hdr = 0;
      [].forEach.call(main.children, function (c) { var ps = getComputedStyle(c).position; if (ps === "sticky" || ps === "fixed") hdr = Math.max(hdr, c.getBoundingClientRect().bottom - mt); });
      main.scrollTo(0, Math.max(0, main.scrollTop + R.root.getBoundingClientRect().top - mt - hdr - 8));
    }
    fitHeight(main);
    syncBar(); drawSel();
    if (E.needFit && R.cv.clientWidth) { E.needFit = false; fit(); E.viewDirty = false; } else applyView();
    if (!E.dirty) setStatus(canEdit() ? "saved" : "");
    // an open text editor survives the move: put the caret back where it was
    if (E.editId && R.ta && R.ta.isConnected) { try { R.ta.focus({ preventScroll: true }); R.ta.setSelectionRange(E.selRange[0], E.selRange[1]); } catch (e) {} }
  };

  /** desktop: the canvas fills the window below the page head (the head height changes with the theme and language) */
  function fitHeight(main) {
    if (!R || !R.root.isConnected) return;
    if (window.innerWidth <= 860) { R.root.style.height = ""; return; }
    var top = R.root.getBoundingClientRect().top + (main ? main.scrollTop : 0);
    var h = Math.round(Math.max(440, Math.min(1600, window.innerHeight - top - 20)));
    if (R.root.style.height !== h + "px") { R.root.style.height = h + "px"; miniSoon(); }
  }
  window.addEventListener("resize", function () { if (E && R && R.root.isConnected) { fitHeight(R.root.closest("main")); applyView(); } });

  /** the editor's working parts, for boards_tools.js (and tests) */
  B.ed = {
    st: function () { return E; }, dom: function () { return R; }, commit: commit, amend: amend, sync: sync, drawSel: drawSel, setSel: setSel, selItems: selItems,
    addItem: addItem, removeIds: removeIds, bboxOf: bboxOf, unionBox: unionBox, nextZ: nextZ, minZ: minZ, canEdit: canEdit, paint: paint, paintArrows: paintArrows,
    contents: contents, shift: shift, snapV: snapV, landing: landing, addUrls: addUrls, uploadFiles: uploadFiles, handleText: handleText, toggleLike: toggleLike,
    undo: undo, redo: redo, fit: fit, fitSel: fitSel, meId: meId, SEC_H: SEC_H
  };

  // ---------- actions ----------
  GK.act("bd-back", function () { B.flush(); ui.p("boards").id = ""; ui.go("boards", { id: "" }); });
  GK.act("bd-idea", function (el) { B.flush(); ui.go("studio", { id: el.dataset.id }); });
  GK.act("bd-proj", function (el) { B.flush(); ui.go("projects", { id: el.dataset.id }); });
  GK.act("bd-copy", function (el) {
    var b = boardNow(el.dataset.id); if (!b) return;
    u.copy(B.outline(b)).then(function (ok) { ui.toast(ok ? t("copied") : t("write_failed")); });
  });
  GK.act("bd-svg", function (el) {
    var b = boardNow(el.dataset.id); if (!b) return;
    var name = String(b.title || "board").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "board";
    (B.exportSVG ? B.exportSVG(b) : Promise.resolve(B.standaloneSVG(b))).then(function (svg) { ui.download(name + ".svg", svg); });
  });
  GK.act("bd-reload", function () {
    if (!E) return; var b = S.get("boards", E.id); if (!b) return;
    clearTimeout(E.timer); E.timer = null; E.dirty = false; E.editId = ""; E.gest = null;
    var keep = E.view; loadBoard(b); E.view = keep; E.needFit = false; E.updated = b.updated;
    applyView(); drawSel(); syncBar();
  });
  GK.act("bd-tool", function (el) { setTool(el.dataset.tool); el.blur(); });
  GK.act("bd-add", function (el) {
    if (!E) return; el.blur();
    var k = el.dataset.k;
    if (k === "media") linkModal(viewCentre()); else if (k === "upload") R.file.click(); else if (k === "swatch") swatchModal();
  });
  GK.act("bd-colour", function (el) { if (E) colourSel(el.dataset.col); el.blur(); });
  GK.act("bd-mplay", function (el) { if (!E || !E.map[el.dataset.id]) return; R.play[el.dataset.id] = 1; paint(E.map[el.dataset.id]); });
  GK.act("bd-mstop", function (el) { if (!E || !E.map[el.dataset.id]) return; delete R.play[el.dataset.id]; paint(E.map[el.dataset.id]); });
  GK.act("bd-like", function (el) { toggleLike(el.dataset.id); });
  GK.act("bd-mzoom", function (el) {
    var it = E && E.map[el.dataset.id]; if (!it) return;
    var src = it.prov === "upload" ? GK.blobs.cachedUrl(it.blob) : MD().info(it).poster; if (!src) return;
    var safe = G.safeUrl(it.url);
    ui.modal({ title: MD().title(it), wide: true, body: '<img class="bd-lb" alt="" referrerpolicy="no-referrer" src="' + esc(src) + '">' + (it.cap ? '<p class="small muted" style="margin:0">' + esc(it.cap) + "</p>" : ""),
      foot: (safe ? '<a class="btn" href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer">' + esc(t("bd_open_orig")) + "</a>" : "") + ui.btn(t("close"), "close", { cls: "ghost" }) });
  });
  GK.act("bd-act", function (el) {
    if (!E) return;
    var k = el.dataset.k; el.blur();
    var cx = R.cv.clientWidth / 2, cy = R.cv.clientHeight / 2, tl = T();
    if (k === "undo") undo(); else if (k === "redo") redo(); else if (k === "dup") duplicateSel();
    else if (k === "del") deleteSel(); else if (k === "edit") startEdit(E.map[E.sel[0]]); else if (k === "details") detailsModal(E.map[E.sel[0]]);
    else if (k === "smaller") textSize(-4); else if (k === "bigger") textSize(4);
    else if (k === "zin") zoomAt(1.25, cx, cy); else if (k === "zout") zoomAt(0.8, cx, cy); else if (k === "fit") fit();
    else if (k === "snap") { P.snapOn = !P.snapOn; u.lsSet("gecko-bd-snap", P.snapOn); syncBar(); }
    else if (k === "mini") toggleMini();
    else if (k === "help") togglePop("help");
    else if (k === "arrange") togglePop("arr", el);
    else if (k === "like") { if (E.sel.length === 1) toggleLike(E.sel[0]); }
    else if (k === "num") { renumber(); closePops(); }
    else if (tl.run) { tl.run(k); if (k !== "lock" && k !== "group" && k !== "palette") closePops(); }
  });
})(window.GK);
