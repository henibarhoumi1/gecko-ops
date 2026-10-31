import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readBackendConfig } from "./env";

const config = readBackendConfig(import.meta.env);

/** The one Supabase client for the app, or null when the build has no backend configured. */
export const supabase: SupabaseClient | null = config
  ? createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** The public anon key, sent with calls to the app's own worker so it can ask the database as you. */
export const anonKey: string = config?.anonKey ?? "";

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("This build is not connected to Supabase.");
  return supabase;
}
