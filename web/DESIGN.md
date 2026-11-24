# The Gecko design system (locked 24 Nov 2026)

One look for the team app and the client portal. Clean, premium, with one creative touch per screen.
The tokens live in `src/styles/system.css`, loaded last. New screens use the pieces below and don't invent their own.

## Colour

- **White first.** Pages and cards are `#fff`. No warm or yellowish canvas.
- **Black text, never grey.** Secondary text is quieter by size and weight, not by colour.
- **Hairlines, not boxes.** Cards are a 1px `--hair` ring (`box-shadow: 0 0 0 1px var(--hair)`), no thick borders,
  no one-sided bars.
- **Blue-soft (`--quiet`)** for quiet surfaces: a brief, a summary line, a segmented control's track.
- **Pink (`--picked`)** means "picked / yours / rising". Pink-soft is the team's view of what the client chose.
- **Black fill** is the one strong action on a card (Use this, Save, Lay out).
- **Yellow** stays a brand accent for highlights only, never a page background.

## Type

- Archivo for everything, tight and narrow on headings. The `&` comes from the system grotesque (Helvetica Neue
  or Arial) so "Gear & studios" reads as words, not a glyph.
- Five sizes: `--t-xs` 12, `--t-s` 13, `--t-m` 15, `--t-l` 18, `--t-xl` 24, plus the page title (32–44).
- Numbers use tabular figures.

## Shape

- Three radii: `--r-sm` 12 (fields, small controls), `--r` 16 (cards), `--r-lg` 22 (panels). Pills are 999.
- Spacing on a 4px grid; cards pad 18–20, sheets 28.

## Pieces

| Piece             | Class                   | Use                                                                 |
| ----------------- | ----------------------- | ------------------------------------------------------------------- |
| Side sheet        | `Sheet` component       | Any big picker or panel. One per screen. Esc and the veil close it. |
| Segmented control | `.seg-row`              | 2–5 mutually exclusive choices.                                     |
| Toggle chip       | `.chip-toggle`          | One on/off filter.                                                  |
| Tabs              | `.wtab`                 | Sections of one page; underline only.                               |
| Card              | `.cb-card`, `.lab-card` | Hairline ring, white, hover lifts by shadow only.                   |
| Empty state       | `.empty-state`          | One quiet sentence and, if there is one, the next action.           |

## Never

- Eyebrow labels above headings, section numbers (except real steps), glyph or emoji icons.
- Grey text, grey shadows on white, tinted page backgrounds.
- The same entrance animation on everything; never animate `transform` on page containers.
- A new colour, radius or font size that isn't a token above.
