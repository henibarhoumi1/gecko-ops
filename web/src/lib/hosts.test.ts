import { originFor } from "./hosts";

describe("originFor", () => {
  it("sends clients to the client address", () =>
    expect(originFor("client", "https://app.gecko-creative.com")).toBe(
      "https://client.gecko-creative.com",
    ));
  it("sends the team to the app address", () =>
    expect(originFor("team", "https://client.gecko-creative.com")).toBe(
      "https://app.gecko-creative.com",
    ));
  it("keeps the host when it is already right", () =>
    expect(originFor("client", "https://client.gecko-creative.com")).toBe(
      "https://client.gecko-creative.com",
    ));
  it("leaves local and preview hosts alone", () => {
    expect(originFor("client", "http://localhost:5173")).toBe("http://localhost:5173");
    expect(originFor("team", "https://gecko-app.example.workers.dev")).toBe(
      "https://gecko-app.example.workers.dev",
    );
  });
});
