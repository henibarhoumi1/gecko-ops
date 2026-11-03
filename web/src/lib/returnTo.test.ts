import { beforeEach, describe, expect, it } from "vitest";
import { isReturnPath, saveReturnTo, takeReturnTo } from "./returnTo";

describe("return to the link after sign-in", () => {
  beforeEach(() => localStorage.clear());

  it("keeps paths inside the app only", () => {
    expect(isReturnPath("/scripts")).toBe(true);
    expect(isReturnPath("/review?cut=1#t=12")).toBe(true);
    expect(isReturnPath("/")).toBe(false);
    expect(isReturnPath("/sign-in")).toBe(false);
    expect(isReturnPath("/invite/abc")).toBe(false);
    expect(isReturnPath("//evil.example.com")).toBe(false);
    expect(isReturnPath("https://evil.example.com")).toBe(false);
  });

  it("gives the path back once", () => {
    saveReturnTo("/scripts", 1000);
    expect(takeReturnTo(2000)).toBe("/scripts");
    expect(takeReturnTo(2000)).toBeNull();
  });

  it("forgets it after 30 minutes", () => {
    saveReturnTo("/scripts", 0);
    expect(takeReturnTo(31 * 60 * 1000)).toBeNull();
  });

  it("ignores anything tampered with", () => {
    localStorage.setItem("gecko.returnTo", JSON.stringify({ path: "//evil.example.com", at: 0 }));
    expect(takeReturnTo(1)).toBeNull();
    localStorage.setItem("gecko.returnTo", "not json");
    expect(takeReturnTo(1)).toBeNull();
  });
});
