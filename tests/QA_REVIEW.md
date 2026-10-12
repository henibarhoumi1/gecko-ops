# GECKO Ops V02 · QA review

Build under test: `GK_OUT=/tmp/qa2 python3 build.py`, opened with Playwright/Chromium on 2026-10-11 (sample data, founder; roles mmoh, medit, masst also checked). `src/` was not edited.
Scripts used (throwaway, in `/tmp/qa2w/`): `money.js` (independent recompute), `cmp.js` (diff vs app), `priv.js` / `priv2.js` (client pages), `crawl.js` / `crawl2.js` / `audit.js` (brand + FR crawl of 114 states, desktop, 400px, light, dark, EN, FR), `scen.js` (what-if scenarios).

Severity: High = wrong money or data leak a user can hit today. Medium = wrong in a realistic case, or a gap that will bite soon. Low = polish, wording, hardening.
Line numbers refer to `src/` at the time of the review.

## Summary

| Check | Result |
|---|---|
| 1 Money | Every number on dashboard, finance overview, forecast, runway, profit, tax and cap, month close, commission, quotes, clients and today matches an independent recompute from the raw seed records (0 diffs over about 900 figures). Gates and the 75,000 cap work. Two real money defects: pass-through extras count as revenue (H2) and the month close counts them as invoiced (M1). Forecast has modelling gaps (M3). |
| 2 Privacy | Rendered client pages (demoatlas1 and one share per client, EN and FR) show no cost, profit, commission, payout, withheld, salary, team names, other clients or internal notes. But the client browser loads the whole database (H1) and the board SVG path is not screened (H3). |
| 3 Brand | Computed colours across 114 states are only Gel, Chroma, Slate, Bounce and their alpha tints. No yellow/orange/red/green, no gradient, no slate type on chroma, accent words correct in light and dark. One bracket per screen. Real contacts correct everywhere. Only polish items. |
| 4 French | Dictionary is clean (2,118 keys, no missing FR, no placeholder mismatch, no unaccented words). One broken headline, one untranslated client-page label, a few typography and jargon items. |

---

## 1. MONEY

### 1.1 Reconciliation (independent code vs app)

Method: dumped `GK.store` collections and config to JSON, recomputed every figure in a separate Node script from invoices, payments, projects, costs, expenses, leads, contracts and rules (no use of `GK.m` or `GK.x`), then compared with `GK.m`, `GK.x`, `GK.fin.u.monthFigures` and with the text rendered in the DOM.

| Area | Figure (sample, today 2026-10-11) | App | Independent |
|---|---|---|---|
| Receivables / overdue | 1 invoice (GK-2026-013), 1-7 days late | 751 DT | 751 DT |
| Cap used 2026 | invoices issued minus credit notes, stamp excluded | 16,000 DT (21.3%) | 16,000 DT |
| Cap 2025 | | 3,000 DT | 3,000 DT |
| MRR | 1 active SKIN 10 | 3,500 DT | 3,500 DT |
| Win rate / pipeline | 1 won, 1 lost; 4 open leads | 50%; 11,300 total, 2,700 weighted | same |
| Avg margin | | 51.96% | 51.96% |
| Cash this month | net / withheld | 3,396 / 105 DT | 3,396 / 105 DT |
| Month close, October | invoiced 4,250; in 3,501; costs 2,251; overheads 429; salary 1,500; out 4,180; reserve 350; left -1,029 | identical | identical |
| 12 monthly rows | invoiced, cashIn, withheld, expenses, salary, project costs, commissions, out, net | 0 diffs | |
| Client stats | received / costs / profit / margin / owed for 5 clients | 0 diffs | |
| Project profit and commission | 11 projects (commission 12, 237, 588...) | 0 diffs | |
| Forecast 13 weeks | in booked, in pipeline, out, both balances | 0 diffs (e.g. wk 5 Oct 4,098; wk 30 Nov -1,252; wk 28 Dec -1,037 / -3,092) | same |
| Runway | 4,098 (end of week 1) / 3,570.33 burn | 1.15 months (shown 1.1) | 1.15 |
| Tax summary 2026 | invoiced 16,000; stamps 14; withheld 412.5 (shown 413) | match | |
| Quotes | 4,800 / 1,500 / 720; open 1,500; accepted 4,800 | match | |
| Clients view | invoiced to date 19,000, owed 751 | match | |
| Commission tab | owed now 588; paid this year 711; not payable yet 600 | match | |
| Export tab counts | 14 invoices, 14 payments, 30 expense lines | match (checked by hand) | |

