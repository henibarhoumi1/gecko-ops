# GECKO Ops V01 · module contract

Every screen is one file in `src/modules/<name>.js`. A module never edits core files (`src/core`, `src/styles`, `src/assets`, `build.py`).
Build with `python3 build.py`, test with `NODE_PATH=$(npm root -g) node tests/smoke.js`.

## Shape of a module

```js
/* GECKO Ops · module: projects */
(function (GK) {
  "use strict";
  var u = GK.u, t = GK.t, ui = GK.ui, m = GK.m, S = GK.store, esc = u.esc;
  GK.i18n.add({ pj_title: ["Projects", "Projets"], pj_accent: ["moving", "en cours"] });   // [English, French]
  GK.view("projects", {
    render: function (params) { return ui.head({ label: t("nav_projects"), title: t("pj_title"), accent: t("pj_accent"), sub: "…" }) + "…"; },
    count: function () { return S.all("projects").filter(…).length || ""; },   // optional: number next to the nav item
    after: function (mainEl) { }                                              // optional: runs after the HTML is in the page
  });
  GK.act("pj-open", function (el, ev) { ui.go("projects", { id: el.dataset.id }); });   // click on [data-a="pj-open"]
  GK.change("pj-stage", function (el) { … });                                        // change on [data-c="pj-stage"]
})(window.GK);
```

- `render(params)` returns an HTML string. No DOM work there, no subscriptions, no timers. It runs on every data change.
- **Escape every piece of data** with `esc()` before it goes into HTML (brands, notes, messages are typed by people).
- **Prefix your i18n keys and action names** with your module's prefix so modules never collide:
  today `td_`, pipeline `pl_`, clients `cl_`, projects `pj_`, production `pr_`, deliveries `dv_`, reports `rp_`, finance `fi_`, portal `po_`, team `tm_`, settings `se_`. Actions use the same prefix with a dash: `pj-open`.
- Every visible word goes through `t()`, with English and French. French accent words (the Trovical italic word in a headline) must not contain ç or œ.
- Navigation: `ui.go(view, params)`; read params with `ui.p(view)` or the `params` argument. Use params for "which record is open"; never put ids in the URL hash.
- Forms live in `ui.modal({...})` or inline; read values on save with `u.val(id)`, `u.numVal(id)`, `u.checked(id)`; flag a missing field with `u.focus(id)` and `ui.toast(t("required"))`.
- No `alert`, `confirm`, `prompt`, `window.open` for downloads, or printing. Use `ui.confirm(title, body, onYes)` and `ui.toast(msg)`.
- Copy to clipboard with `u.copy(text).then(ok => ui.toast(ok ? t("copied") : …))`, called inside the click.

## Data: GK.store (S)

| call | does |
|---|---|
| `S.all(coll)` | array of records (unsorted; sort yourself with `u.by(key, "desc")`) |
| `S.get(coll, id)` | one record or null |
| `S.put(coll, obj, {log})` | insert/replace whole record; returns stored copy (id added if missing). `log` adds an activity line (kept to 30) |
| `S.patch(coll, id, partial, {log})` | merge top-level fields |
| `S.remove(coll, id)` | delete |
| `S.config()`, `S.setConfig(partial)` | workspace config (packs, rates, rules, company). Founder only |
| `S.mode` | `"demo"` or `"live"`; `S.backend` `"local"` or `"shared"`; `S.readOnly` |
| `GK.me()` | current team member `{id, name, role}` or null |

Records are plain JSON. Never mutate what `S.get` returns; build a copy (`u.clone`) and `put`/`patch` it. Nested arrays (reels, hooks, payments) are replaced whole by `patch`.

Collections and fields:

