-- The Clients screen, a client's page and the Team screen read the client list straight from this table, but phase 0
-- revoked every privilege on it, so the read failed with "permission denied" and the screens showed an error.
-- Signed-in people may now read the plain columns. Row level security (clients_assigned_read) still limits each person
-- to the clients they can access, and the data column stays behind the role-aware RPCs.
grant select (workspace_id, id, brand, created_at, updated_at) on public.clients to authenticated;
