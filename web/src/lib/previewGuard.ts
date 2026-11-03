// Keeps View as client strictly read-only. While a preview is open, every request to the database that
// could change something is stopped in the browser before it is sent, even for parts of the portal the
// team is normally allowed to edit (the brand questions, the whiteboard, results numbers). Only reads,
// sign-in housekeeping and short-lived file links go through.

let previewing = false;

export function setPreviewing(on: boolean): void {
  previewing = on;
}

export function isPreviewing(): boolean {
  return previewing;
}

const READ_RPC = /^(team_preview|get_[a-z0-9_]+|board_rev|whiteboard_rev)$/;

/** Whether a request may go out during a preview. */
export function allowedWhilePreviewing(url: string, method: string): boolean {
  const m = method.toUpperCase();
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  if (path.startsWith("/auth/v1/token") || path === "/auth/v1/logout") return true;
  if (path.startsWith("/storage/v1/object/sign/")) return true;
  const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(path);
  return Boolean(rpc && READ_RPC.test(rpc[1]!));
}

/** fetch for the Supabase client: during a preview, refuses anything that could write. */
export const guardedFetch: typeof fetch = (input, init) => {
  if (previewing) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (!allowedWhilePreviewing(url, method)) {
      return Promise.resolve(
        new Response(JSON.stringify({ code: "preview_read_only", message: "preview_read_only" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      );
    }
  }
  return fetch(input, init);
};
