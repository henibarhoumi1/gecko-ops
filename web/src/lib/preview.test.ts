import { describe, expect, it } from "vitest";
import { parsePreviewPath, previewPath } from "./preview";

describe("preview addresses", () => {
  it("round-trips a client and role", () => {
    expect(parsePreviewPath(previewPath("c439eca6cf027", "viewer"))).toEqual({
      clientId: "c439eca6cf027",
      role: "viewer",
    });
    expect(parsePreviewPath("/preview/abc/owner/scripts")).toEqual({
      clientId: "abc",
      role: "owner",
    });
  });
  it("ignores anything else", () => {
    expect(parsePreviewPath("/clients/abc")).toBeNull();
    expect(parsePreviewPath("/preview/abc/admin")).toBeNull();
  });
});
