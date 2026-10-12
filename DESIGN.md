# GECKO Ops design system (V03)

This file is the law for every screen. Heni's direction (11 Oct): modern SaaS but not generic, total black, organised, built to help decide. References: Foreman (calm home, KPI tiles with micro charts, activity cards, performance table with meters), Regulatis (rounded panels, side detail panel, progress meters), Movexa and Quanta (dark, dense, one glowing hero card, segmented bars).

## 1. Principles
1. **Decide first.** Every main view opens with what changed and what needs a decision, then the detail. A number never appears alone: it gets a comparison (vs last month, vs target) or a trend.
2. **One system.** Same card, same tile, same table, same pill everywhere. No one-off styles inside modules.
3. **Quiet chrome, loud data.** Chrome is black and grey. Colour is spent on data, status and the one hero card per screen.
4. **Brand in small doses.** The Trovical italic accent word appears once per screen at most (page greeting or hero). The bracket device appears once in the whole app shell (the logo). Anton is used only for very large display numbers on the hero card.

## 2. Tokens (names are fixed; values live in src/styles/tokens.css)
Dark is the default theme. Light is supported.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | #000000 | #F7F6F2 | page canvas, total black |
| `--s1` | #0B0B0B | #FFFFFF | cards, panels |
| `--s2` | #141414 | #F0EFEA | inputs, hovered rows, nested blocks |
| `--s3` | #1C1C1C | #E7E5DE | pressed, selected, skeleton |
| `--line` | #1E1E1E | #E3E1DA | hairlines, card borders |
| `--line-2` | #2C2C2C | #CFCCC3 | input borders, dividers that must show |
| `--tx` | #F7F6F2 | #000000 | primary text |
| `--tx-2` | rgba(247,246,242,.64) | rgba(0,0,0,.62) | secondary text |
| `--tx-3` | rgba(247,246,242,.40) | rgba(0,0,0,.42) | labels, hints, axis |
| `--chroma` | #3946EC | #3946EC | primary action, main data series, links, focus ring |
| `--chroma-soft` | rgba(57,70,236,.16) | rgba(57,70,236,.10) | selected nav, chips |
| `--gel` | #F6CBDA | #F6CBDA | highlight, second data series, attention |
| `--gel-deep` | #EE8FB1 | #D9608C | urgent / overdue / negative delta |
| `--gel-soft` | rgba(246,203,218,.14) | rgba(217,96,140,.10) | attention backgrounds |
| `--hero` | radial Gel to Chroma mesh on black | same on white | the one hero card per screen |

