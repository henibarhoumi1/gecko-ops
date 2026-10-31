import { countByStatus, fromRows, groupConcepts, refLines, type Concept } from "./model";

function concept(fields: Partial<Concept>): Concept {
  return {
    id: fields.id ?? "x",
    title: "T",
    format: "reel",
    body: "",
    refs: "",
    position: 0,
    fromClient: false,
    status: "review",
    version: 1,
    approvedVersion: null,
    approvedAt: null,
    approvedBy: null,
    authorName: "",
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    notes: [],
    ...fields,
  };
}

describe("groupConcepts", () => {
  const all = [
    concept({ id: "a", status: "approved" }),
    concept({ id: "b", status: "review", position: 2 }),
    concept({ id: "c", status: "review", position: 1 }),
    concept({ id: "d", status: "draft" }),
    concept({ id: "e", status: "idea", fromClient: true }),
  ];

  it("puts what waits for the client first and never shows them drafts", () => {
    const groups = groupConcepts(all, "client");
    expect(groups.map((g) => g.status)).toEqual(["review", "approved", "idea"]);
    expect(groups[0]!.items.map((c) => c.id)).toEqual(["c", "b"]);
  });

  it("shows the team every status, client requests first", () => {
    const groups = groupConcepts([...all, concept({ id: "f", status: "changes" })], "team");
    expect(groups.map((g) => g.status)).toEqual(["changes", "idea", "draft", "review", "approved"]);
  });

  it("counts each status", () => {
    expect(countByStatus(all)).toEqual({ draft: 1, review: 2, changes: 0, approved: 1, idea: 1 });
  });
});

describe("refLines", () => {
  it("links only web addresses, one per line", () => {
    expect(refLines("https://instagram.com/reel/1\n\n  javascript:alert(1)\nthe blue one")).toEqual(
      [
        { text: "https://instagram.com/reel/1", href: "https://instagram.com/reel/1" },
        { text: "javascript:alert(1)", href: null },
        { text: "the blue one", href: null },
      ],
    );
  });
});

describe("fromRows", () => {
  it("attaches each note to its concept, oldest first", () => {
    const [c] = fromRows(
      [
        {
          id: "k1",
          title: "Spill",
          format: "reel",
          body: "",
          refs: "",
          position: 0,
          from_client: false,
          status: "approved",
          version: 2,
          approved_version: 2,
          approved_at: "2026-11-02T10:00:00Z",
          approved_by: "Dany",
          author_name: "Heni",
          created_at: "2026-11-01T10:00:00Z",
          updated_at: "2026-11-02T10:00:00Z",
        },
      ],
      [
        {
          id: "n2",
          concept_id: "k1",
          kind: "approve",
          from_client: true,
          author_name: "Dany",
          body: "",
          version: 2,
          created_at: "2026-11-02T10:00:00Z",
        },
        {
          id: "n1",
          concept_id: "k1",
          kind: "comment",
          from_client: false,
          author_name: "Heni",
          body: "v2",
          version: 2,
          created_at: "2026-11-01T11:00:00Z",
        },
        {
          id: "n3",
          concept_id: "other",
          kind: "comment",
          from_client: false,
          author_name: "Heni",
          body: "",
          version: 1,
          created_at: "2026-11-01T11:00:00Z",
        },
      ],
    );
    expect(c!.notes.map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(c!.approvedBy).toBe("Dany");
  });
});
