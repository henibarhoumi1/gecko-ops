import { readBackendConfig } from "./env";

const url = "https://oqsrqydyedbvtzuhutwv.supabase.co";
const jwt = (role: string) => `x.${btoa(JSON.stringify({ role }))}.y`;

describe("readBackendConfig", () => {
  it("returns null when nothing is set", () => {
    expect(readBackendConfig({})).toBeNull();
  });

  it("accepts a project URL with the anon key", () => {
    expect(
      readBackendConfig({ VITE_SUPABASE_URL: `${url}/`, VITE_SUPABASE_ANON_KEY: jwt("anon") }),
    ).toEqual({
      url,
      anonKey: jwt("anon"),
    });
  });

  it("refuses half a config", () => {
    expect(() => readBackendConfig({ VITE_SUPABASE_URL: url })).toThrow(/both/);
  });

  it("refuses secret keys", () => {
    expect(() =>
      readBackendConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: jwt("service_role") }),
    ).toThrow(/secret/);
    expect(() =>
      readBackendConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: "sb_secret_abc" }),
    ).toThrow(/secret/);
  });

  it("refuses other hosts", () => {
    expect(() =>
      readBackendConfig({
        VITE_SUPABASE_URL: "https://evil.example.com",
        VITE_SUPABASE_ANON_KEY: jwt("anon"),
      }),
    ).toThrow(/URL/);
  });
});