### 1.2 Payment gates and cap (tested with what-if edits on the live store)

- No shoot until plan approved and upfront paid: `m.canShoot` correct; shoot date input and stage move blocked (projects.js:536, 548, 556).
- No files until fully paid: Eid launch with 700 of 751 paid is still locked (status overdue, `canFiles` false); at 751 it unlocks. The client page keeps `drive` empty and shows "locked" while `unlocked` is false (portal_snapshot.js:119-145, clientmode.js:296-310). A paid-then-credited deposit re-locks files (`fullyPaid` skips credited invoices). SKIN: month paid unlocks.
- Commission only when fully paid and delivered: stage `edit` with everything paid gives `payable:false, owed:0`; stage `delivered` gives `payable:true, owed:237`. Mark-paid is blocked when `owed` is 0 or when no cost lines exist.
- Cap 75,000: `capUsed` excludes `extra + passThrough` (cap tab, overview, dashboard, X.monthly, tax summary all agree). A credit note reduces it by exactly the invoice amount. At 85,250 the UI shows 115%, "0 DT left", no crash.

### 1.3 Findings

**H2 · High · Pass-through extras count as revenue, profit and commission.**
`src/core/model.js:167` `m.received` sums every non-credit invoice of the project, including `kind:"extra", passThrough:true` (débours re-invoiced at cost). The cap and X.monthly exclude them, but profit does not, and the cost side has no matching line. Repro: add a paid pass-through extra of 500 DT on Maison Jasmin · Eid launch: received 750 → 1,250, profit 39 → 539, Mohamed's commission 12 → 162, client profit and margin up, `clientStats.invoiced` +500.
Fix: in `m.received` (and `X.clientStats` invoiced at metrics.js:96) skip `i.kind === "extra" && i.passThrough`, or add the matching cost automatically when a pass-through is issued.

**M1 · Medium · Month close "Invoiced" includes pass-through extras; cap, dashboard and tax summary do not.**
`src/modules/finance.js:157` (`monthFigures`) lacks the `!(i.kind==="extra" && i.passThrough)` test that `core/metrics.js:52` and `finance_tax.js:128` have. Repro: same 500 DT pass-through: close shows 4,750, X.monthly and cap still 4,250. The "goal" line on the close tab (finance_close.js:224) then overstates progress.
Fix: reuse one helper for "turnover of invoice i".

**M2 · Medium · A cancelled (credited) paid invoice still counts as received.**
`model.js:167` keeps `Math.min(paidGross, amount)` for a credited original and ignores the credit note, so profit, commission and client margin stay up while `fullyPaid` correctly says "not paid". Repro: credit the paid Eid launch deposit: `received` stays 1,500 and `canFiles` false. The refund is never recorded as money out.
Fix: exclude `i.credited` invoices from `received` (or record a refund payment row and subtract it).

**M3 · Medium · Cash forecast leaves out money you already know about, and charges days that already happened.**
`src/core/metrics.js:143-168`.
- Accepted quote Kahwa Lab (4,800 DT, draft invoices i9/i10) is not a receivable, and the lead is "won", so it appears nowhere (neither booked nor pipeline). Same for the next SKIN month of an active contract (3,500 DT a month is MRR on the dashboard but absent from the forecast). Result: the booked line goes to -3,092 DT in December while 3,500 DT a month of retainer is running.
- The first row is the Monday week (`u.weekStart`, line 145), but opening cash is "today". Week 5 Oct includes Oct 5 phone bill (65 DT) that is already in the bank balance.
- Monthly expenses dated 29-31 never fire in shorter months (line 158 compares day of month text).
Fix: add drafts of accepted quotes and next SKIN invoices as "booked, unissued" lines; start the first week at today.