- `team {id, name, role: founder|sales|editor|assistant, userId}`
- `clients {id, brand, code (file-name prefix, CAPS), contact, phone, whatsapp, email, sector, taxId, buyer, baseline:{v (orders/week), date}, notes, log}`
- `leads {id, brand, contact, handle, channel, stage: dm|replied|call|proposal|won|lost, q:[4 booleans: sells a physical product online or in stores; running ads or posting to sell now; can share orders per week or an Ads Manager screenshot; has a monthly content budget separate from ad spend], pack, next, nextDate, owner (team id), lostReason, history:[{stage, at}], log}`
- `outreach {id: "<date>_<owner>", date, owner, dms, replies, calls}` — the daily DM log (target 10 DMs/day)
- `contracts {id, clientId, pack (SKIN10|SKIN20), start: "YYYY-MM", minMonths: 3, status: active|ended}`
- `projects {id, clientId, contractId, month (1.. for SKIN, 0 otherwise), name, pack, stage, planApproved, planApprovedOn, shootDate, format, mohamed (bool: Mohamed brought/worked it → commission), onboarding:[7 booleans], angles:[{id, name, why}], reels:[{id, angleId, mode: D|I, format, script, drive, hooks:[{id, text, status: todo|edit|review|approved|revise, v, clientOk, drive, note, results:{hook, ctr, cpp}}]}], carousels:[{id, angleId, title, status, v, clientOk, drive}], costs:[{id, kind: heni|freelance|gear|other, label, amount}], report:{metric, now, why:{}, more, kill, next}, payout:{amount, paidOn}, log}`
- `invoices {id, no ("" = draft, GK-YYYY-NNN once issued, then locked), clientId, projectId, kind: deposit|balance|month|extra|credit, label, lines?, amount (DT, excl. stamp), stamp, issued, due, payments:[{date, net, withheld, method, ref}], credited (bool), creditFor (invoice id, on a credit note), passThrough, log}`
- `tasks {id, projectId, title, who (team id), due, done, doneOn}`
- `msgs {id, ch ("general" or a project id), who, text, at "YYYY-MM-DDTHH:MM"}`

## Business rules: GK.m (m) — use these, don't re-implement

Packs `m.pack(k)`, `m.packKeys()`, `m.rules()` (cap, reserve %, commission %, salary, stamp, withholding %, dueDays, extrasDirect), `m.rates()`, `m.company()` (real contacts: +216 26 191 555, reachoutgecko@gmail.com, @geckoagency_).
Lookups `m.client(id)`, `m.project(id)`, `m.member(id)`, `m.brand(clientId)`, `m.projectLabel(p)`, `m.invoicesOf(p)`, `m.tasksOf(p)`.
Deliverables `m.files(p)` (flat list `{kind, key, code, angle, reel, item, hookIndex, isBase}`), `m.findFile(p, key)`, `m.hookCode`, `m.carouselCode`, `m.scope(p)` (vs pack), `m.progress(p)`.
Invoices `m.invTotal`, `m.invPaidGross`, `m.invPaidNet`, `m.invWithheld`, `m.invBalance`, `m.invStatus` (draft|issued|partial|paid|overdue|credited|credit), `m.nextInvoiceNo()`, `m.capUsed(year)`.
Gates `m.canShoot(p)` (plan approved + upfront paid), `m.canFiles(p)` (balance paid, or month paid for SKIN), `m.gates(p)` (reasons blocked now), `m.stageBlock(p, stage)`.
Money `m.received(p)`, `m.withheld(p)`, `m.costOf(p)`, `m.profit(p)`, `m.commission(p)` → `{amount, payable, paid, paidOn, owed}`, `m.estimateCosts(pack)`.
SKIN `m.contractOf(p)`, `m.contractMonths(c)`, `m.monthsDue()`, `m.monthKey(startYm, n)`.
Sales `m.funnel(weekStart, owner)`, `m.qualified(lead)`.
Roles `m.can(what)` — founder `*`; sales: leads, clients, projects.create, projects.edit, tasks, msgs, portal, outreach, reports.edit; editor: tasks, msgs, files.status, files.edit; assistant: tasks, msgs. Hide or disable controls the viewer can't use. `m.isFounder()`.
Lists `m.STAGES`, `m.LEAD_STAGES`, `m.FILE_STATUS`, `m.ROLES`, `m.LOST_REASONS`, `m.CHANNELS`, `m.FORMATS`.

## Components: GK.ui (ui) — all return HTML strings

