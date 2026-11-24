import { describe, expect, it } from "vitest";
import { afterCall, callScript } from "./calls";

const lead = {
  stage: "prospect" as const,
  history: [],
  log: [],
  owner_member_id: null,
};

describe("callScript", () => {
  it("names the brand and ends with a voicemail", () => {
    const s = callScript({ brand: "Crush cookies", contact: null, extra: {} });
    expect(s[0]?.say.join(" ")).toContain("Gecko");
    expect(s.at(-1)?.key).toBe("voicemail");
    expect(s.map((x) => x.say.join(" ")).join(" ")).toContain("Crush cookies");
  });
});

describe("afterCall", () => {
  it("books a meeting: the lead moves and the next step is set", () => {
    const r = afterCall(lead, "meeting", "Thursday 10:00", "2026-11-24T09:00:00Z", "heni");
    expect(r.stage).toBe("meeting_booked");
    expect(r.next_step).toBe("Prepare the meeting");
    expect(r.next_date).toBe("2026-11-25");
    expect(JSON.stringify(r.log)).toContain("Thursday 10:00");
    expect(r.owner_member_id).toBe("heni");
  });
  it("no answer: call again tomorrow", () => {
    const r = afterCall(lead, "no_answer", "", "2026-11-24T09:00:00Z", null);
    expect(r.stage).toBe("contacted");
    expect(r.next_date).toBe("2026-11-25");
  });
  it("not interested closes the lead", () => {
    expect(afterCall(lead, "no", "", "2026-11-24T09:00:00Z", null).stage).toBe("lost");
  });
});