**M4 · Medium · A quote below the pack price blocks files and commission forever.**
`model.js:140-146` `fullyPaid` compares deposit + balance with `pack.price`. A quote accepted at 4,000 DT for SEASON (4,800) creates drafts 2,000 + 2,000 (`finance_quotes.js:293-301`); even fully paid, `fullyPaid` is false, so the client never gets files and Mohamed never gets paid. `belowPack` only shows a note (finance_quotes.js:135).
Fix: compare with the sum of the project's non-credited main invoices (or with the accepted quote), or refuse the accept below pack.

**L-m1 · Low · Runway uses the end-of-week-1 balance as "cash".** `metrics.js:171-173`: months = forecast[0].balance / burn (1.148) rather than opening cash / burn (1.120). Burn also includes the current partial month and booked future shoot costs. Label says "last 3 months" so it is defensible; pick one basis and say it.

**L-m2 · Low · Expenses tagged to a project are overheads, not project cost.** The 24 DT taxi on Eid launch and 38 DT fuel on Drop 03 reduce the month close but not the project profit or commission (`finance_expenses` projectId vs `model.js:172`). The Expenses tab tells the user project costs stay on the project, which is the opposite of what a tagged expense does.

**L-m3 · Low · No warning when issuing an invoice that crosses 75,000.** `finance.js:379-392` (`fi-issue`) has no cap check; the 80% pill only shows on the cap tab and dashboard after the fact.

**L-m4 · Low · Dashboard compares cash in with a revenue goal.** `dashboard.js` tile "Cash in this month" shows "goal 6,000 DT" (monthlyRevenue is an invoicing goal); month close compares invoiced with the same goal. Pick one meaning.

**L-m5 · Low · Commission table dates have no year.** `finance.js:535-536`: "237 DT · 12 Oct" is Oct 2025 (Dar Zaghouan Autumn catalogue); next to 2026 payments it looks current.

**L-m6 · Low · Sample data oddities.** Nour Skin "Month 1" is labelled September 2026 but shot 27 Aug and invoiced 20 Aug (core/seed.js:65-69, 77). Nour Month 2 books its 1,540 DT cost in October for a shoot on 13 Oct, so October close shows -1,029 DT in a "good" sample.

---

## 2. PRIVACY (client share pages)

What was inspected:
- `#cl-demoatlas1`, EN and FR, every tab: full `textContent` and `innerHTML` scanned for cost, profit, commission, payout, withheld, withholding, salary, margin, reserve, stamp, payments, Heni, Mohamed, Yassine, Salma, internal, note, other client brands, internal ids. No hit (only `data-pid="patl"` project id on feedback buttons, Info).
- Snapshot JSON of `shares/demoatlas1` (keys: v, lang, title, brand, contact, company, sections, projects, invoices, boards) and a freshly built snapshot for each of the 5 clients with all sections and all boards on, rendered at `#cl-qa<client>`: `P.check` returns no hit, DOM scan clean in EN and FR.
- Disabled share and unknown token both show "This page isn't available" with no data in the DOM; hash injection (`#cl-"><img onerror>`) is not executed.
- Drive links are empty in the snapshot while the project is locked (Jasmin Eid launch: `unlocked:false`, `drive:""`).

### Findings

**H1 · High · The client's browser loads the entire database, and the client link points at the whole app.**
`#cl-<token>` swaps the view but runs the same boot: `ui.js:306-312` sets `clientToken` after `store.boot`, and `store.js:160-185` (`subscribeShared`) subscribes to every collection plus `config/app`. In the client page on the sample build: `GK.store.all("invoices").length` = 20, `expenses` 10, `team` 4, `clients` 5, `config().rules` (salary, commission %, cap, opening cash) present, and `window.GK` is global. On claude.ai or any hosted store, anyone who can open the link can read all costs, profit, salaries and other clients from the console, which defeats "renders only from snapshot". `core/model.js:38` also hard-codes the link base `appUrl` to a claude.ai artifact URL, so the client must have access to the same artifact and database as the team.
Fix: in client mode, subscribe only to `shares/<token>` (and write-only `feedback`), never to other collections or config; host the client page on its own origin or a database rule that returns only the share document; stop exposing `GK` globally on that page.