`ui.head({label, title, accent, sub, actions})` page head. **The bracket `[ … ]` is the only graphic device and appears once per screen: the head label.** Don't add `.br` or `.frame` anywhere else on a screen (documents like an invoice may use one `.frame` instead, with no `.br` in that document).
`ui.btn(label, action, {cls: "primary|gel|ghost|sm", data:{id}, disabled, title})` — disabled buttons show `title` as a toast when clicked, so put the reason there.
`ui.field({id, label, type: text|number|date|month|select|textarea|checkbox, value, options:[[v,label]], hint, placeholder, span})`, wrap fields in `<div class="form">`.
`ui.pill(text, tone)` with tones `""` (neutral), `"chroma"`, `"gel"`, `"urgent"`, `"done"`, and the highlight status tones `"blue"`, `"pink"`, `"yellow"`, `"green"` (solid chips); category dots `"dot-blue"`, `"dot-pink"`, `"dot-yellow"`, `"dot-green"`, `"dot-chroma"`, `"dot-gel"`, `"dot-work"` (neutral chip, coloured dot; `ui.dot(cls)` for column headers). Legacy `"wip"` = chroma, `"alert"` = urgent. `ui.invPill(inv)`, `ui.stagePill(p)`, `ui.filePill(status)`, `ui.kpis([{lab, v, n}])`, `ui.meter(pct, gel)`, `ui.empty(text)`, `ui.av(name, "gel"|"ink")`, `ui.sample()`.
`ui.modal({title, accent, label, body, foot, wide})`, `ui.closeModal()`, `ui.confirm(title, body, onYes, yesLabel)`, `ui.toast(msg)`, `ui.go(view, params)`, `ui.p(view)`, `ui.attrs({id:…})`.

CSS classes (src/styles/app.css): `.panel` (`.gel`, `.slate`), `.panel-h`, `.grid2`, `.grid3`, `.stack`, `.row`, `.row.between`, `.right`, `.list .li .m`, `.li.click`, `.tbl table` (`td.r` right-aligned numbers, `tr.click`, `tfoot`), `.board .col .col-h .card .t .m`, `.gate`, `.tabs button[aria-selected]`, `.stepper > div.done/.now`, `.lab` (caps label), `.lab.sm`, `.code`, `.num`, `.big`, `.muted`, `.faint`, `.small`, `h2.sec`, `h3.sec`, `.note`, `.note.strong`, `.check`, `.in`, `.in.inline`, `.in.num`, `.doc` (`.slate`, `.gel`, `.top`, `.foot`, `.center`, `.wm`) for client-facing documents, `.derja` for Tunisian Arabic.
Clickable rows/cards that are not buttons need `tabindex="0"` and `data-a` so Enter works.

## Brand (from gecko/brand-identity/README.md — read only)

- Colours are tokens only: `var(--gel)` pink, `var(--chroma)` blue, `var(--slate)` black, `var(--bounce)` off-white, plus `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`, `var(--line)`, `var(--bg)`, `var(--surface)`. Pink and blue each take about 20%, black and white the rest. On pink or white grounds type is black and the accent word blue; on black or blue grounds type is off-white and the accent word pink. **Never black type on blue.** Surfaces: `.panel.gel`, `.panel.blue`, `.panel.slate`; buttons `.btn.gel`, `.btn.blue`. **No hex or rgb values in modules.** Highlight accents (`--c-blue`, `--c-pink`, `--c-yellow`, `--c-green`, `--c-work`, from the highlight covers) are category and status colours only: never a big background, never a primary button. No orange or red. Status is shown by form and tone (`.pill` variants: plain = to do, `wip` = chroma, `done` = black, `alert` = urgent, `blue`/`pink`/`yellow`/`green` = highlight status).
- Headlines: Anton uppercase with exactly one lowercase italic accent word (`ui.head` does this). Body Archivo. Labels: caps, tracked (`.lab`).
- Flat: no shadows, gradients or textures. Rounded only on pills.
- Tone: short, direct, human. English first; French is the toggle.

---

# V02 additions

## New collections (all in the store; same API as before)

