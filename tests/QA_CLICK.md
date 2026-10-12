# QA click-through, GECKO Ops V02 (sample mode)

Build: `GK_OUT=/tmp/qa1 python3 build.py`. Driven with Playwright chromium (desktop 1360, phone 400, light and dark), roles founder / sales / editor / assistant. Scripts in /tmp/qa1/t (not part of the repo).

Result: 0 JS errors (pageerror or console) across all flows. 0 horizontal page scroll on any finance tab, board, or client page at 400px.
Numbers: cash this month, receivables, overdue, cap %, MRR, runway agree between dashboard, today, finance overview, invoices and cap tabs, and they update live after a new invoice (cap 21% to 22%, to-collect +501), a payment (cash 3,396 to 3,897), and an expense (runway 1.1 to 1.0). Dashboard 6-month net (-5,925) equals the sum of GK.x.monthly.

## Findings

### 1. [MEDIUM] Studio: typed text is not saved, so "Mark ready" and "Send" stay blocked
Repro: founder, Studio, New idea (client Maison Jasmin, with a hook), "To concept", type a concept, "To script", type text in Script, click "Mark ready" (disabled, title "Add a script first") or "Send to a project".
Result: toast "Add a script first (scenes or text)", though the script is on screen. Only after clicking Save (or another save-first action) does "Mark ready" enable.
Cause: only the client and project selects carry `data-c="st-fchg"` (src/modules/studio_detail.js ~183-184). Hook, concept, script, scenes and notes save only on Save or a save-first button. `stepBtns` (src/modules/studio.js ~149) computes `disabled` from the stored record, not the form.
Fix idea: add `data-c="st-fchg"` to the text fields (save on blur, then re-render), or make the disabled-button handler call `collect()` first.

### 2. [MEDIUM] Studio: unsaved idea edits are lost silently when leaving by the sidebar
Repro: Studio, open an idea, type in the Hook field, click Projects in the nav, then back to Studio. The hook reverts. Only the in-page "All ideas" button (`st-back`) calls `collect()`. Same for a browser reload.
Cause: no autosave or collect on `UI.go` or nav (src/modules/studio_detail.js:300 vs src/core/ui.js:259).

### 3. [MEDIUM] Client page, FR, 400px: status pill overlaps the "Open file" link (Files tab)
Repro: `#cl-demoatlas1`, click FR, 400px viewport, Files tab. "VALIDÉ" collides with "OUVRIR LE FICHIER" on every row (screenshot /tmp/qa1/t/cl2-phone-fr-3.png). Probably also in EN with long labels.
Cause: src/modules/clientmode.js ~303, `<div class="row" style="justify-content:flex-end;flex-wrap:nowrap">` holds the pill and the button. It needs `flex-wrap:wrap` or a stacked layout under about 480px.

### 4. [MEDIUM, design question] Sales sees the whole Money area
Repro: Working as Mohamed (sales), Money: overview, close (salary 1,500, "Heni's real pay"), profit, cap, cash forecast, export (CSV download buttons). `ROLE_NAV.sales` includes finance (src/core/model.js:237) although `m.can` gives sales no finance right. Read-only, but it exposes Heni's salary and pay, every project's profit, and other people's commission. CONTRACT.md says sales gets "commission" only. Decide: remove finance from sales nav and show only their own commission on Today (already there), or accept it.

### 5. [LOW-MEDIUM] Editor sees invoice amounts and the invoice number
Repro: Working as Yassine (editor), Deliveries, Atlas/Jasmin card: "Balance due 751 DT (GK-2026-013), overdue since 9 Oct". Also the "blocked until balance paid" gate text in Production. The assistant correctly does not get Deliveries. Editors and assistants see no other money. The "200 DT" and "39 DT" strings elsewhere are hook and angle names ("Under 200 DT"), not leaks. Probable cause: src/modules/deliveries.js gate text built from `m.gates` and `m.invBalance`.

### 6. [LOW-MEDIUM] "Issue invoice" is a dead end in sample mode
Repro: founder, Money, Invoices, New invoice, save draft, open it, click "Issue invoice" (also the ISSUE button on Today). It is disabled with the title "No matricule fiscal (tax ID) yet". The sample company has no MF although the sample has issued invoices GK-2026-0xx. Settings shows "!" but the demo walkthrough breaks. Cause: `m.company().mf` empty in the seed (src/modules/finance.js:380, src/modules/settings.js:72). Consider a sample MF in demo mode.

