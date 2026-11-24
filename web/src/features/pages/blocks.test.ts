import { describe, expect, it } from "vitest";
import {
  block,
  calculate,
  columnTotal,
  embedOf,
  parseNum,
  readBlocks,
  shortcut,
  TEMPLATES,
  toText,
} from "./blocks";

describe("shortcut", () => {
  it("turns markdown starts into blocks", () => {
    expect(shortcut("## Plan")).toEqual({ type: "h2", rest: "Plan" });
    expect(shortcut("[] call Dany")).toEqual({ type: "todo", rest: "call Dany" });
    expect(shortcut("- milk")).toEqual({ type: "bullet", rest: "milk" });
    expect(shortcut("---")).toEqual({ type: "divider", rest: "" });
    expect(shortcut("hello")).toBeNull();
  });
});

describe("toText", () => {
  it("writes a page as plain text, numbering lists", () => {
    const t = toText("Brief", [
      block("field", "Dany Clean", { label: "Client" }),
      block("number", "Ideas"),
      block("number", "Scripts"),
      block("todo", "Shoot", { checked: true }),
    ]);
    expect(t).toContain("Client: Dany Clean");
    expect(t).toContain("2. Scripts");
    expect(t).toContain("☑ Shoot");
  });
});

describe("readBlocks", () => {
  it("keeps good blocks and repairs odd ones", () => {
    const b = readBlocks([{ id: "a", type: "h1", text: "Hi" }, { type: "weird" }, null]);
    expect(b).toHaveLength(2);
    expect(b[1]?.type).toBe("text");
  });
});

describe("templates", () => {
  it("each template gives fresh blocks", () => {
    for (const t of TEMPLATES) expect(t.blocks().length).toBeGreaterThan(0);
    const a = TEMPLATES[1]!.blocks();
    const b = TEMPLATES[1]!.blocks();
    expect(a[0]?.id).not.toBe(b[0]?.id);
  });
});

describe("calculate", () => {
  it("does sums, percents and refuses anything else", () => {
    expect(calculate("1200 * 3")).toBe(3600);
    expect(calculate("2,900 x 12")).toBe(34800);
    expect(calculate("1200 * 15%")).toBe(180);
    expect(calculate("(10 + 5) / 2")).toBe(7.5);
    expect(calculate("-4 + 10")).toBe(6);
    expect(calculate("alert(1)")).toBeNull();
    expect(calculate("2 +")).toBeNull();
  });
});

describe("tables", () => {
  it("reads numbers people type and totals a column", () => {
    expect(parseNum("1 200")).toBe(1200);
    expect(parseNum("1,200.50")).toBe(1200.5);
    expect(parseNum("350 TND")).toBe(350);
    expect(parseNum("abc")).toBeNull();
    const rows = [
      ["Item", "Price"],
      ["Studio", "400"],
      ["Talent", "150 TND"],
      ["", ""],
    ];
    expect(columnTotal(rows, 1)).toBe(550);
    expect(columnTotal(rows, 0)).toBeNull();
  });
  it("keeps stored rows square", () => {
    const [b] = readBlocks([{ id: "t", type: "table", text: "", rows: [["a", "b"], ["c"]] }]);
    expect(b?.rows).toEqual([
      ["a", "b"],
      ["c", ""],
    ]);
  });
});

describe("embedOf", () => {
  it("turns known links into players and the rest into link cards", () => {
    expect(embedOf("https://youtu.be/abc123")).toMatchObject({
      kind: "frame",
      src: "https://www.youtube-nocookie.com/embed/abc123",
    });
    expect(embedOf("https://www.youtube.com/shorts/xyz")).toMatchObject({ ratio: "9 / 16" });
    expect(embedOf("https://docs.google.com/spreadsheets/d/AbC/edit#gid=0")).toMatchObject({
      src: "https://docs.google.com/spreadsheets/d/AbC/preview",
    });
    expect(embedOf("https://www.instagram.com/reel/Cx1/")).toMatchObject({
      src: "https://www.instagram.com/reel/Cx1/embed",
    });
    expect(embedOf("https://gecko-creative.com")).toEqual({
      kind: "link",
      host: "gecko-creative.com",
    });
    expect(embedOf("javascript:alert(1)")).toBeNull();
  });
});