- `ideas {id, title, stage: idea|concept|script|ready|shot|parked, clientId, projectId, angleId, hook (the first 3 seconds, one line), concept (why it works, 2-4 lines), script (text: scenes/lines), mode: D|I, format, refs:[{label, url}], boardId, owner (team id), tags:[text], priority: 1|2|3, reelId (set when sent to a project), created, log}`
- `boards {id, title, kind: free|storyboard|angles|shotlist|hooks, clientId, projectId, ideaId, items:[…], view:{x, y, z}, rev, updated, log}`.
  Board items (one document ≤ 256 KB: keep it lean, cap pen strokes at 400 points each and 60 strokes per board):
  `{id, t: "note"|"text"|"frame"|"link"|"shape"|"arrow"|"pen", x, y, w, h, text, c: "gel"|"chroma"|"bounce"|"slate", url (link), shape: "rect"|"ellipse"|"line", from:{id, side}, to:{id, side} (arrow), pts:[[x,y],…] (pen), n (frame number for storyboards), z}`. Colours are brand tokens only.
- `shares {id (= the token in the link, letters+digits only), clientId, projectId ("" = all of the client's current projects), title, enabled, sections:{plan, scripts, files, timeline, invoices, boards}, boardIds:[], snapshot:{…}, publishedAt, publishedBy, note}`. A client page renders ONLY from `snapshot`. The snapshot is built by the team ("Publish update") and must never contain costs, profit, commission, other clients, or internal notes.
- `feedback {id, shareId, clientId, projectId, kind: comment|approve|changes, target ("plan" | "idea:<id>" | file key), text, who, at}`: logged by the team from client messages (WhatsApp), or written directly on a hosted website later.
- `expenses {id, date, label, category: software|gear|rent|transport|marketing|tax|freelance|other, amount, recurring: "none"|"monthly", until ("YYYY-MM" or ""), vendor, projectId, link, note}`
- `quotes {id, no ("Q-YYYY-NNN" once sent), clientId, projectId, pack, title, lines:[{label, qty, price}], amount, status: draft|sent|accepted|declined|expired, validUntil, sentOn, acceptedOn, note, invoiceIds:[]}`
- Task records may carry `doneOn`. Config may carry `goals: {monthlyRevenue, dmsPerDay, margin}` and `rules.openingCash`.

## Charts: GK.charts (src/core/charts.js), return HTML strings

`bars({title, sub, labels, series:[{name, values, c}], stacked, fmt, height, goal:{value,label}})`, `line({…, area, series[].dash})`, `hbars({title, items:[{label, value, note, c, tip}], fmt, max})`, `funnel({title, steps:[{label, value}]})`, `ring({title, value, max, label, sub, warnAt})`, `stat({lab, value, note, trend, delta:{text, up}})`, `spark(values)`, `compact(n)`.
Palette: series 1 Chroma, 2 Slate (Bounce in dark), 3 Gel. **At most 3 series per chart**; fold the rest into "Other". Colour never carries the meaning alone: every chart has a legend, hover tips, and a table view. Never a dual axis. No red/green for good/bad: say it in words or with a `.pill`.
Wrap a chart in a `.panel` yourself; charts are `figure.chart` blocks that fill their container. Use `.grid2` / `.grid3` for layout.

## Metrics: GK.x (src/core/metrics.js), read-only numbers; always label them estimates

`months(n, endYm)`, `monthly(n)` → rows `{ym, label, invoiced, cashIn, withheld, expenses, salary, projectCosts, commissions, out, net}`, `expensesIn(ym)`, `EXPENSE_CATS`, `receivables()`, `aging()`, `dso()`, `stageCounts()`, `clientStats()`, `hooks()`, `angles()`, `workload()`, `pipelineValue()`, `winRate()`, `mrr()`, `avgMargin()`, `forecast(weeks)`, `runway()`. If you need a number twice, add it to metrics.js (the one allowed edit outside your files: append only, never change an existing function, and tell me).

## Other additions

