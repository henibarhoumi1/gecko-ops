import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { t } from "@/lib/i18n";

/** The three Gecko colours, as sticky notes. */
export const NOTE_COLORS: [{ en: string; fr: string }, string][] = [
  [{ en: "pink", fr: "rose" }, "#f4c1c4"],
  [{ en: "yellow", fr: "jaune" }, "#f3df9e"],
  [{ en: "green", fr: "vert" }, "#9cc9b0"],
];

const INK = "#000000";
const HELVETICA = 2;

/** A sticky note: a coloured square with room to write. */
export function noteSkeleton(x: number, y: number, color: string): ExcalidrawElementSkeleton[] {
  return [
    {
      type: "rectangle",
      x,
      y,
      width: 220,
      height: 160,
      backgroundColor: color,
      fillStyle: "solid",
      strokeColor: INK,
      strokeWidth: 1,
      roughness: 0,
      roundness: null,
      label: {
        text: t("Write here", "Écrivez ici"),
        fontSize: 20,
        fontFamily: HELVETICA,
        textAlign: "left",
        verticalAlign: "top",
      },
    },
  ];
}

const FRAME_W = 520;
const FRAME_H = 400;
const GAP = 60;

/** A first layout so the board never opens empty: a few named areas to fill, side by side. */
export function starterSkeleton(
  template: "performance" | "cinematic",
): ExcalidrawElementSkeleton[] {
  const areas: [string, string][] =
    template === "cinematic"
      ? [
          [
            t("Mood", "Ambiance"),
            t("Films, photos, words that feel right.", "Films, photos, mots qui sonnent juste."),
          ],
          [
            t("Colour", "Couleur"),
            t("Palettes, grades, skin tones.", "Palettes, étalonnages, carnations."),
          ],
          [
            t("Wardrobe", "Stylisme"),
            t("Looks, fabrics, the pieces we shoot.", "Looks, matières, les pièces à filmer."),
          ],
          [t("Light", "Lumière"), t("Hard or soft, day or night.", "Dure ou douce, jour ou nuit.")],
          [
            t("References", "Références"),
            t("Paste film or reel links here.", "Collez ici des liens de films ou de reels."),
          ],
        ]
      : [
          [
            t("Product angles", "Angles produit"),
            t(
              "How the product looks best on camera.",
              "Ce qui met le produit en valeur à l'image.",
            ),
          ],
          [
            t("Ads we like", "Pubs qu'on aime"),
            t(
              "Paste TikTok, Instagram or YouTube links.",
              "Collez des liens TikTok, Instagram ou YouTube.",
            ),
          ],
          [
            t("Hooks we like", "Accroches qu'on aime"),
            t(
              "The first seconds that stopped your thumb.",
              "Les premières secondes qui vous ont arrêté.",
            ),
          ],
        ];

  return areas.flatMap(([name, hint], i): ExcalidrawElementSkeleton[] => {
    // Three to a row, so a five-part moodboard still opens big enough to read.
    const x = 40 + (i % 3) * (FRAME_W + GAP);
    const y = 40 + Math.floor(i / 3) * (FRAME_H + GAP);
    const hintId = `starter-hint-${i}`;
    return [
      {
        type: "text",
        id: hintId,
        x: x + 24,
        y: y + 24,
        text: hint,
        fontSize: 20,
        fontFamily: HELVETICA,
        strokeColor: "#555555",
      },
      { type: "frame", x, y, width: FRAME_W, height: FRAME_H, name, children: [hintId] },
    ];
  });
}
