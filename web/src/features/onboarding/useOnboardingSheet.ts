import { useCallback, useEffect, useRef, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { changedKeys, type Answers } from "./progress";

interface Row {
  data: Answers;
  updatedAt: string | null;
  sentAt: string | null;
}

export interface SheetTarget {
  workspaceId: string;
  clientId: string;
}

type Status = "loading" | "saved" | "saving" | "error";

const SAVE_AFTER_MS = 700;
const PULL_EVERY_MS = 4000;

async function fetchRow(target: SheetTarget): Promise<Row> {
  const { data, error } = await requireSupabase().rpc("get_client_onboarding", {
    p_workspace_id: target.workspaceId,
    p_client_id: target.clientId,
  });
  if (error) throw error;
  return data as Row;
}

async function pushPatch(target: SheetTarget, patch: Answers, sent: boolean): Promise<Row> {
  const { data, error } = await requireSupabase().rpc("save_client_onboarding", {
    p_workspace_id: target.workspaceId,
    p_client_id: target.clientId,
    p_patch: patch,
    p_sent: sent,
  });
  if (error) throw error;
  return data as Row;
}

/**
 * One client's onboarding sheet, shared live by the client and the team. Typing saves only the
 * changed answers a moment later; every few seconds the sheet takes what the other side changed,
 * except answers this screen is still saving.
 */
export function useOnboardingSheet(target: SheetTarget) {
  const [answers, setAnswers] = useState<Answers>({});
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const synced = useRef<Answers>({});
  const local = useRef<Answers>({});
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const apply = useCallback((row: Row) => {
    const server = row.data ?? {};
    // Keep anything typed here that isn't saved yet; take everything else from the server.
    const pending = changedKeys(synced.current, local.current);
    const next: Answers = { ...server };
    for (const [key, value] of Object.entries(pending)) {
      if (value === null) delete next[key];
      else next[key] = value;
    }
    synced.current = server;
    local.current = next;
    setAnswers(next);
    setSentAt(row.sentAt);
  }, []);

  const flush = useCallback(
    async (sent = false) => {
      window.clearTimeout(timer.current);
      const patch = changedKeys(synced.current, local.current);
      if (!sent && Object.keys(patch).length === 0) return;
      busy.current = true;
      setStatus("saving");
      try {
        apply(await pushPatch(target, patch, sent));
        setStatus("saved");
        setError("");
      } catch (e) {
        setStatus("error");
        setError(friendlyError(e));
        throw e;
      } finally {
        busy.current = false;
      }
    },
    [apply, target],
  );

  useEffect(() => {
    let live = true;
    fetchRow(target).then(
      (row) => {
        if (!live) return;
        apply(row);
        setStatus("saved");
      },
      (e) => {
        if (!live) return;
        setStatus("error");
        setError(friendlyError(e));
      },
    );
    const pull = window.setInterval(() => {
      if (busy.current || document.hidden) return;
      if (Object.keys(changedKeys(synced.current, local.current)).length) return;
      fetchRow(target).then(
        (row) => live && !busy.current && apply(row),
        () => undefined,
      );
    }, PULL_EVERY_MS);
    return () => {
      live = false;
      window.clearInterval(pull);
      window.clearTimeout(timer.current);
    };
  }, [apply, target]);

  // Save what's left when the screen closes.
  useEffect(
    () => () => {
      if (Object.keys(changedKeys(synced.current, local.current)).length)
        void flush().catch(() => undefined);
    },
    [flush],
  );

  const set = useCallback(
    (key: string, value: unknown) => {
      const next = { ...local.current };
      const empty = value == null || (Array.isArray(value) && value.length === 0) || value === "";
      if (empty) delete next[key];
      else next[key] = value;
      local.current = next;
      setAnswers(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush().catch(() => undefined), SAVE_AFTER_MS);
    },
    [flush],
  );

  const send = useCallback(() => flush(true), [flush]);

  return { answers, set, send, sentAt, status, error, ready: status !== "loading" };
}
