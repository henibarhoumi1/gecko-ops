import { env } from "node:process";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Which Supabase project the built app talks to. The live app (built from main) uses the build variables
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in Cloudflare. Pull-request previews (Cloudflare builds
// of any other branch) and the gecko-app-testing worker (built with GECKO_BACKEND=testing) use the testing
// project instead, which holds fake data only. Both values below are public: the anon key ships to every
// browser that opens the app.
const TESTING_BACKEND = {
  url: "https://arzjqtysedaxktzyoxuf.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyempxdHlzZWRheGt0enlveHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NTUxOTksImV4cCI6MjEwOTIzMTE5OX0.pN85_gbvJS7r4IYbjWzVWWy6i2DxlxDaHkEkfBjyhNs",
};
// "release" is the branch the live app builds from (deploy-production moves it after the database is updated).
const LIVE_BRANCHES = ["main", "release", "production"];
const branch = env.WORKERS_CI_BRANCH;
if (env.GECKO_BACKEND === "testing" || (branch && !LIVE_BRANCHES.includes(branch))) {
  env.VITE_SUPABASE_URL = TESTING_BACKEND.url;
  env.VITE_SUPABASE_ANON_KEY = TESTING_BACKEND.anonKey;
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
