-- Monthly goals for the CEO cockpit (Heni, 23 Nov 2026: "tools for the CEO").
-- One row per month: how much cash to bring in, how many deals to sign and how many reels to deliver. The founder
-- sets them; the founder and producers read them (the cockpit and Home show progress). Nothing else changes.

create table public.studio_goals (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  revenue numeric(12, 3) check (revenue is null or revenue >= 0),
  deals integer check (deals is null or deals between 0 and 1000),
  reels integer check (reels is null or reels between 0 and 10000),
  note text not null default '' check (length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, month)
);

alter table public.studio_goals enable row level security;
revoke all on public.studio_goals from anon, authenticated;
grant select, insert, update, delete on public.studio_goals to authenticated;

create policy studio_goals_read on public.studio_goals for select to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales'));
create policy studio_goals_insert on public.studio_goals for insert to authenticated
  with check (public.member_role(workspace_id) = 'founder');
create policy studio_goals_update on public.studio_goals for update to authenticated
  using (public.member_role(workspace_id) = 'founder')
  with check (public.member_role(workspace_id) = 'founder');
create policy studio_goals_delete on public.studio_goals for delete to authenticated
  using (public.member_role(workspace_id) = 'founder');

create trigger studio_goals_touch before update on public.studio_goals
  for each row execute function public.touch_updated_at();
