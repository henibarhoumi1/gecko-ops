-- The studio calendar's own entries (Heni, 24 Nov 2026: "add tasks or shoot or project or anything").
-- Meetings, events and notes on a day, optionally about a client. Any team member reads and adds; the author,
-- the founder and producers change or remove. Tasks, shoots and projects keep their own tables.

create table public.studio_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  day date not null,
  at_time text not null default '' check (at_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or at_time = ''),
  kind text not null default 'event' check (kind in ('meeting', 'event', 'note')),
  title text not null check (length(trim(title)) between 1 and 160),
  notes text not null default '' check (length(notes) <= 2000),
  link text not null default '' check (length(link) <= 500),
  client_id text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index studio_events_day on public.studio_events(workspace_id, day);

alter table public.studio_events enable row level security;
revoke all on public.studio_events from anon, authenticated;
grant select, insert, update, delete on public.studio_events to authenticated;

create policy studio_events_read on public.studio_events for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy studio_events_insert on public.studio_events for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy studio_events_update on public.studio_events for update to authenticated
  using (created_by = (select auth.uid()) or public.member_role(workspace_id) in ('founder', 'sales'))
  with check (public.is_workspace_member(workspace_id));
create policy studio_events_delete on public.studio_events for delete to authenticated
  using (created_by = (select auth.uid()) or public.member_role(workspace_id) in ('founder', 'sales'));

create trigger studio_events_touch before update on public.studio_events
  for each row execute function public.touch_updated_at();
