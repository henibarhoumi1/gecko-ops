import { describe, expect, it } from "vitest";
import { errorText, isNoise, makeReporter, type Report } from "./reportError";

describe("errorText", () => {
  it("reads errors, error-like objects and anything else", () => {
    expect(errorText(new Error("boom"))).toBe("boom");
    expect(errorText(new TypeError("x is undefined"))).toBe("TypeError: x is undefined");
    expect(errorText({ message: "permission denied" })).toBe("permission denied");
    expect(errorText("plain")).toBe("plain");
  });

  it("cuts long text to 500 characters", () => {
    expect(errorText("x".repeat(900))).toHaveLength(500);
  });
});

describe("isNoise", () => {
  it("ignores what isn't Gecko's problem", () => {
    expect(isNoise("")).toBe(true);
    expect(isNoise("preview_read_only")).toBe(true);
    expect(isNoise("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(isNoise("Script error.")).toBe(true);
    expect(isNoise("permission denied for table scripts")).toBe(false);
  });
});

describe("makeReporter", () => {
  it("sends each distinct error once", () => {
    const sent: Report[] = [];
    const report = makeReporter((r) => sent.push(r));
    report("crash", new Error("boom"), "/scripts");
    report("crash", new Error("boom"), "/scripts");
    report("request", new Error("boom"), "/scripts");
    expect(sent).toEqual([
      { area: "crash", message: "boom", path: "/scripts" },
      { area: "request", message: "boom", path: "/scripts" },
    ]);
  });

  it("stops after the limit and skips noise", () => {
    const sent: Report[] = [];
    const report = makeReporter((r) => sent.push(r), 3);
    report("unexpected", "Script error.", "/");
    for (let i = 0; i < 10; i++) report("unexpected", `error ${i}`, "/");
    expect(sent.map((r) => r.message)).toEqual(["error 0", "error 1", "error 2"]);
  });
});
