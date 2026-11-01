import { describe, expect, it } from "vitest";
import { isShortLink, mediaFromUrl, siteName } from "./embed";

describe("mediaFromUrl", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    ["https://youtu.be/dQw4w9WgXcQ?t=3", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    [
      "https://www.youtube.com/shorts/abcDEF12345",
      "https://www.youtube-nocookie.com/embed/abcDEF12345",
    ],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871"],
    [
      "https://www.instagram.com/reel/C8xYz_12ab/?igsh=x",
      "https://www.instagram.com/reel/C8xYz_12ab/embed/",
    ],
    ["https://www.instagram.com/p/C8xYz12ab/", "https://www.instagram.com/p/C8xYz12ab/embed/"],
    [
      "https://www.tiktok.com/@gecko/video/7311111111111111111",
      "https://www.tiktok.com/embed/v2/7311111111111111111",
    ],
    [
      "https://www.pinterest.com/pin/123456789/",
      "https://assets.pinterest.com/ext/embed.html?id=123456789",
    ],
    [
      "https://fr.pinterest.com/pin/123456789/",
      "https://assets.pinterest.com/ext/embed.html?id=123456789",
    ],
    [
      "https://drive.google.com/file/d/1AbC/view?usp=sharing",
      "https://drive.google.com/file/d/1AbC/preview",
    ],
  ])("plays %s", (url, src) => {
    expect(mediaFromUrl(url)?.src).toBe(src);
  });

  it("makes shorts and reels portrait", () => {
    expect(mediaFromUrl("https://www.youtube.com/shorts/abcDEF12345")!.aspect).toBeLessThan(1);
    expect(mediaFromUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")!.aspect).toBeGreaterThan(1);
  });

  it("leaves other links alone", () => {
    expect(mediaFromUrl("https://danyclean.tn/kit")).toBeNull();
    expect(mediaFromUrl("javascript:alert(1)")).toBeNull();
    expect(mediaFromUrl("not a link")).toBeNull();
  });
});

describe("helpers", () => {
  it("names the site", () => {
    expect(siteName("https://www.behance.net/gallery/1")).toBe("behance.net");
  });
  it("spots shortened links", () => {
    expect(isShortLink("https://vm.tiktok.com/ZMabc/")).toBe(true);
    expect(isShortLink("https://pin.it/3abc")).toBe(true);
    expect(isShortLink("https://www.tiktok.com/@a/video/1")).toBe(false);
  });
});