- `ui.download(filename, text)` saves csv/json/txt/md (viewer confirms on claude.ai; downloads on a website).
- Sample data: your own file `src/modules/<name>.seed.js`: `GK.seedExtra.push(function (data, ctx) { data.colls.ideas = [...]; })` with ctx `{u, m, today, d (days from today), ym}`. Existing sample records are in `data.colls.*`; you may add to them (e.g. older invoices) but don't change their ids. Invented brands only. Dates relative to today via `ctx.d(n)`.
- Extra files: each owner may add files named `src/modules/<name>_*.js` (loaded right after `<name>.js`). Share code between your files through `GK.<name>` objects.
- Nav views now: today, dashboard (founder), pipeline, clients, projects, production, studio, boards, deliveries, reports, finance, portal ("Client pages"), team, settings.
- Client page mode: `GK.clientMode = {match(hash) → token|null, render(token) → html, after(appEl)}` lives in `src/modules/clientmode.js`. The hash is `#cl-<token>`. In client mode the app shell, nav and join prompt are skipped; the page must be fully self-contained: language toggle, contact footer, no team data. Clicks use the same `data-a` delegation (register with GK.act).
- Hash rule for artifacts: hashes are plain tokens only (letters, digits, dash).
- All V01 rules still apply: tokens only for colours, one bracket per screen, one Trovical accent word per headline, EN + FR, escape everything, no alert/confirm.

## V03 design system

DESIGN.md is the spec; this is how to use it from a module. Write class names and helpers, never colours or pixel values.

**Tokens** (src/styles/tokens.css). Dark is the default and is total black: `--bg` #000, surfaces `--s1` `--s2` `--s3`, lines `--line` `--line-2`, text `--tx` `--tx-2` `--tx-3`, colour `--chroma` `--chroma-soft` `--chroma-tx` `--gel` `--gel-deep` `--gel-soft`, `--hero` (the one gradient), `--scrim`, `--shadow-pop`, type `--fs-*`, spacing `--sp-*`, radius `--r-sm` 8 `--r-md` 12 `--r-lg` 16 `--r-xl` 22 `--r-pill`, layout `--side-w` `--rail-w` `--top-h` `--page-max` `--gutter`. Theme is `data-theme` on `<html>`: `dark` | `light` | `auto` (follows the system); `ui.theme()` reads it. The old names (`--ink`, `--surface`, `--rail-*`, `--pill-*`, `--slate`, `--r-box` …) still resolve, per element, so old injected CSS keeps working. `.doc` / `.paper` stay light paper in every theme (`.doc.slate` is dark paper).

**Colour rule**: no orange or red anywhere. Good news = Chroma, needs attention = Gel, neutral = tx-3. The highlight accents (blue, pink, yellow, green) are category and status colours only (see DESIGN.md section 2). Charts follow the order s1 Chroma, s2 blue, s3 pink, s4 yellow, s5 green.

**Type**: page titles are Archivo 28px sentence case through `ui.head`. Anton only for hero numbers (`.hero .hv`) and documents. One Trovical accent word per screen: the `accent` of `ui.head`. The logo bracket appears only in the sidebar (and inside documents).

