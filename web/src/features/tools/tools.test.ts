import { describe, expect, it } from "vitest";
import { batch, code, deliverableName } from "./naming";
import { campaignMix } from "./strategy";
import { toBank } from "./hookBank";
import { missingRates, price } from "./pricing";
import { creativePlan, diagnose, economics, hookLab, REEL_CHECKS, reelScore } from "./growth";

describe("deliverableName", () => {
  it("builds the standard name", () => {
    expect(
      deliverableName({
        client: "Dany Clean",
        campaign: "Launch campaign",
        reel: 3,
        hook: "b",
        format: "9x16",
        version: 2,
        kind: "MASTER",
        date: "",
        ext: "mp4",
      }),
    ).toBe("DANY_LAUNCH_R03_HookB_9x16_v02.mp4");
  });
  it("cleans accents and symbols", () => {
    expect(code("Pâtisserie l'Été")).toBe("PATISSER");
  });
  it("makes a whole delivery at once", () => {
    const list = batch(
      { client: "Dany", campaign: "Launch", version: 1, kind: "MASTER", date: "", ext: "mp4" },
      2,
      ["A", "B"],
      ["9x16", "1x1"],
    );
    expect(list).toHaveLength(8);
    expect(new Set(list).size).toBe(8);
  });
});

describe("campaignMix", () => {
  it("splits every video across the stages", () => {
    const mix = campaignMix("launch", 10);
    expect(mix.reduce((s, m) => s + m.count, 0)).toBe(10);
    expect(mix.every((m) => m.formats.length > 0)).toBe(true);
  });
});

describe("toBank", () => {
  it("puts hooks clients picked and approved first, skips empty ones", () => {
    const bank = toBank([
      {
        id: "a",
        client_id: "c",
        title: "A",
        style: "ugc",
        status: "draft",
        hook: null,
        hooks: [{ hear: "Old" }, {}],
        updated_at: "2026-11-20",
      },
      {
        id: "b",
        client_id: "c",
        title: "B",
        style: "ugc",
        status: "approved",
        hook: 1,
        hooks: [{ hear: "One" }, { hear: "Winner" }],
        updated_at: "2026-11-01",
      },
    ]);
    expect(bank[0]?.line).toBe("Winner");
    expect(bank.map((h) => h.line)).not.toContain("");
    expect(bank).toHaveLength(3);
  });
});

describe("price", () => {
  const rates = {
    perReel: 100,
    shootDay: 500,
    ugcVideo: null,
    extraHook: 20,
    cutdown: 10,
    rush: 200,
    taxPct: 19,
  };
  it("adds lines, discount, tax and a 50% deposit", () => {
    const p = price(rates, {
      reels: 10,
      shootDays: 1,
      ugc: 0,
      extraHooks: 5,
      cutdowns: 0,
      rush: false,
      discountPct: 10,
    });
    expect(p.subtotal).toBe(1600);
    expect(p.discount).toBe(160);
    expect(p.tax).toBe(273.6);
    expect(p.deposit).toBe(Math.round(p.total / 2));
  });
  it("says which rates are missing", () => {
    expect(
      missingRates(rates, {
        reels: 1,
        shootDays: 0,
        ugc: 2,
        extraHooks: 0,
        cutdowns: 0,
        rush: false,
        discountPct: 0,
      }),
    ).toEqual(["UGC video"]);
  });
});

describe("growth tools", () => {
  it("plans enough distinct concepts for the budget, none sharing angle, buyer and format with its neighbour", () => {
    const p = creativePlan({
      goal: "sales",
      budget: 3000,
      targetCpa: 20,
      personas: ["Mums", "Students"],
    });
    expect(p.testSpend).toBe(50);
    expect(p.concepts).toBe(18);
    for (let i = 1; i < p.matrix.length; i++) {
      const a = p.matrix[i - 1]!;
      const b = p.matrix[i]!;
      expect(a.angle === b.angle && a.persona === b.persona && a.format === b.format).toBe(false);
    }
    expect(creativePlan({ goal: "brand", budget: 0, targetCpa: 0, personas: [] }).concepts).toBe(3);
  });
  it("reads an ad's numbers and says what to fix", () => {
    const base = {
      name: "A",
      impressions: 10000,
      plays: 1200,
      thruplays: 500,
      clicks: 90,
      results: 2,
      revenue: 0,
    };
    expect(diagnose({ ...base, spend: 20 }, 25).verdict).toBe("early");
    expect(diagnose({ ...base, spend: 150, results: 8 }, 25).verdict).toBe("scale");
    expect(diagnose({ ...base, spend: 150 }, 25).verdict).toBe("fix-hook");
    expect(diagnose({ ...base, plays: 3500, thruplays: 400, spend: 150 }, 25).verdict).toBe(
      "fix-body",
    );
  });
  it("counts refused cash-on-delivery parcels in the break-even", () => {
    const e = economics({
      price: 100,
      productCost: 30,
      delivery: 8,
      packaging: 2,
      returnRate: 0.2,
      returnCost: 7,
      fees: 0,
      margin: 0.1,
      orders: 100,
    });
    expect(e.profitPerOrder).toBe(44.6);
    expect(e.breakEvenCpa).toBe(44.6);
    expect(e.targetCpa).toBe(36.6);
    expect(e.budget).toBe(3660);
  });
  it("scores a reel by what each platform weighs", () => {
    const all = new Set(REEL_CHECKS.map((c) => c.key));
    expect(reelScore(all, "reels").score).toBe(100);
    const r = reelScore(new Set(["hook"]), "reels");
    expect(r.level).toBe("rework");
    expect(r.missing[0]?.key).toBe("send");
  });
  it("writes hooks and marks the missing words", () => {
    const h = hookLab({
      product: "Dany Clean",
      audience: "",
      pain: "the bathroom smells",
      result: "",
      objection: "",
    });
    expect(h.length).toBeGreaterThan(10);
    expect(h[1]?.line).toBe("If you're [who it's for] and the bathroom smells, watch this.");
  });
});
