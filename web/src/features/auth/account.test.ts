import type { SupabaseClient } from "@supabase/supabase-js";
import { acceptInvite, loadAccount } from "./account";

type Reply = { data?: unknown; error?: { message: string } | null };

function fakeDb(replies: Record<string, Reply | Reply[]>) {
  const calls: string[] = [];
  const db = {
    rpc: async (name: string) => {
      calls.push(name);
      const r = replies[name];
      const reply = Array.isArray(r) ? r.shift() : r;
      return { data: reply?.data ?? null, error: reply?.error ?? null };
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

describe("loadAccount", () => {
  it("returns the workspace for a team member", async () => {
    const { db, calls } = fakeDb({
      get_my_workspaces: { data: [{ id: "w1", name: "Gecko", role: "sales" }] },
    });
    expect(await loadAccount(db)).toEqual({
      kind: "member",
      workspace: { id: "w1", name: "Gecko", role: "sales" },
    });
    expect(calls).toEqual(["get_my_workspaces"]);
  });

  it("returns client portals for a client", async () => {
    const { db } = fakeDb({
      get_my_workspaces: { data: [] },
      get_my_client_portals: { data: [{ workspace_id: "w1", client_id: "c1", brand: "Glucelia" }] },
    });
    expect(await loadAccount(db)).toEqual({
      kind: "client",
      portals: [{ workspaceId: "w1", clientId: "c1", brand: "Glucelia" }],
    });
  });

  it("returns none for a new account", async () => {
    const { db } = fakeDb({ get_my_workspaces: { data: [] }, get_my_client_portals: { data: [] } });
    expect(await loadAccount(db)).toEqual({ kind: "none" });
  });
});

describe("acceptInvite", () => {
  it("falls back to a client invite", async () => {
    const { db, calls } = fakeDb({
      accept_workspace_invite: { error: { message: "invalid_invite" } },
      accept_client_invite: { data: {} },
    });
    await acceptInvite(db, "code", "Sam");
    expect(calls).toEqual(["accept_workspace_invite", "accept_client_invite"]);
  });

  it("does not hide other team invite errors", async () => {
    const { db, calls } = fakeDb({
      accept_workspace_invite: { error: { message: "verified_email_required" } },
    });
    await expect(acceptInvite(db, "code", "Sam")).rejects.toMatchObject({
      message: "verified_email_required",
    });
    expect(calls).toEqual(["accept_workspace_invite"]);
  });
});
