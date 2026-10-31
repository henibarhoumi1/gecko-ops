import {
  attachmentHeader,
  finalPrefix,
  matchVideoRoute,
  safeName,
  signLink,
  streamHost,
  verifyLink,
} from "./lib";

const id = "20000000-0000-4000-8000-000000000001";

describe("matchVideoRoute", () => {
  it("reads the video and the action", () => {
    expect(matchVideoRoute(`/api/videos/${id}/watch`)).toEqual({ videoId: id, action: "watch" });
    expect(matchVideoRoute(`/api/videos/${id}/final/part`)).toEqual({
      videoId: id,
      action: "final/part",
    });
    expect(matchVideoRoute(`/api/videos/${id}/preview/attach`)?.action).toBe("preview/attach");
    expect(matchVideoRoute(`/api/videos/${id}/delete`)?.action).toBe("delete");
  });
  it("refuses anything else", () => {
    expect(matchVideoRoute(`/api/videos/not-a-uuid/watch`)).toBeNull();
    expect(matchVideoRoute(`/api/videos/${id}/remove`)).toBeNull();
    expect(matchVideoRoute(`/api/videos/ABCDEF00-0000-4000-8000-000000000001/watch`)).toBeNull();
    expect(matchVideoRoute(`/api/videos/${id}/watch/extra`)).toBeNull();
  });
});

describe("file names", () => {
  it("keeps finals under their client", () => {
    expect(finalPrefix({ workspaceId: "w", clientId: "c-dany", videoId: id })).toBe(
      `w/c-dany/${id}/`,
    );
  });
  it("makes names safe for storage keys", () => {
    expect(safeName("Reel 1 (final) é.mp4")).toBe("Reel-1-final-e.mp4");
    expect(safeName("../../etc/passwd")).toBe("etc-passwd");
    expect(safeName("")).toBe("final");
  });
  it("keeps the real name for the browser", () => {
    expect(attachmentHeader('Réel "1".mp4')).toBe(
      `attachment; filename="R_el _1_.mp4"; filename*=UTF-8''R%C3%A9el%20%221%22.mp4`,
    );
  });
});

describe("download links", () => {
  const claims = { k: "w/c/v/final.mp4", n: "Reel 1.mp4", e: 2_000_000_000 };

  it("round-trips", async () => {
    const token = await signLink(claims, "secret");
    expect(await verifyLink(token, "secret", 1_900_000_000)).toEqual(claims);
  });
  it("refuses a link signed with another secret", async () => {
    const token = await signLink(claims, "secret");
    expect(await verifyLink(token, "other", 1_900_000_000)).toBeNull();
  });
  it("refuses an expired link", async () => {
    const token = await signLink(claims, "secret");
    expect(await verifyLink(token, "secret", 2_000_000_001)).toBeNull();
  });
  it("refuses a link whose file was swapped", async () => {
    const token = await signLink(claims, "secret");
    const [, sig] = token.split(".");
    const forged = btoa(JSON.stringify({ ...claims, k: "w/other/v/final.mp4" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifyLink(`${forged}.${sig}`, "secret", 1_900_000_000)).toBeNull();
    expect(await verifyLink("garbage", "secret")).toBeNull();
  });
});

describe("streamHost", () => {
  it("reads the customer host", () => {
    expect(streamHost("https://customer-abc123.cloudflarestream.com/uid/watch")).toBe(
      "customer-abc123.cloudflarestream.com",
    );
  });
  it("ignores anything else", () => {
    expect(streamHost("https://evil.example.com/uid/watch")).toBeNull();
    expect(streamHost(undefined)).toBeNull();
  });
});