**H3 · High · Whiteboard SVG is exempt from the privacy check, so internal notes publish silently.**
`portal_snapshot.js:181` skips any path containing "svg", and `BAD_WORDS` (line 175) is only `cost|profit|commission|payout|withheld|mohamed`. Repro: board for Atlas with a sticky note "Internal: Mohamed commission 30% of profit 789 DT, our cost 711, Heni salary 1500, withheld 22.5. Other client Maison Jasmin pays late." Published to a page with the Boards section on: `P.check` returns `[]`, no warning modal, and the note is visible on the client page (`textContent` contains "commission").
Fix: run the word check on board item texts (not the SVG string), add `salary|margin|reserve|heni|yassine|salma|other clients' brand names|internal`, and show the warning with the board title. Longer term: a per-board "client-safe" switch.

**M5 · Medium · `cleanSvg` is bypassable.** `clientmode.js:153-156` strips `<script>`, `<foreignObject>`, `\son…=` attributes and quoted `javascript:` hrefs only. Repro (snapshot svg from the shares collection): `<svg …/onload="…">` is kept (slash separator), `<a href="jav&#x61;script:…">` is kept, `<image href="https://evil…">` and `<style>@import url(…)</style>` are kept. Not executed on load in Chromium, but the `javascript:` link runs on click. Because clients can write to the DB (`feedback`) in the hosted setup, a client with edit access could plant it in another client's share.
Fix: parse the SVG with `DOMParser` and rebuild from an allow-list (svg, g, rect, ellipse, line, path, polygon, text, tspan, defs, pattern, with `style` limited to the board properties), or sanitise with a vetted library; drop `<image>`, `<a>`, `<style>`, `<use>`.

**M6 · Medium · `P.check` is a word list, not a guarantee.** `portal_snapshot.js:175-176`: no `salary`, `margin`, team names (only "mohamed"), other clients' brands, `internal`; the `needs` entries show amounts and invoice numbers even when the Invoices section is switched off (`needsOf`, lines 62-78); `invoices[].project` exposes the internal project id.
Fix: add a snapshot allow-list per section; drop `needs` amounts when `sections.invoices` is false.

**M7 · Medium · Demo client page shows invoice numbers that belong to other invoices.** `modules/clientmode.seed.js:50-51` hard-codes GK-2026-006 and GK-2026-004 for Drop 03; after `core/seed.js:124-128` renumbers by issue date, Drop 03 is really GK-2026-011 (balance) and GK-2026-010 (deposit); 004 and 006 are Dar Zaghouan and Maison Jasmin invoices. Fix: build the demo snapshot with `GK.portal.buildSnapshot` after numbering (a seedExtra that runs last), or renumber the hand-written snapshot.

**M8 · Medium · Team privacy inside the app.**
- Sales role (Mohamed) has Finance in `ROLE_NAV` (`model.js:237`): month close shows "Heni's salary 1,500 DT" and "real pay" sentence, runway, every project's costs and profit, other commissions.
- Freelance editor and assistant see "Mohamed is on this project: 30% of profit goes to him." (`projects.js:286`, key `pj_moh_yes` line 56).
Fix: confirm intent with Heni; if not intended, hide salary and the commission % from non-founders and keep Finance founder-only or read-only without the salary rows.

**L-p1 · Low · Share document holds internal fields.** `shares/<id>` stores `publishedBy` (team member id), `note`, `clientId`, `projectId` next to the snapshot. Harmless once H1 is fixed; until then they are readable by the client.