**Helpers** (GK.ui, all return HTML strings; old signatures still work)
- `icon(name, cls)`: inline stroke icon (24 grid, 1.6 stroke, currentColor). Names in `ui.ICONS` (home, inbox, tasks, calendar, pipeline, clients, projects, production, deliveries, studio, boards, reports, finance, portal, team, settings, search, plus, bell, check, x, alert, clock, cash, invoice, file, msg, trend, up, dn, arrow, edit, link, eye, filter, sort …). Unknown names fall back to a dot. No emoji.
- `head({title, accent, sub, actions, label, back})`: page header. `label` shows as an eyebrow only when it differs from the nav name; `back: {label, a, data}` adds a back link. The legacy string form still works.
- `kpi({label, value, delta, deltaTone, deltaIcon, deltaLabel, good, spark, hint, icon, a, data})`: KPI tile. `delta` is a number (%) or text; `good: "down"` when a fall is good news; `spark` is 7 to 12 numbers (the last one is highlighted). `kpis([...])` takes these objects or the legacy `{lab, v, n}`.
- `delta(delta, good, tone, icon)`: the delta chip alone. `unit("1,250 DT")` makes the unit quieter.
- `meter(pct, {segments, tone: "tx"|"chroma"|"gel", label, sm})`: segmented meter. `meter(pct)` is the slim bar and `meter(pct, true)` the legacy gel bar.
- `hero(html | {label, value, unit, sub, body, actions})`: the one gradient card per screen, for the most important number or decision.
- `decision({title, why, recommend, action: {label, a, data, cls}, icon, tone: "urgent"|"chroma"})`: what is happening, why it matters (with the number), what to do, one button. Wrap a list of them in `.decs`.
- `activity({icon, text, when, who, tone, a, data})`: one row of an activity feed; wrap rows in `.acts`.
- `card({title, icon, link: {label, a, data}, actions, body, cls})`: a standard card with a header row.
- `table({id, cols: [{key, label, align: "r", html(row), value(row), sort: false}], rows, sort: {key, dir}, search, row(row) -> {a, data}, empty})`: a sortable, searchable table. Sorting and search state are kept per `id` (actions `ui-sort` and input `ui-tblq` are built in).
- `avatar(name | member, {size: "sm"|"lg", tone: "gel"|"chroma"|"ink"})` and `avatars(list, max)`; legacy `av(name, cls)`.
- `pill(text, tone)`: tones are `neutral` (or ""), `chroma`, `gel`, `urgent`, `done`. The legacy `wip` and `alert` still map.
- `btn(label, action, {cls: "primary|gel|ghost|sm|icon", icon, data, disabled, title})`: with `cls: "icon"` the label becomes the aria-label.
- `empty(text | {icon, title, text, action: {label, a, data, icon}})`: an empty state with one primary action.
- `sidePanel({label, title, sub, body, foot, onClose})`: a 480px right panel (full screen on phone). Use it for small items (task, invoice, idea, lead). Also `sidePanel.close()`, `sidePanel.isOpen()`, `closeSidePanel()` and action `sp-close`. Esc closes the modal first, then the panel, then the drawer. `ui.go` closes the panel.
- `modal({label, title, accent, body, wide, foot})`: the accent is plain text now (the Trovical word belongs to the page head). The foot renders in `.modal-foot`.
- `hasAction(name)`, `monogram()` (the logo cropped to its glyph), `GROUPS` / `groupOf(v)` (sidebar groups), `navPref()` / `setNavPref({mini})`.
- `sample()` now returns "": the sample-data notice lives once, in the top bar. Delete your calls whenever convenient.

**Class vocabulary** (styled in app.css, so existing markup adopts the system): `.card` `.panel` (`.gel` `.blue`) `.note` `.hero` `.kpis` `.kpi` `.meter` `.acts` `.decs` `.list` `.li` `.tbl` `.pill` `.av` `.btn` `.field` `.in` `.tabs` `.seg` `.board` `.col` `.gate` `.empty` `.sk`. Layout: `.grid2` `.grid3`, and the 12-column `.g12` with `.c4` … `.c12` (these stack under 1100px). Bare `select` / `input` get the input style at zero specificity.

