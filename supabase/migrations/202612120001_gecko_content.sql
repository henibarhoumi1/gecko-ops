-- Gecko's own content and ads (Heni, 24 Nov 2026: "plan, pre-produce and produce Gecko content, and run ad
-- campaigns with tracking"). Posts move through a board (idea → posted); ad campaigns keep budget, spend and
-- results, entered by hand from Meta/TikTok, so cost per lead is always one glance away.
-- Team reads; the founder and producers write and delete (to the trash).

create table public.gecko_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  platform text not null default 'instagram' check (platform in ('instagram', 'tiktok', 'facebook', 'linkedin', 'youtube')),
  format text not null default '' check (length(format) <= 60),
  status text not null default 'idea' check (status in ('idea', 'script', 'shoot', 'edit', 'scheduled', 'posted')),
  publish_on date,
  hook text not null default '' check (length(hook) <= 300),
  notes text not null default '' check (length(notes) <= 4000),
  link text not null default '' check (length(link) <= 1000),
  views integer check (views is null or views >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gecko_posts_ws on public.gecko_posts(workspace_id, status);

create table public.gecko_ads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  platform text not null default 'meta' check (platform in ('meta', 'tiktok', 'google', 'linkedin', 'other')),
  objective text not null default 'leads' check (objective in ('awareness', 'traffic', 'leads', 'messages', 'sales')),
  status text not null default 'draft' check (status in ('draft', 'live', 'paused', 'done')),
  starts_on date,
  ends_on date,
  budget numeric(12, 3) check (budget is null or budget >= 0),
  spend numeric(12, 3) not null default 0 check (spend >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  leads integer not null default 0 check (leads >= 0),
  notes text not null default '' check (length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gecko_ads_ws on public.gecko_ads(workspace_id, status);

create trigger gecko_posts_touch before update on public.gecko_posts
  for each row execute function public.touch_updated_at();
create trigger gecko_ads_touch before update on public.gecko_ads
  for each row execute function public.touch_updated_at();
create trigger gecko_posts_to_trash before delete on public.gecko_posts
  for each row execute function public.to_trash();
create trigger gecko_ads_to_trash before delete on public.gecko_ads
  for each row execute function public.to_trash();

alter table public.gecko_posts enable row level security;
alter table public.gecko_ads enable row level security;
revoke all on public.gecko_posts, public.gecko_ads from anon, authenticated;
grant select, insert, update, delete on public.gecko_posts, public.gecko_ads to authenticated;

create policy gecko_posts_read on public.gecko_posts for select to authenticated
  using (public.member_role(workspace_id) is not null);
create policy gecko_posts_write on public.gecko_posts for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales'));
create policy gecko_posts_update on public.gecko_posts for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales'))
  with check (public.member_role(workspace_id) in ('founder', 'sales'));
create policy gecko_posts_delete on public.gecko_posts for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales'));

create policy gecko_ads_read on public.gecko_ads for select to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales'));
create policy gecko_ads_write on public.gecko_ads for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales'));
create policy gecko_ads_update on public.gecko_ads for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales'))
  with check (public.member_role(workspace_id) in ('founder', 'sales'));
create policy gecko_ads_delete on public.gecko_ads for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales'));
