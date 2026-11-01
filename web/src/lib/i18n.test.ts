import { afterEach, describe, expect, it } from "vitest";
import { getLang, plural, setLang, setTeamMode, t } from "./i18n";

afterEach(() => {
  setTeamMode(false);
  setLang("en");
});

describe("i18n", () => {
  it("picks the pair for the language in use and remembers it", () => {
    setLang("fr");
    expect(t("Approve", "Valider")).toBe("Valider");
    expect(localStorage.getItem("gecko.lang")).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    setLang("en");
    expect(t("Approve", "Valider")).toBe("Approve");
  });

  it("keeps the team app in English whatever the switch says", () => {
    setLang("fr");
    setTeamMode(true);
    expect(getLang()).toBe("fr");
    expect(t("Approve", "Valider")).toBe("Approve");
  });

  it("counts with the right word in each language", () => {
    expect(plural(1, ["card", "cards"], ["carte", "cartes"])).toBe("1 card");
    expect(plural(0, ["card", "cards"], ["carte", "cartes"])).toBe("0 cards");
    setLang("fr");
    expect(plural(0, ["card", "cards"], ["carte", "cartes"])).toBe("0 carte");
    expect(plural(3, ["card", "cards"], ["carte", "cartes"])).toBe("3 cartes");
  });
});
