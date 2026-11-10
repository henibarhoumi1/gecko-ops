import { describe, expect, it } from "vitest";
import {
  likeness,
  linkKey,
  matchPost,
  parseCsv,
  readExport,
  readHeaders,
  readNumber,
  tagCode,
  taggedLink,
} from "./importer";

const posts = [
  {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    title: "Reel 1, the stain",
    link: "https://www.instagram.com/reel/CxYz123/",
  },
  { id: "ffeedd00-0000-4000-8000-000000000002", title: "Before after kitchen", link: "" },
  {
    id: "12345678-0000-4000-8000-000000000003",
    title: "TikTok trend",
    link: "https://www.tiktok.com/@brand/video/7300000000000000001",
  },
];

describe("reading exports", () => {
  it("reads CSV with quotes, semicolons and a BOM", () => {
    expect(parseCsv('﻿a;b\n"x; y";"say ""hi"""\r\n\n3;4')).toEqual([
      ["a", "b"],
      ["x; y", 'say "hi"'],
      ["3", "4"],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("reads numbers the way exports write them", () => {
    expect(readNumber("1,234")).toBe(1234);
    expect(readNumber("1 234,5")).toBe(1234.5);
    expect(readNumber("12,5")).toBe(12.5);
    expect(readNumber("1.234.567")).toBe(1234567);
    expect(readNumber("1,234.50")).toBe(1234.5);
    expect(readNumber("TND 120.00")).toBe(120);
    expect(readNumber("45.3%")).toBe(45.3);
    expect(readNumber("0:12")).toBe(12);
    expect(readNumber("1:02:03")).toBe(3723);
    expect(readNumber("--")).toBeNull();
    expect(readNumber("abc")).toBeNull();
  });

  it("knows the columns in English and French", () => {
    const meta = readHeaders([
      "Nom de la publicité",
      "Montant dépensé (TND)",
      "Impressions",
      "Clics sur un lien",
      "Achats",
      "Valeur de conversion des achats",
    ]);
    expect(meta.kind).toBe("metrics");
    expect(Object.fromEntries(meta.metrics)).toEqual({
      spend: 1,
      impressions: 2,
      clicks: 3,
      purchases: 4,
      revenue: 5,
    });
    expect(readHeaders(["Name", "Email", "Total", "Landing Site"]).kind).toBe("orders");
    expect(readHeaders(["foo", "bar"]).kind).toBe("unknown");
  });
});

describe("matching rows to posts", () => {
  it("by link, by tag, then by title", () => {
    expect(linkKey("https://instagram.com/p/CxYz123?igsh=1")).toBe(linkKey(posts[0]!.link));
    expect(
      matchPost({ label: "", link: "https://www.instagram.com/brand/reel/CxYz123" }, posts),
    ).toEqual({
      postId: posts[0]!.id,
      by: "link",
    });
    expect(matchPost({ label: `Ad ${tagCode(posts[1]!.id)} v2`, link: "" }, posts)).toEqual({
      postId: posts[1]!.id,
      by: "tag",
    });
    expect(matchPost({ label: "Kitchen before/after – ad", link: "" }, posts).postId).toBe(
      posts[1]!.id,
    );
    expect(matchPost({ label: "Something else entirely", link: "" }, posts).postId).toBeNull();
    expect(likeness("the stain", "Reel 1, the stain")).toBe(1);
  });

  it("makes a tagged link from the client's site", () => {
    const link = taggedLink("danyclean.tn/shop", {
      id: posts[0]!.id,
      platform: "instagram",
      paid: true,
    });
    expect(link).toBe(
      "https://danyclean.tn/shop?utm_source=instagram&utm_medium=paid&utm_campaign=gecko&utm_content=gka1b2c3",
    );
    expect(taggedLink("", { id: "x", platform: "tiktok", paid: false })).toBeNull();
    expect(taggedLink("not a site", { id: "x", platform: "tiktok", paid: false })).toBeNull();
  });
});

describe("a whole export", () => {
  it("adds up an Ads Manager export by ad, skips the total line", () => {
    const csv = [
      "Reporting starts,Ad name,Amount spent (TND),Impressions,3-second video plays,ThruPlays,Link clicks,Purchases,Purchases conversion value",
      '2026-11-01,Reel 1 the stain,50.5,10000,3000,900,120,4,"1,200.00"',
      "2026-11-02,Reel 1 the stain,49.5,8000,2500,800,100,3,900",
      "2026-11-01,Unknown ad,10,500,100,20,5,0,0",
      ",Total,110,18500,5600,1720,225,7,2100",
    ].join("\n");
    const out = readExport(csv, posts);
    expect(out.kind).toBe("metrics");
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toEqual({
      label: "Reel 1 the stain",
      link: "",
      metrics: {
        spend: 100,
        impressions: 18000,
        views3s: 5500,
        views15s: 1700,
        clicks: 220,
        purchases: 7,
        revenue: 2100,
      },
      postId: posts[0]!.id,
      by: "title",
    });
    expect(out.rows[1]!.postId).toBeNull();
  });

  it("reads a TikTok export with a title line above the headers", () => {
    const csv = [
      "TikTok Studio · Content",
      "Video title,Video link,Total views,Average watch time,Watched full video (%),Total shares",
      `TikTok trend,${posts[2]!.link},"12,400",0:07,31.5%,40`,
    ].join("\n");
    const out = readExport(csv, posts);
    expect(out.rows[0]!.metrics).toEqual({
      views: 12400,
      avgWatch: 7,
      completion: 31.5,
      shares: 40,
    });
    expect(out.rows[0]!.by).toBe("link");
  });

  it("counts tagged Shopify orders once per order", () => {
    const code = tagCode(posts[0]!.id);
    const csv = [
      "Name,Email,Total,Landing Site,Lineitem name",
      `#1001,a@x.tn,120.000,/shop?utm_content=${code},Spray`,
      `#1001,a@x.tn,120.000,/shop?utm_content=${code},Cloth`,
      "#1002,b@x.tn,80.000,/,Spray",
      `#1003,c@x.tn,\"1,000.000\",/?utm_content=${code.toUpperCase()},Kit`,
    ].join("\n");
    const out = readExport(csv, posts);
    expect(out.kind).toBe("orders");
    expect(out.orders).toEqual({ read: 3, untagged: 1 });
    expect(out.rows).toEqual([
      {
        label: "Reel 1, the stain",
        link: "",
        metrics: { purchases: 2, revenue: 1120 },
        postId: posts[0]!.id,
        by: "tag",
      },
    ]);
  });
});
