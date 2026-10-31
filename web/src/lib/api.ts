import { anonKey, requireSupabase } from "./supabase";

/** Headers that let the app's worker ask the database who you are. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await requireSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("sign_in");
  return { authorization: `Bearer ${token}`, apikey: anonKey };
}

/** A JSON call to the app's own worker (/api/…). Errors carry the worker's error code. */
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { ...(await authHeaders()), "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(data?.error ?? `http_${res.status}`);
  // A page instead of JSON means the request never reached the worker.
  if (!data) throw new Error("no_api");
  return data as T;
}

/** Sends a body with upload progress (fetch can't report it), and returns the response text. */
export function sendWithProgress(
  method: "POST" | "PUT",
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress: (loaded: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.responseText);
      let code = `http_${xhr.status}`;
      try {
        code = (JSON.parse(xhr.responseText) as { error?: string }).error ?? code;
      } catch {
        // Not JSON: keep the status code.
      }
      reject(new Error(code));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(body);
  });
}
