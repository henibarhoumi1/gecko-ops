import { useState } from "react";
import { mediaFromUrl, siteName } from "@/features/board/embed";
import { t } from "@/lib/i18n";

/** A link that plays in place when it's a video (Instagram, TikTok, YouTube…), and opens in a new tab otherwise.
 * The player only loads when someone presses Play, so a list of references stays light. */
export function LinkPlayer({ url, label }: { url: string; label?: string }) {
  const media = mediaFromUrl(url);
  const [open, setOpen] = useState(false);
  const text = label ?? `${siteName(url)} ↗`;
  if (!media)
    return (
      <a href={url} target="_blank" rel="noreferrer noopener" className="ref-link" dir="auto">
        {text}
      </a>
    );
  return (
    <span className="link-player">
      <span className="link-player-row">
        <button
          type="button"
          className="play-toggle"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">{open ? "■" : "▶"}</span>{" "}
          {open
            ? t("Close", "Fermer")
            : t(`Play the ${media.label} video`, `Lire la vidéo ${media.label}`)}
        </button>
        <a href={url} target="_blank" rel="noreferrer noopener" className="small">
          {t("Open", "Ouvrir")} ↗
        </a>
      </span>
      {open && (
        <span
          className={`link-player-frame provider-${media.provider}`}
          style={{ aspectRatio: String(media.aspect) }}
        >
          {media.provider === "file" ? (
            <video src={media.src} controls autoPlay preload="metadata" />
          ) : (
            <iframe
              src={media.src}
              title={t(`${media.label} video`, `Vidéo ${media.label}`)}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            />
          )}
        </span>
      )}
    </span>
  );
}
