import { describe, expect, it } from "vitest";
import { batch, code, deliverableName } from "./naming";
import { campaignMix } from "./strategy";

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