**L-p2 · Low · Snapshot title and angle `why` text** are whatever the team typed (in EN in the sample: "Drop 03 · campaign page", "Returns mention sizing on cobbles…") and show up as is in the FR page. Not a leak, but check the wording is client-safe before publishing.

---

## 3. BRAND

Method: `audit.js` walked every element of 114 states (14 views, 11 project/production/report sheets, 10 ideas, 3 boards, 5 portal clients, settings tabs, 10 finance tabs, 20 invoices, 3 quotes, dashboard ranges, and 38 modals opened from "new/add" buttons) in light, dark, EN, FR, desktop and 400px, reading computed colour, background, border, SVG fill and stroke, shadow, gradient, font family; plus the client page (7 tabs, accordions open) and the invoice/quote document modals.

Passed:
- Only Gel #F6CBDA, Chroma #3946EC, Slate #0E0E0E, Bounce #F7F6F2, plus alpha tints of Slate and Bounce. No other hue anywhere, charts included (series 1 Chroma, 2 Slate or Bounce in dark, 3 Gel; at most 3 series; legend, hover tips, table view present; no dual axis).
- No gradient; no shadow except a 1px inset outline on Gel swatches.
- No Slate (or Chroma) type on Chroma; no invisible text; accent (Trovical) words are Chroma on Bounce/Gel and Gel on Slate/Chroma in light and dark.
- Exactly one bracket (`.lab.br`) per screen in all 114 states and all 7 client tabs. FR accent words contain no ç or œ.
- Contacts: `+216 26 191 555`, `reachoutgecko@gmail.com`, `@geckoagency_` in `core/model.js:37`, client footer and `tel:`, `mailto:`, `instagram.com/geckoagency_`, `wa.me/21626191555`, invoice and quote documents. No other phone, e-mail or handle in `src/` besides invented sample clients (+216 20 000 101 etc.) and example.com links in sample refs.
- No horizontal page scroll at 400px in any view (EN and FR).

Findings (all Low):

- **L-b1** Invoice and quote document modals show the document `.frame` while the page head bracket (`[ MONEY ]`) is still on screen behind the scrim, so two bracket devices are visible together (`finance.js:475`, `finance_quotes.js:382`). Contract allows one `.frame` per document, but the layout still shows two. Fix: dim or hide the page head while a document modal is open, or drop the frame in the modal and keep it for the printed/exported text only.
- **L-b2** The client page footer headline "Questions? We're here." has no Trovical accent word (`clientmode.js:48, 176`); every other headline has exactly one. Fix: e.g. "Questions? We're *here*." in Gel.
- **L-b3** Colour literals outside tokens: `app.css:48` `#0E0E0E`, `app.css:165, 184-185, 229-235` and `clientmode.js:85-86, 110` use `rgba(14,14,14,…)` / `rgba(247,246,242,…)` (contract: no hex or rgb in modules). They are tints of the palette, so no visual violation, but they bypass `--ink-*` tokens. Fix: use `color-mix` or add `--ink-2/-3/--line` overrides.
- **L-b4** Native `<select>` borders render system grey (`boards` toolbar select, 118/118/118) and `<hr>` default grey; tokens not applied. Fix: `border-color: var(--line)` on `.in` selects used in the boards bar.
- **L-b5** `app.css:245, 254` legend swatch for series 3 uses `box-shadow: inset` (flat rule says no shadows); replace with `outline` or `border`.
- **L-b6** On a 400px phone the client stage stepper scrolls sideways and the current stage ("Testing") is off-screen (`app.css:154`, `clientmode.js:206-208`). Fix: scroll the `.now` step into view on render, or wrap the steps.

---

## 4. FRENCH (every view switched to FR, desktop + 400px, plus client page and modals)

Method: language stored in `gecko-ops-lang`, every state re-rendered; EN vs FR text compared line by line; full dictionary (2,118 keys) exported and checked for missing FR, placeholder mismatch, unaccented French words, English words inside FR strings, spacing before `: ; ? !`, straight quotes, percent format; attributes (`title`, `aria-label`, `placeholder`) compared; headlines checked for one accent word.

