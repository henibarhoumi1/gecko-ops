import {
  allTags,
  filterRoster,
  initials,
  instagramLink,
  parseTags,
  type RosterEntry,
} from "./model";

const entry = (over: Partial<RosterEntry>): RosterEntry => ({
  id: over.name ?? "x",
  workspace_id: "w",
  kind: "talent",
  name: "Someone",
  role: "",
  city: "",
  phone: "",
  instagram: "",
  link: "",
  photo_url: "",
  rate: null,
  rate_note: "",
  tags: [],
  notes: "",
  rating: null,
  email: "",
  gear: [],
  hidden: false,
  author_name: "",
  created_at: "",
  updated_at: "",
  ...over,
});

describe("roster", () => {
  const list = [
    entry({ name: "Yasmine", role: "Actor", city: "Tunis", tags: ["skincare", "warm"], rating: 5 }),
    entry({ name: "Amine", role: "Model", city: "Sousse", tags: ["sport"], rating: 3 }),
    entry({ name: "Hidden one", role: "Actor", hidden: true }),
  ];
  const none = { q: "", role: "", tag: "", showHidden: false };

  it("leaves hidden entries out unless asked, best rated first", () => {
    expect(filterRoster(list, none).map((e) => e.name)).toEqual(["Yasmine", "Amine"]);
    expect(filterRoster(list, { ...none, showHidden: true })).toHaveLength(3);
  });

  it("searches names, cities and tags, and filters by role and tag", () => {
    expect(filterRoster(list, { ...none, q: "sousse" }).map((e) => e.name)).toEqual(["Amine"]);
    expect(filterRoster(list, { ...none, q: "skin" }).map((e) => e.name)).toEqual(["Yasmine"]);
    expect(filterRoster(list, { ...none, role: "actor" }).map((e) => e.name)).toEqual(["Yasmine"]);
    expect(filterRoster(list, { ...none, tag: "sport" }).map((e) => e.name)).toEqual(["Amine"]);
  });

  it("cleans tags and lists them by use", () => {
    expect(parseTags(" Summer, outdoor ,summer,, ")).toEqual(["summer", "outdoor"]);
    expect(allTags(list)).toEqual(["skincare", "sport", "warm"]);
  });

  it("links Instagram handles and makes initials", () => {
    expect(instagramLink("@yasmine.b")).toBe("https://instagram.com/yasmine.b");
    expect(instagramLink("not a handle!")).toBeNull();
    expect(initials("Yasmine Ben Ali")).toBe("YB");
  });
});
