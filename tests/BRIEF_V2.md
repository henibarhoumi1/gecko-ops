# Brief for every builder, V2 (read fully before writing code)

Gecko Ops is the team app of Gecko, Heni's ad creative studio in Tunis ("ads built to be tested": reels that run as ads, with several angles and hook variations). Two people now: Heni (founder, creative director, shoots and edits) and a Client Lead (prospecting, follow-ups, CRM, shoot logistics). Freelance editors and assistants later. Clients: Tunisian e-commerce brands already running ads, personal brands; later the Gulf and worldwide (USD, EUR). This app replaces Notion for them.

You are changing an existing, working app (V03, ~15,000 lines). **Do not rebuild from scratch.** Keep every screen and feature that still fits; change what the plan changes; add what's missing.

## Heni's words about this version (the bar)

"Less chaotic. When you open a new app it guides you where to click and what to do. A clear pipeline, how to use this properly: right now I don't know where to start or where to click. Better naming, better dashboards, better utility, more internal creative tools." Also: plain normal names for everything, no slogans, no filler, nothing that sounds like AI, no gecko-animal jokes or imagery.

So every screen you touch must: say in one line what it is for, show the one next thing to do (one orange primary button per screen), have a helpful empty state that tells the user what to do first, use plain words, and stay calm (fewer boxes, fewer numbers, more whitespace; cut what doesn't help a decision).

## Read first

1. `CONTRACT.md` (module API, V02 and V03 sections). Still the law, except where this brief changes it.
2. `src/core/model.js` fully: it changed. New: offers, launch pricing (`m.priceFor`), lead stages and helpers, cadences, currencies (`m.toTND`, `m.fmt`), delivery stages and gates, partner share (`m.commission` / `m.share`, `m.shareBasis`), pay levels (`m.levelNow`), migration (`m.migrateRecord`, `m.OLD`).
3. `src/core/i18n.js` (new stage words `st_*`, `ls_*`, `nx_*`, `q_*`, `fit_*`), `src/core/util.js` (`u.money(n, dec, cur)`, TND by default), `src/core/ui.js`, `src/core/seed.js`.
4. The plan, read only, in `/mnt/project-files/gecko/plan/`: `README.md`, `offers-and-pricing.md`, `crm-pipeline.md`, `templates.md`, `roles-and-team.md`, `costs.md`, `profit-and-space.md`, `legal-and-admin.md`, `ideal-client.md`. The app follows these files. `internal/team-pay.md` is founder-only: its numbers appear only on founder-only screens.
5. The build plan: `/mnt/project-files/gecko/workspace/02-build-plan.md` (what the app must do, section by section).
6. Brand: `/mnt/project-files/gecko/brand/BRAND.md`. Already applied through `src/styles/tokens.css`; you never write colours. Instrument Serif for page titles (via `ui.head` / `.hl`), Geist for everything else, one font per line, orange = the one primary action per screen, teal = fills and glows only (never text), glass cards.

## What changed in core (already done, don't redo)

- Offers (`m.PACKS_DEFAULT`, keys): `audit` Ad Audit, `test` Test Campaign, `monthly8` Monthly 8, `monthly12` Monthly 12, `campaign` Campaign, `remote_edit`, `gulf_trip`, `tn_day`, `support`, `custom`. Each: `name, market (tunisia|international), currency, price (standard), launch (launch price or null), monthly, upfront (deposit|month|full), shootDays, angles, reels, variations, carousels, cost`. Add-ons: `m.addons()`. Use `m.priceFor(packKey, clientId, monthN)` for any price shown or put on a quote/project. Never show the old names GRIP, SEASON, SKIN anywhere (the data field is still called `pack`).
- Lead stages `m.LEAD_STAGES`: prospect, contacted, conversation, meeting_booked, qualified, proposal_sent, negotiation, accepted, signed, won (= required upfront payment received: deposit, first month, or full payment for full-upfront offers), lost, nurture. Signing/conversion links the lead to a client but does not mark it won. `m.OPEN_STAGES`, `m.LEAD_ODDS`, `m.STAGE_MAX_DAYS`, `m.CADENCE`, `m.SOURCES`, `m.LOST_REASONS`, `m.OBJECTIONS`, `m.ACTIVITY_TYPES`, `m.MARKETS`, `m.LANGS`, `m.LEAD_KINDS`, `m.QUALIFIER`, `m.FIT`. Helpers: `m.isOpen, m.stageSince, m.fitScore, m.qualified, m.overdue, m.noNext, m.stageAge, m.leadValue, m.cadence, m.nextFor(stage)`.
- Delivery stages `m.STAGES`: onboarding, scripting, pre_production, shoot, editing, client_review, revisions, delivered, paid, retention. Gates: `m.canShoot` (scripts approved = `planApproved`, and the pack's required upfront payment is paid), `m.canFiles`, `m.stageBlock` (also blocks `paid` until fully paid), `m.reviewSilent(p)` (3 days of client silence in review = approved; set `p.reviewSince` when a project enters client_review).
- Money: invoices and quotes may carry `currency` (TND default, EUR, USD). `m.received/cashIn/withheld` return TND. Projects may carry `price` (agreed price, in the offer's currency) and `currency`. Rules (`m.rules()`): `cap` (60,000: SUARL threshold), `vat`, `stamp`, `withholding`, `eur`, `usd`, `floor` (10,000: Heni's monthly goal), `adBudget` (2,000), `spendApproval` (200), `launchClients`, `launchUntil`, `launchMonths`, `creditDays`, `creditPct`, partner share (`commission`, `shareClients`, `finderPct`, `finderMonths`, `sharePayee`, `retainerFrom`), `openingCash`.
- Partner share: `m.commission(p)` -> `{basis: first|finder|"", pct, amount, payable, paid, paidOn, owed}`. Shown **only** to the founder (`m.isFounder()`), labelled "Partner share", never with a person's name. Projects no longer have a `mohamed` flag; clients carry `sourcedBy` (team id), `sourcedAlone` (bool), `handledBy`, `wonOn` (date of first payment), `market`.
- Roles: `founder`, `sales` (shown as "Client Lead"), `editor`, `assistant`. Client Lead never sees costs, margins, profit, partner share or pay; can draft quotes but sending one needs the founder's approval (`quote.approvedBy`); new permissions `leads.import`, `quotes.draft`, `docs`, `docs.edit`.
- Nav (`ui.GROUPS`): Main (Start here `guide`, Home, Tasks, Calendar, Inbox), Sell (Sales pipeline, Clients), Make (Projects, Shoots and edits, Deliveries, Ideas and scripts, Whiteboards, Ad results), Money (Numbers, Money, Client pages), Team (Docs `docs`, Team, Activity, Settings).
- Sample data is the old sample run through `m.migrateAll` (so stages and offers are already new). The sample team keeps its member names; code and labels never name a team member.
- Money format: `u.money(n)` -> "1,250 TND"; `u.money(n, 0, "EUR")` -> "€1,250". The word "DT" is gone from labels; use TND.

## Rules

- Write ONLY the files your task lists (and new files named `src/modules/<yourmodule>_*.js`, which load right after your module; see `src/order.txt`). Never edit `src/core/*`, `src/styles/*`, `build.py`, `CONTRACT.md`, or other owners' files. If you need CSS, inject one `<style id="gk-<module>-css">` from your JS using token names only (no hex, no rgb). If you need a core change, finish without it and list it in your final answer with the exact code.
- Every visible string through `t()` with English and French. Escape all data with `esc()`.
- Remove every hard-coded mention of a team member's name from your files' labels and logic (filters like "With Mohamed" become "Partner share" on founder-only views, or go). Sample data files may keep the sample team's names.
- Do not call any mcp__hearthbot__ tool, publish artifacts, message anyone, or install packages. Never run "playwright install".
- Build and test in your own output folder:
  `GK_OUT=/tmp/gk-<you> python3 build.py`
  `GK_PAGE=/tmp/gk-<you>/site/index.html NODE_PATH=$(npm root -g) node tests/smoke.js /tmp/gk-<you>/shots` must print `OK no errors`.
  Also write your own playwright script in `/tmp/gk-<you>/` that clicks through your main flows as the founder and as the Client Lead (`GK.store.workAs("mmoh")`), in English and French, checks no pageerror fires and that `GK.store` changed as expected. Look at your screenshots (desktop, 400px phone) with the Read tool and fix what looks wrong or cluttered.
- Commit your work on your branch with a clear message ending with:
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- Final answer: what you built (one line each), what you couldn't finish, any core change you need (exact code). No code dumps otherwise.
