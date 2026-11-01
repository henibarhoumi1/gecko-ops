/** A video link turned into something the board can play in place. */
export interface Media {
  provider: "youtube" | "vimeo" | "instagram" | "tiktok" | "pinterest" | "drive" | "loom" | "file";
  label: string;
  /** For an iframe, or the file itself for "file". */
  src: string;
  /** Width over height of the player. */
  aspect: number;
}

const PORTRAIT = 9 / 16;

function parse(url: string): URL | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/** Reads a pasted link. Returns null when it isn't a video we can play, so it stays a plain link. */
export function mediaFromUrl(raw: string): Media | null {
  const u = parse(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" && parts[0]) return youtube(parts[0], false);
  if (host === "youtube.com" || host === "music.youtube.com") {
    if (parts[0] === "shorts" && parts[1]) return youtube(parts[1], true);
    if (parts[0] === "embed" && parts[1]) return youtube(parts[1], false);
    const v = u.searchParams.get("v");
    if (v) return youtube(v, false);
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.find((p) => /^\d+$/.test(p));
    if (id)
      return {
        provider: "vimeo",
        label: "Vimeo",
        src: `https://player.vimeo.com/video/${id}`,
        aspect: 16 / 9,
      };
  }
  if (host === "instagram.com") {
    const i = parts.findIndex((p) => ["p", "reel", "reels", "tv"].includes(p));
    const code = i >= 0 ? parts[i + 1] : undefined;
    if (code && /^[\w-]+$/.test(code))
      return {
        provider: "instagram",
        label: "Instagram",
        src: `https://www.instagram.com/${parts[i] === "p" ? "p" : "reel"}/${code}/embed/`,
        aspect: 0.62,
      };
  }
  if (host === "tiktok.com") {
    const i = parts.indexOf("video");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^\d+$/.test(id))
      return {
        provider: "tiktok",
        label: "TikTok",
        src: `https://www.tiktok.com/embed/v2/${id}`,
        aspect: 0.56,
      };
  }
  if (/(^|\.)pinterest\.[a-z.]+$/.test(host) && parts[0] === "pin" && /^\d+$/.test(parts[1] ?? ""))
    return {
      provider: "pinterest",
      label: "Pinterest",
      src: `https://assets.pinterest.com/ext/embed.html?id=${parts[1]}`,
      aspect: 0.6,
    };
  if (host === "drive.google.com" && parts[0] === "file" && parts[1] === "d" && parts[2])
    return {
      provider: "drive",
      label: "Google Drive",
      src: `https://drive.google.com/file/d/${parts[2]}/preview`,
      aspect: 16 / 9,
    };
  if (host === "loom.com" && parts[0] === "share" && parts[1])
    return {
      provider: "loom",
      label: "Loom",
      src: `https://www.loom.com/embed/${parts[1]}`,
      aspect: 16 / 9,
    };
  if (/\.(mp4|webm|mov)$/i.test(u.pathname))
    return { provider: "file", label: "Video", src: u.toString(), aspect: 16 / 9 };
  return null;
}

function youtube(id: string, short: boolean): Media | null {
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  return {
    provider: "youtube",
    label: short ? "YouTube Shorts" : "YouTube",
    src: `https://www.youtube-nocookie.com/embed/${id}`,
    aspect: short ? PORTRAIT : 16 / 9,
  };
}

/** The site's name for a link card, without "www.". */
export function siteName(raw: string): string {
  return parse(raw)?.hostname.replace(/^www\./, "") ?? raw;
}

/** True for http(s) links, the only ones a card will open. */
export function isLink(raw: string): boolean {
  return parse(raw) !== null;
}

/** Links that sites hand out shortened (vm.tiktok.com, pin.it) can't be played until they're opened once. */
export function isShortLink(raw: string): boolean {
  const host = parse(raw)?.hostname ?? "";
  return /^(vm|vt)\.tiktok\.com$|^pin\.it$/.test(host);
}
