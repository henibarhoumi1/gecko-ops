import { matches } from "./CommandPalette";

describe("search and jump", () => {
  it("finds a place when every word typed is in it, in any order", () => {
    expect(matches("Dany Clean · Scripts Scripts", "dany scripts")).toBe(true);
    expect(matches("Dany Clean · Scripts Scripts", "scripts dany")).toBe(true);
    expect(matches("RareRich · Money Money", "dany")).toBe(false);
    expect(matches("Anything", "  ")).toBe(true);
  });
});
