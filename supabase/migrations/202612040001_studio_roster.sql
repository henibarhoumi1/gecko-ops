-- The studio's own lists of talent and locations (Heni, 21 Nov 2026: "talents view, location view"). One list per
-- workspace, kept by the team, never seen by clients: who we work with, how to reach them, what they cost, what they
-- look like. From a card the team proposes the person or place to a client, which copies it into that client's
-- production options (where the client approves it against their budget, as before).
-- Additive only. Deletes go to the trash like everything else; "hidden" takes an entry out of the lists without
-- deleting it.

create table public.studio_roster (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('talent', 'location')),
  name text not null check (length(trim(name)) between 1 and 120),
  -- Talent: actor, model, creator, voice, extra. Location: studio, home, shop, outdoor, office.
  role text not null default '' check (length(role) <= 80),
  city text not null default '' check (length(city) <= 80),
  phone text not null default '' check (length(phone) <= 60),
  instagram text not null default '' check (length(instagram) <= 160),
  link text not null default '' check (length(link) <= 1000 and (link = '' or link ~* '^https?://\S+$')),
  photo_url text not null default '' check (length(photo_url) <= 1000 and (photo_url = '' or photo_url ~* '^https?://\S+$')),
  rate numeric(10, 2) check (rate is null or (rate >= 0 and rate <= 10000000)),
  rate_note text not null default '' check (length(rate_note) <= 160),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  notes text not null default '' check (length(notes) <= 4000),
  rating smallint check (rating is null or rating between 1 and 5),
  hidden boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index studio_roster_workspace_kind on public.studio_roster(workspace_id, kind);

create trigger studio_roster_touch before update on public.studio_roster
  for each row execute function public.touch_updated_at();

create trigger studio_roster_to_trash before delete on public.studio_roster
  for each row execute function public.to_trash();

alter table public.studio_roster enable row level security;
revoke all on public.studio_roster from public, anon, authenticated;
grant select, insert, update, delete on public.studio_roster to authenticated;

-- Everyone on the team reads and adds; the founder and producers delete. Clients never see it.
create policy studio_roster_read on public.studio_roster for select to authenticated
  using (public.member_role(workspace_id) is not null);
create policy studio_roster_insert on public.studio_roster for insert to authenticated
  with check (public.member_role(workspace_id) is not null);
create policy studio_roster_update on public.studio_roster for update to authenticated
  using (public.member_role(workspace_id) is not null)
  with check (public.member_role(workspace_id) is not null);
create policy studio_roster_delete on public.studio_roster for delete to authenticated
  using (coalesce(public.member_role(workspace_id), '') in ('founder', 'sales'));
