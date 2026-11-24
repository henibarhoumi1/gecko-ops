// Finance OS data (supabase/migrations/202612180001_finance_os.sql): the ledger, the opening balance, who can look,
// and the factures in their private bucket.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import type { Entry, Kind, Method, Status } from "./model";

export type FinanceRole = "owner" | "viewer" | null;

export function useFinanceAccess() {
  const { id: workspaceId, role } = useWorkspace();
  return useQuery({
    queryKey: ["finance-role", workspaceId],
    queryFn: async (): Promise<FinanceRole> => {
      const { data, error } = await requireSupabase().rpc("finance_role", {
        p_workspace_id: workspaceId,
      });
      // A database without Finance OS yet: the founder still owns it.
      if (error) return role === "founder" ? "owner" : null;
      return (data as FinanceRole) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

interface EntryRow {
  id: string;
  kind: Kind;
  status: Status;
  title: string;
  category: string;
  counterparty: string;
  client_id: string | null;
  amount: number | string;
  vat_rate: number | string;
  method: Method;
  reference: string;
  due_on: string | null;
  done_on: string | null;
  note: string;
  receipts: string[] | null;
  created_at: string;
}

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  kind: r.kind,
  status: r.status,
  title: r.title,
  category: r.category,
  counterparty: r.counterparty,
  clientId: r.client_id,
  amount: Number(r.amount) || 0,
  vatRate: Number(r.vat_rate) || 0,
  method: r.method,
  reference: r.reference,
  dueOn: r.due_on,
  doneOn: r.done_on,
  note: r.note,
  receipts: r.receipts ?? [],
  createdAt: r.created_at,
});

export function useEntries(enabled: boolean) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["finance-entries", workspaceId],
    enabled,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("finance_entries")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data as EntryRow[]).map(toEntry);
    },
  });
}

export function useFinanceSettings(enabled: boolean) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["finance-settings", workspaceId],
    enabled,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("finance_settings")
        .select("opening_balance,opening_on")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return {
        amount: Number(data?.opening_balance ?? 0),
        on: (data?.opening_on as string | null) ?? null,
      };
    },
  });
}

export function useFinancePeople(enabled: boolean) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["finance-people", workspaceId],
    enabled,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_finance_people", {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
      return data as { member_id: string; name: string; role: string; can_view: boolean }[];
    },
  });
}

export type EntryInput = Omit<Entry, "id" | "createdAt">;

const toRow = (e: EntryInput) => ({
  kind: e.kind,
  status: e.status,
  title: e.title.trim(),
  category: e.category,
  counterparty: e.counterparty.trim(),
  client_id: e.clientId || null,
  amount: Math.round(e.amount * 1000) / 1000,
  vat_rate: e.vatRate,
  method: e.method,
  reference: e.reference.trim(),
  due_on: e.dueOn || null,
  done_on: e.status === "done" ? e.doneOn || new Date().toISOString().slice(0, 10) : null,
  note: e.note,
  receipts: e.receipts,
});

export function useFinanceActions() {
  const { id: workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["finance-entries", workspaceId] });
    void qc.invalidateQueries({ queryKey: ["finance-settings", workspaceId] });
    void qc.invalidateQueries({ queryKey: ["finance-people", workspaceId] });
  };
  const db = () => requireSupabase();
  return {
    add: useMutation({
      mutationFn: async (e: EntryInput) => {
        const { error } = await db()
          .from("finance_entries")
          .insert({ workspace_id: workspaceId, ...toRow(e) });
        if (error) throw error;
      },
      onSuccess: done,
    }),
    save: useMutation({
      mutationFn: async ({ id, ...e }: EntryInput & { id: string }) => {
        const { error } = await db().from("finance_entries").update(toRow(e)).eq("id", id);
        if (error) throw error;
      },
      onSuccess: done,
    }),
    settle: useMutation({
      mutationFn: async ({ id, on }: { id: string; on: string }) => {
        const { error } = await db()
          .from("finance_entries")
          .update({ status: "done", done_on: on })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: async (e: Entry) => {
        if (e.receipts.length) await db().storage.from("receipts").remove(e.receipts);
        const { error } = await db().from("finance_entries").delete().eq("id", e.id);
        if (error) throw error;
      },
      onSuccess: done,
    }),
    opening: useMutation({
      mutationFn: async ({ amount, on }: { amount: number; on: string | null }) => {
        const { error } = await db().rpc("set_finance_opening", {
          p_workspace_id: workspaceId,
          p_amount: amount,
          p_on: on,
        });
        if (error) throw error;
      },
      onSuccess: done,
    }),
    viewer: useMutation({
      mutationFn: async ({ memberId, on }: { memberId: string; on: boolean }) => {
        const { error } = await db().rpc("set_finance_viewer", {
          p_workspace_id: workspaceId,
          p_member_id: memberId,
          p_on: on,
        });
        if (error) throw error;
      },
      onSuccess: done,
    }),
  };
}

export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** A photo or PDF of a facture, into the private bucket. Photos are shrunk; returns the stored path. */
export async function uploadReceipt(workspaceId: string, file: File): Promise<string> {
  if (!RECEIPT_TYPES.includes(file.type)) throw new Error("image_type");
  let blob: Blob = file;
  let ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  if (file.type.startsWith("image/") && file.size > 1_200_000) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, 2200 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      blob = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("bad_upload"))), "image/jpeg", 0.85),
      );
      ext = "jpg";
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (blob.size > 10_000_000) throw new Error("image_too_big");
  const path = `${workspaceId}/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;
  const { error } = await requireSupabase()
    .storage.from("receipts")
    .upload(path, blob, {
      contentType: ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg",
    });
  if (error) throw error;
  return path;
}

/** Short-lived links to look at factures. */
export function useReceiptUrls(paths: readonly string[]) {
  const key = [...paths].sort().join("|");
  return useQuery({
    queryKey: ["receipt-urls", key],
    enabled: paths.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .storage.from("receipts")
        .createSignedUrls([...paths], 3600);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl]));
    },
  });
}
