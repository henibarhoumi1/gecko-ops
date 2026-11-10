import { useCallback, useSyncExternalStore } from "react";

/**
 * The project a person is looking at, per client, kept on this device so it survives moving between tabs.
 * null means every project at once.
 */
const PREFIX = "gecko.project.";
const listeners = new Set<() => void>();

const keyFor = (workspaceId: string, clientId: string) => `${PREFIX}${workspaceId}.${clientId}`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return memory.get(key) ?? null;
  }
}

// When storage is blocked, the choice lives for this visit only.
const memory = new Map<string, string>();

export function setProjectChoice(workspaceId: string, clientId: string, projectId: string | null) {
  const key = keyFor(workspaceId, clientId);
  try {
    if (projectId) localStorage.setItem(key, projectId);
    else localStorage.removeItem(key);
  } catch {
    if (projectId) memory.set(key, projectId);
    else memory.delete(key);
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The chosen project of a client (null for all), and a way to change it. */
export function useProjectChoice(
  workspaceId: string,
  clientId: string | null,
): [string | null, (projectId: string | null) => void] {
  const key = clientId ? keyFor(workspaceId, clientId) : "";
  const value = useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : null),
    () => null,
  );
  const set = useCallback(
    (projectId: string | null) => {
      if (clientId) setProjectChoice(workspaceId, clientId, projectId);
    },
    [workspaceId, clientId],
  );
  return [value, set];
}

/** Keeps the rows of the chosen project; rows with no project yet always show. */
export function inProject<T extends { projectId?: string | null }>(
  rows: readonly T[],
  projectId: string | null,
): T[] {
  return projectId ? rows.filter((r) => !r.projectId || r.projectId === projectId) : [...rows];
}
