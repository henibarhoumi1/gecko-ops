// Tells Gecko when something goes wrong in someone's browser, so Heni hears about it without waiting for
// a client to say so. Sends only the error text, the page path and which client: never form contents.
// The database keeps at most 30 reports per person per hour; here, each distinct error is sent once per
// page load and at most 10 in total. Reporting never throws and never shows anything to the person.

import { isPreviewing } from "./previewGuard";
import { supabase } from "./supabase";

export type ErrorArea = "crash" | "request" | "unexpected";

interface Context {
  workspaceId: string | null;
  clientId: string | null;
}

export interface Report {
  area: ErrorArea;
  message: string;
  path: string;
}

/** Plain text for any thrown value, cut to 500 characters. */
export function errorText(error: unknown): string {
  const text =
    error instanceof Error
      ? `${error.name === "Error" ? "" : `${error.name}: `}${error.message}`
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return text.trim().slice(0, 500);
}

/** Errors that aren't Gecko's problem: the browser going offline, extensions, a preview's own block. */
export function isNoise(message: string): boolean {
  return (
    message === "" ||
    /preview_read_only|ResizeObserver loop|Script error\.?$|AbortError|The user aborted a request/i.test(
      message,
    )
  );
}

/** Decides what to send: each distinct error once, at most `limit` per page load. */
export function makeReporter(send: (report: Report) => void, limit = 10) {
  const seen = new Set<string>();
  return (area: ErrorArea, error: unknown, path: string) => {
    const message = errorText(error);
    if (isNoise(message) || seen.size >= limit) return;
    const key = `${area}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    send({ area, message, path });
  };
}

let context: Context = { workspaceId: null, clientId: null };

/** Which brand (or, for the team, which workspace) the person is looking at, for the reports. */
export function setErrorContext(next: Context): void {
  context = next;
}

const report = makeReporter(({ area, message, path }) => {
  if (!supabase || isPreviewing()) return;
  void supabase
    .rpc("report_client_error", {
      p_workspace_id: context.workspaceId,
      p_client_id: context.clientId,
      p_area: area,
      p_message: message,
      p_path: path,
    })
    .then(
      () => undefined,
      () => undefined,
    );
});

export function reportError(area: ErrorArea, error: unknown): void {
  try {
    report(area, error, window.location.pathname.slice(0, 300));
  } catch {
    // Reporting must never cause a second problem.
  }
}

/** Catches errors nothing else handled. Call once at start-up. */
export function listenForUnhandledErrors(): void {
  window.addEventListener("error", (event) =>
    reportError("unexpected", event.error ?? event.message),
  );
  window.addEventListener("unhandledrejection", (event) => reportError("unexpected", event.reason));
}
