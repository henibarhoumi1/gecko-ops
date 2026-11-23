import type { Lead } from "./model";
import { sortLeads } from "./crm";

const lead = (id: string, over: Partial<Lead>): Lead =>
  ({
    workspace_id: "w",
    id,
    brand: id,
    stage: "prospect",
    value: null,
    owner_member_id: null,
    next_date: null,
    history: [],
    log: [],
    created_at: "2026-11-01",
    ...over,
  }) as Lead;

describe("sortLeads", () => {
  const leads = [
    lead("b", { value: 3800, next_date: "2026-11-25", stage: "proposal_sent" }),
    lead("a", { value: null, next_date: "2026-11-21" }),
    lead("c", { value: 999, log: [{ at: "2026-11-20T10:00:00Z", text: "hi" }] }),
  ];
  const owner = () => "";

  it("sorts by value with empty values last, both ways", () => {
    expect(sortLeads(leads, "value", "desc", owner).map((l) => l.id)).toEqual(["b", "c", "a"]);
    expect(sortLeads(leads, "value", "asc", owner).map((l) => l.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts by next date and by stage order", () => {
    expect(sortLeads(leads, "next", "asc", owner).map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(sortLeads(leads, "stage", "desc", owner)[0]!.id).toBe("b");
  });

  it("puts leads never touched last", () => {
    expect(sortLeads(leads, "touch", "desc", owner)[0]!.id).toBe("c");
  });
});