The five highlight colours (`--c-blue` #6F93D4, `--c-pink` #E88FBF, `--c-yellow` #F0D25A, `--c-green` #3A8A6A, `--c-work` #0A0A0A, with `-soft` at .16) are allowed as category and status colours only: pipeline and project stages, task and board kinds, file and idea status, chart series 2 to 5. Never as backgrounds of big areas, never for primary buttons. Text on blue, pink and yellow chips is #000; text on green is #F7F6F2; never black text on Chroma. Orange and red remain banned. Positive delta = Chroma, negative = Gel deep, neutral = tx-2.
Never Slate/black text on Chroma: text on Chroma is #F7F6F2.

Type: Archivo for all UI. Sizes 12 / 13 / 14 (body) / 16 / 20 / 28 (page title) / 40 (KPI) / 64 (hero number). Weights 400, 500, 600. Sentence case everywhere except the 11px uppercase label style (`.lbl`, tracking .08em, tx-3). Tabular numbers on every figure. Trovical italic for the one accent word, in Chroma on light surfaces and Gel on black.

Spacing on a 4px scale: 4, 8, 12, 16, 20, 24, 32, 48. Radius: 8 (small controls), 12 (inputs, buttons), 16 (inner blocks), 22 (cards), 999 (pills). Shadows: none in dark (borders do the work); one soft shadow in light. Motion 140ms ease-out, no bounce.

## 3. Layout
- **Sidebar** 248px, black, collapsible to a 72px icon rail (remembered). Logo at top, a primary "New" button, then groups with small labels: Main (Home, Inbox, Tasks, Calendar), Work (Pipeline, Clients, Projects, Production, Deliveries), Studio (Ideas, Whiteboards, What won), Money (Dashboard, Finance, Client pages), Team (Team, Activity, Settings). Counts as small pills on the right. User card at the bottom.
- **Top bar** 64px: search field with Cmd/Ctrl K hint, then quick create, notifications bell with count, avatar menu.
- **Content**: max 1440px, 24px padding (16 on phone), 12-column grid with 16px gaps. Page header = title (28px) + one-line subtitle on the left, actions on the right.
- **Detail** opens in a right side panel (480px, full screen on phone) instead of replacing the page, when the item is small (task, invoice, idea, lead). Big items (project, client, board) get their own page with a back button.
- Phone (400px): sidebar becomes a bottom bar with 5 items plus "More"; no horizontal page scroll ever.

## 4. Components (one implementation each, in core)
- **Card** `.card`: s1, 1px line, radius 22, padding 20. Header row = title 16/600 + optional "View all" ghost link + kebab.
- **KPI tile** `ui.kpi({label, value, delta, deltaLabel, spark})`: label, 40px value, delta chip (arrow + %), micro bar chart (7 to 12 bars, the last one highlighted).
- **Meter** `ui.meter(pct, {segments})`: segmented bar (like the "Today task" card): 24 to 40 thin vertical segments, filled in tx or chroma, empty in s3. Also a slim pill variant for tables.
- **Hero card** `.hero`: the one gradient card per screen (Gel to Chroma mesh), used for the single most important number or decision.
- **Activity card** `ui.activity({icon, text, when, who})`: small icon tile, two-line text, relative time.
- **Insight / decision card** `ui.decision({title, why, recommend, action})`: what is happening, why it matters (with the number), what Claude recommends, one button.
- **Table** `.tbl`: sticky header in tx-3 labels, 52px rows, hover s2, avatar + name cells, meter cells, right-aligned tabular numbers, sortable headers, search and filter chips above.
- **Pill** `ui.pill(text, tone)`: tones `neutral`, `chroma`, `gel`, `urgent`, `done`, and the highlight status tones `blue`, `pink`, `yellow`, `green`. Dot + text, radius 999. Category dots (`dot-blue` etc.) give stages and kinds a colour without a solid chip.
- **Avatar**: initials on s3, 28px; stacked group variant.
- **Buttons**: primary (Chroma fill, Bounce text), secondary (s2 fill, line border), ghost (text only), icon (36px square, radius 12).
- **Inputs**: s2 fill, line-2 border, radius 12, 40px tall, focus ring 2px Chroma.
- **Tabs**: segmented control on s2 with the active segment on s1.
- **Empty state**: one line of what this place is for + one primary action.
- **Side panel, modal, toast, command palette** share one surface style (s1, line, radius 22).
- **Icons**: one inline SVG stroke set (1.6px stroke, 20px), in core, no emoji.

## 5. Insight layer (what makes it serve decisions)
Each main view starts with an insight strip of 3 or 4 KPI tiles plus at most one decision card:
- Home: cash in the bank vs runway, revenue this month vs last, pipeline weighted value, on-time delivery rate; decisions list (invoices to chase, plans waiting, files to approve, leads going cold) with one-click actions; activity feed; team load table with meters; revenue and cash chart.
- Pipeline: weighted pipeline, win rate (90 days), average days to close, leads going cold.
- Clients: active clients, revenue concentration (top client share), at-risk clients, average lifetime value.
- Projects/Production: on time vs late, files in review, blocked by payment, shoots this week.
- Finance: received this month, outstanding and overdue, margin, cap used vs 75,000.
- Team: load per person (tasks open, overdue), commission owed.
- Studio: ideas by stage, ready to shoot, hit rate of shot ideas (winners / shot).
Every delta compares with the previous equal period. Every recommendation names the record and the action.
