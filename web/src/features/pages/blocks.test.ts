import { describe, expect, it } from "vitest";
import { block, readBlocks, shortcut, TEMPLATES, toText } from "./blocks";

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