Clean: no missing or empty FR, no `{placeholder}` mismatch, no missing accents (e.g. "Réglages", "Trésorerie", "Échéance" all correct), no ç/œ in accent words, document `lang` switches to `fr`, `<title>` is translated, dates and decimals are French (`1 540 DT`, `1,1 mois`, `30 nov.`), "50 %" with non-breaking space.

Findings:

- **M9 · Medium · Dashboard headline reads "LE STUDIO pouls".** `dashboard.js:7`: `db_title: ["Studio","Le studio"], db_accent: ["pulse","pouls"]` is a word-for-word copy; French order is "Le pouls du studio". Fix: `db_title: ["Studio", "Le pouls du"]`, `db_accent: ["pulse", "studio"]`.
- **M10 · Medium · Client-page timeline shows "Deposit paid" in English on the FR page, and snapshot labels depend on who published.** `clientmode.js:321` only translates when `i18n.has("cm_tl_" + e.key)`, but the key for the upfront step is `upfront` (no `cm_tl_upfront` key), so it falls back to the snapshot's English label. `portal_snapshot.js:89-98` also bakes labels in the publisher's language. Fix: compute the key first (`cm_tl_deposit`/`cm_tl_month`), then test `has()`; store only `key` in snapshots.
- **M11 · Medium · Dashboard "See Money" button for the cash alert opens the Month close tab, not the forecast.** `dashboard.js:88` `params: { tab: "close" }` should be `"forecast"` (button text "Voir l'argent" / "See Money" is fine; the target is wrong in both languages).
- **L-f1** French money uses a normal space for thousands and before "DT" (`util.js:38-47`), so amounts can break across lines ("1 540" / "DT"). Use U+00A0 (or U+202F for thousands).
- **L-f2** "Une question ? On est là." breaks with "?" alone at the start of a line on a phone (`clientmode.js:48`); use a non-breaking space before `?`.
- **L-f3** English terms left in FR: `db_t_mrr` "MRR · SKIN" (`dashboard.js:26`; Overview uses "Récurrent mensuel" for the same number), `pl_ch_media_buyer` "Media buyer" (`pipeline.js:22`), `td_checklist` "Checklist {n}/{t}" (`today.js:37`), and "Hook(s)" on whiteboards (`boards.js:16, 50`: `bd_k_hooks`, `bd_s_hook`, `bd_hk_n`) while the rest of the app says "accroche". Suggested: "Récurrent mensuel · SKIN", "Acheteur média", "Liste de contrôle {n}/{t}", "Accroches".
- **L-f4** Sample content and activity-log lines are stored in English and stay English in FR ("Idea added", "Sent to project as a reel", "Moved to Ready", project names "Month 1", client-page title "Drop 03 · campaign page"). Expected for typed data; for the demo, either keep sample data language-neutral or add FR copies.
- **L-f5** Reports page shows two `h1` headlines (`What won` + `Here is what won` / FR `Ce qui gagne` + `Voici ce qui a gagné`); keep one per screen. Also the client hero renders "VOTRE PAGE campagne" with the accent on the noun; "Votre campagne" + accent "page" would read more naturally.
- **L-f6** In the commission and profit tables the sample "Dar Zaghouan · Autumn catalogue" date lacks a year in FR as in EN (see L-m5).

---

## Verified OK (no action)

Invoice numbering after renumber is sequential per year (GK-2026-001..014, GK-2025-001..004); stamp and 3% withholding maths (751 = 728.5 + 22.5; 3,501 = 3,396 + 105); credit note amount negative and lowers the cap; overdue and aging buckets; reminder tones; quote totals equal qty × price; export counts; expense recurrence (6 months × 405 + 6 one-offs = 3,232); funnel (60 DMs, 8 replies, 3 calls, 2 proposals, 1 won); gates in Today, Deliveries (copy-with-links refuses while locked) and Portal; role navigation for sales, editor and assistant (editor and assistant cannot open finance, settings, portal even by direct `ui.go`); no console or page errors in any of the 114 states in EN, FR, light, dark and phone.
