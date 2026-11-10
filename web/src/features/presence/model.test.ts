import { describe, expect, it } from "vitest";
import { hereLine, initials, pagePath } from "./model";

describe("presence", () => {
  it("names the same page on both sides", () => {
    expect(pagePath("/clients/c-1/scripts", "c-1")).toBe("/scripts");
    expect(pagePath("/clients/rare%20rich/room", "rare rich")).toBe("/room");
    expect(pagePath("/scripts")).toBe("/scripts");
    expect(pagePath("/preview/c-1/owner/scripts")).toBe("/scripts");
    expect(pagePath("/clients/c-1", "c-1")).toBe("/");
    expect(pagePath("/review/abc")).toBe("/review");
  });

  it("says who is here", () => {
    expect(hereLine([], "team")).toBe("");
    expect(hereLine([{ name: "Sara", team: true }], "client")).toBe("Sara (Gecko) is here too");
    expect(
      hereLine(
        [
          { name: "Olfa", team: false },
          { name: "Sami", team: true },
        ],
        "team",
      ),
    ).toBe("Olfa and Sami are here too");
    expect(
      hereLine(
        [
          { name: "A", team: true },
          { name: "B", team: true },
          { name: "C", team: true },
        ],
        "team",
      ),
    ).toBe("A and 2 others are here too");
    expect(initials("Olfa Ben Ali")).toBe("OB");
    expect(initials("owner@tk.test")).toBe("OT");
  });
});