### 7. [LOW] A new client page auto-includes all of the client's whiteboards
Repro: Client pages, Create client page for Atlas, save. The share gets `boardIds:["bsb1"]` (every board with that clientId, including internal planning boards) and publishes the board items into the snapshot. Cause: src/modules/portal_pages.js:223. The Boards section starts ticked, and there is no per-board picker in the create modal. The snapshot has no cost, profit or commission words (checked with a keyword scan).

### 8. [LOW] A board cannot be linked to or unlinked from an idea or project
The only link is "Create whiteboard" in the Studio idea (`st-board`, src/modules/studio_detail.js:322). The board rename modal edits only title and client (src/modules/boards.js:344). `board.projectId` and `board.clientId` are copied once at creation. After "Send to a project" or a client change on the idea, the board keeps the old values.

### 9. [LOW] After "Send to a project", the idea can still go Back to Concept
`st-move` BACK stays active on a sent idea (`reelId` set). The reel stays in the project and the idea can be re-sent, so a duplicate is possible. Cause: src/modules/studio.js:142-145 only guards the shot state.

### 10. [LOW] SVG export clips long sticky notes with "..."
Repro: open "Drop 03 storyboard", Save as SVG. Frame 1's note ends in "Sizing is n...". The text is cut in the file, though the full text is on the board. Cause: src/modules/boards_svg.js (note text wrap limit).

### 11. [LOW] Expense linked to a project does not affect project profit or commission
Repro: Expenses, add an expense with Project = Maison Jasmin · Eid launch, category transport. It lands in overheads (Month close "Overheads") but not in `m.costOf(p)` (src/core/model.js:171), so Profitability, Commission and the dashboard "Profit by client" ignore it. The field label "Project (optional)" suggests it should count.

### 12. [LOW] "Best month" differs between screens
Dashboard says "Best month Aug 323 DT" (cash in minus out, excluding withheld and reserve). Month close says August "Left" 25 DT (withheld included, 10% reserve deducted). Both are labelled differently, but the same month shows two different "net" numbers.

### 13. [LOW] Seed data has a future payout date
`Autumn catalogue` payout `paidOn` = Oct 12 (src/modules/finance.seed.js:29), which is after "today" (Oct 11). Commission shows "paid this year 711" while the table total says 948 paid.

### 14. [LOW] French "?" wraps alone on phone
Client page footer "UNE QUESTION ? ON EST LÀ." breaks with a lone "?" at 400px. The space before "?" should be a non-breaking space.

### 15. [INFO] Dead handlers
- `GK.act("st-link", function () {})` (src/modules/studio_detail.js:302) is an intentional no-op for external links.
- `st-nop` is the disabled "Back" button on shot ideas.

## Checked and fine
- Studio: quick capture, new idea modal, stage moves with gates, park, link add (bad URL rejected with a toast), scenes add/remove/reorder, whiteboard create and open, send to project (modal and file code), delete. Typed text survives language switch, theme switch, other store changes, add scene, and add link.
- Whiteboards: create board, note, text, rect, ellipse, arrow (shape to shape), pen, move by drag, Delete key, undo and redo (buttons and Ctrl+Z / Ctrl+Shift+Z), debounced autosave ("Saved"), reload persistence, copy as text, SVG export (valid and renders, no NaN or script). Editor and assistant can edit boards but not delete them (`canDelete` false).
- Finance, all 10 tabs, desktop, phone and dark: no overflow and no errors. New invoice (validation toasts, draft, issue, pay with 3% withholding auto-fill), payment on the overdue invoice (receivables to 0), quote (pack auto-fill, live total, modal survives a background store change, send locks the number, accept, create draft invoices), expense (validation: empty, until before date, `javascript:` link rejected; recurring).
- Client page `#cl-demoatlas1`: EN and FR, 400px, light and dark. All 7 tabs render, no untranslated keys, no `undefined` or `NaN`, no app shell, no team data in the page.
- Role nav: founder 14 views; sales has no Dashboard (falls to Today); editor and assistant fall back to Today for forbidden views. No errors.
