import { describe, expect, it } from "vitest";
import { pickPortal, portalKey } from "./portalChoice";

const a = { workspaceId: "w", clientId: "rarerich", brand: "RareRich" };
const b = { workspaceId: "w", clientId: "na9ouba", brand: "RareRich & Na9ouba" };

describe("pickPortal", () => {
  it("opens the remembered brand", () => {
    expect(pickPortal([a, b], portalKey(b))).toBe(b);
  });
  it("falls back to the first brand", () => {
    expect(pickPortal([a, b], null)).toBe(a);
    expect(pickPortal([a, b], "w/gone")).toBe(a);
  });
});
