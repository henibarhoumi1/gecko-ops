export interface BackendConfig {
  url: string;
  anonKey: string;
}

const PROJECT_URL =
  /^https:\/\/[a-z0-9]{20}\.supabase\.co$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Reads the public Supabase settings and refuses anything that must never ship to a browser. */
export function readBackendConfig(env: Record<string, string | undefined>): BackendConfig | null {
  const url = (env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  if (!url && !anonKey) return null;
  if (!url || !anonKey) throw new Error("Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  if (!PROJECT_URL.test(url)) throw new Error("VITE_SUPABASE_URL is not a Supabase project URL.");
  if (anonKey.startsWith("sb_secret_") || jwtRole(anonKey) === "service_role") {
    throw new Error("VITE_SUPABASE_ANON_KEY is a secret key. Use the anon (public) key.");
  }
  return { url, anonKey };
}

function jwtRole(token: string): string | undefined {
  const payload = token.split(".")[1];
  if (!payload) return undefined;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { role?: string }).role;
  } catch {
    return undefined;
  }
}