**Shell** (GK.shell, in shell*.js; don't render your own top bar or sample notice)
- `creates()`: what quick create, the New button and the palette can start: `[{key, icon, label, run}]`, filtered by role, nav and registered actions (tk-new or tm-task-new, pj-new, cl-new, st-new, fi-new, pl-new, bd-new). Register these action names and your view shows up there automatically.
- `palette(q)`, `closePalette()`, `paletteOpen()`: the command palette. It searches clients, projects, invoices, ideas, tasks, leads, team and boards, plus every command.
- `menu("quick"|"bell"|"user", anchor)`, `closeAll()`, `help()` (the shortcuts sheet).
- Bell feed: `feedItems()`, `unread()`, `markRead(ids)`, `when(date)`. Items are built from existing data (overdue invoices, recent payments, files in review, plans waiting, client feedback, your tasks due); read marks are kept per person.
- Shortcuts: Ctrl/Cmd K or `/` opens the palette, `?` opens help, `n` opens quick create, `[` toggles the rail. `g` then a letter navigates: h home, i inbox, t tasks, c calendar, l pipeline, k clients, p projects, r production, d deliveries, s ideas, w boards, f finance, m team, `,` settings. Shortcuts are ignored while typing or when a modal or menu is open.
- Sidebar groups: Main (Home, Inbox, Tasks, Calendar), Work (Pipeline, Clients, Projects, Production, Deliveries), Studio (Ideas, Whiteboards, What won), Money (Dashboard, Finance, Client pages), Team (Team, Activity, Settings). A view's `count()` shows as the nav count (a dot in rail mode). The phone bottom bar shows Home, Tasks, Inbox, Calendar, Projects and More.

## V03 boards

Files: `boards.js` (words, geometry, templates, list), `boards_edit.js` (editor), `boards_media.js` (links, device images, previews, palette), `boards_tools.js` (arrange), `boards_svg.js` (SVG and outline). All boards CSS lives in one `<style id="gk-boards-css">` (`B.css(text)`), DESIGN.md token names only, each with its V02 name as fallback (`B.tok`).

Board `kind` adds `moodboard` and `campaign`. Templates (`B.templates`): blank, mood (Moodboard), story (6 panels with shot, voice, duration), shots (Shot list), campaign (angles x hooks), angles, hooks, plan (Weekly plan).

Items (still one document under 240 KB; nothing large ever goes in it):
- `t: "media"` `{url, prov, kind, mid, ratio, text, cap, poster, blob}` replaces `t: "link"`. `prov`: youtube | vimeo | instagram | tiktok | pinterest | drive | image | video | figma | behance | dribbble | link | upload. `kind`: video | embed | image | link. `mid`: provider id (`"p/ID"` or `"reel/ID"` for Instagram). `ratio`: picture width / height (16:9 YouTube, 9:16 shorts, reels, TikTok; images learn their real ratio when they load); the card is `w` wide and `w / ratio + 52` tall (52 = title and caption strip). `text` = title (empty: provider name), `cap` = caption or note, `poster` = optional preview image url (from `GK.linkPreview`), `blob` = id in `GK.blobs` for an image added from this device (`prov: "upload"`, `url: ""`).
- `t: "section"` `{x, y, w, h, text (title), c}`: a titled area; moving it moves everything whose centre sits inside (frames do the same). Sections and frames are created behind other items.
- `t: "swatch"` `{x, y, w, h, hex: "#RRGGBB", text (name)}`.
- Any item may carry `tags: [lowercase text]` (max 8), `likes: [member ids]`, `lock: true`, `g: "<group id>"`.
- Old `t: "link"` items are migrated to media cards when a board opens (`B.media.migrate`, same id, place and z) and saved that way on the next edit; `GK.boardSVG` renders both.

Media: `B.media.parse(url)`, `info(item)` (poster, embed url, provider name), `make(url, x, y, extra)`, `heightFor(item, w)`, `title(item)`. Players load only on click: youtube-nocookie.com/embed, player.vimeo.com, instagram.com/{p|reel}/ID/embed, tiktok.com/embed/v2, assets.pinterest.com/ext/embed.html, drive.google.com/file/d/ID/preview, or a `<video>` for direct files. The open-original button is always there (some sites refuse to play inside the claude.ai artifact).

`GK.blobs` (IndexedDB "gecko-ops-blobs"): `put(id, blob)`, `get(id)`, `del(id)`, `url(id)` (object url), `cachedUrl(id)`, `dataUrl(id)`. Images are downscaled to 1600px (webp, else jpeg, 0.82). They stay on the device that added them until a hosted backend exists ("Saved on this device only"); other devices show a placeholder. Deleting a board frees its images when no other board uses them.

`GK.linkPreview(url)` -> Promise `{title, image, desc}` or null. Default: api.microlink.io, cached in localStorage, silent when offline or blocked. A backend may replace it.

`GK.boardSVG(board, {width, light, posters, local, blobs})`: media cards draw as poster + play mark + provider name (never iframes); remote posters by url; device images only with `local` (in-app thumbnails) or `blobs` (saved file). The list uses `posters: false`. Client snapshots get remote posters, never device images. `B.exportSVG(board)` -> Promise of the saved file (colours resolved, device images inlined).

Editor shortcuts: V H N T S F K U C R O L A P E tools, Ctrl/Cmd V paste links or images, Ctrl C/X/V items, Ctrl D, Ctrl Z / Shift Z, Ctrl G / Shift G, Ctrl L lock, [ ] order, I details, M minimap, Shift 1 fit, Shift 2 zoom to selection, ? help, Alt while dragging skips snapping.
