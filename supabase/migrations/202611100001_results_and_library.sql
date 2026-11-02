-- Portal v2, phase F: results and the library.
--
-- Results. Gecko doesn't run the ads, so the numbers come from the client (or their media buyer). Each video that
-- goes online is a "post": where it ran, paid or organic, the link and the day it went live. Numbers are read at two
-- checkpoints, 7 and 30 days after going live, so videos compare fairly. The client drops screenshots of their
-- Insights or Ads Manager; Gecko (or the client) types the numbers in. Only the template's metrics are asked for.
-- Once a month Gecko writes a short read: the strongest and weakest video, what we learned, what we test next. On
-- publishing, the tests land in Ideas as Gecko drafts.
--
-- Library. Every clip and still from every shoot, tagged and filterable. The files stay in Google Drive; the
-- portal shows a thumbnail. The client never gets the Drive link (raw footage isn't part of the deal): they pick
-- clips and ask Gecko to make something from them. Clips showing talent carry that talent's usage terms.

-- ---------- results ----------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  cut_id uuid references public.cuts(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 160),
  platform text not null default 'instagram' check (platform in ('instagram', 'tiktok', 'facebook', 'youtube', 'other')),
  paid boolean not null default false,
  link text not null default '' check (length(link) <= 600 and (link = '' or link ~* '^https://\S+$')),
  live_on date not null,
  -- Cinematic: press and features, one link per line.
  press text not null default '' check (length(press) <= 2000),
  from_client boolean not null default false,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create index posts_client on public.posts(workspace_id, client_id, live_on);

-- Only these numbers are kept. Performance: spend, impressions, 3 s and 15 s views, clicks, purchases, revenue.
-- Cinematic: reach, views, average watch time (s), completion (%), saves, shares, comments, new followers.
create function public.result_metrics_ok(m jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(m) = 'object'
    and not exists (
      select 1 from jsonb_each(m) e
      where e.key not in ('spend', 'impressions', 'views3s', 'views15s', 'clicks', 'purchases', 'revenue',
                          'reach', 'views', 'avgWatch', 'completion', 'saves', 'shares', 'comments', 'follows')
         or jsonb_typeof(e.value) <> 'number'
         or (e.value::text)::numeric < 0
         or (e.value::text)::numeric > 1000000000000
         or (e.key = 'completion' and (e.value::text)::numeric > 100)
    )
$$;

create table public.post_numbers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  day integer not null check (day in (7, 30)),
  metrics jsonb not null default '{}'::jsonb check (public.result_metrics_ok(metrics)),
  -- Screenshots in the private "results" bucket: <workspace>/<client>/<post>/<file>.
  shots text[] not null default '{}' check (cardinality(shots) <= 4),
  note text not null default '' check (length(note) <= 1000),
  entered_by text not null default '' check (length(entered_by) <= 120),
  entered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (post_id, day)
);

create table public.monthly_reads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  month date not null check (extract(day from month) = 1),
  best_post uuid references public.posts(id) on delete set null,
  worst_post uuid references public.posts(id) on delete set null,
  best_why text not null default '' check (length(best_why) <= 400),
  worst_why text not null default '' check (length(worst_why) <= 400),
  learned text[] not null default '{}' check (cardinality(learned) <= 3),
  next_tests text[] not null default '{}' check (cardinality(next_tests) <= 5),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  unique (workspace_id, client_id, month),
  check ((status = 'published') = (published_at is not null))
);

-- ---------- library ----------

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  kind text not null default 'clip' check (kind in ('clip', 'still')),
  title text not null check (length(trim(title)) between 1 and 160),
  shoot text not null default '' check (length(shoot) <= 120),
  shot_on date,
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  seconds numeric(7, 2) check (seconds between 0 and 36000),
  -- A thumbnail in the private "library" bucket: <workspace>/<client>/<file>.
  thumb text check (length(thumb) <= 400),
  -- The file in Google Drive. Team only.
  link text not null default '' check (length(link) <= 600 and (link = '' or link ~* '^https://\S+$')),
  talent_id uuid references public.production_options(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check (thumb is null or starts_with(thumb, workspace_id::text || '/' || client_id || '/'))
);

create index library_items_client on public.library_items(workspace_id, client_id, shot_on desc, created_at desc);

alter table public.posts enable row level security;
alter table public.post_numbers enable row level security;
alter table public.monthly_reads enable row level security;
alter table public.library_items enable row level security;
revoke all on public.posts, public.post_numbers, public.monthly_reads, public.library_items
  from public, anon, authenticated;

-- ---------- helpers ----------

-- Who is acting on this client's results: the team (anyone with access) or someone on the client's side.
-- p_write: viewers on the client's side read but don't add. Returns {team, who, role}.
create function public.results_actor(p_workspace_id uuid, p_client_id text, p_write boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') in ('founder', 'sales', 'editor')
     and public.has_client_access(p_workspace_id, p_client_id) then
    return jsonb_build_object('team', true, 'who', coalesce(public.my_member_name(p_workspace_id), 'Gecko'), 'role', '');
  end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_write and acc.role = 'viewer' then raise exception 'viewer_read_only'; end if;
  return jsonb_build_object('team', false, 'who', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120),
    'role', acc.role);
end
$$;

-- Ad spend and sales stay with the people who see money.
create function public.post_to_json(p public.posts, p_money boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'cutId', p.cut_id, 'title', p.title, 'platform', p.platform, 'paid', p.paid, 'link', p.link,
    'liveOn', p.live_on, 'press', p.press, 'fromClient', p.from_client, 'authorName', p.author_name,
    'createdAt', p.created_at, 'updatedAt', p.updated_at,
    'numbers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', n.day,
        'metrics', case when p_money then n.metrics else n.metrics - 'spend' - 'revenue' end,
        'shots', to_jsonb(n.shots), 'note', n.note, 'enteredBy', n.entered_by, 'enteredAt', n.entered_at,
        'updatedAt', n.updated_at
      ) order by n.day)
      from public.post_numbers n where n.post_id = p.id
    ), '[]'::jsonb)
  )
$$;

create function public.monthly_read_to_json(r public.monthly_reads)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'month', r.month, 'bestPost', r.best_post, 'worstPost', r.worst_post,
    'bestWhy', r.best_why, 'worstWhy', r.worst_why, 'learned', to_jsonb(r.learned), 'nextTests', to_jsonb(r.next_tests),
    'status', r.status, 'publishedAt', r.published_at, 'authorName', r.author_name, 'updatedAt', r.updated_at
  )
$$;

-- ---------- results: reading ----------

-- The team sees every read (drafts too); the client sees published ones, and spend only if they see money.
create function public.get_results(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, false);
  team boolean := (actor->>'team')::boolean;
  money boolean := team or actor->>'role' in ('owner', 'finance');
begin
  return jsonb_build_object(
    'team', team,
    'seesMoney', money,
    'canAdd', team or actor->>'role' <> 'viewer',
    'posts', coalesce((
      select jsonb_agg(public.post_to_json(p, money) order by p.live_on desc, p.created_at desc)
      from public.posts p where p.workspace_id = p_workspace_id and p.client_id = p_client_id
    ), '[]'::jsonb),
    'reads', coalesce((
      select jsonb_agg(public.monthly_read_to_json(r) order by r.month desc)
      from public.monthly_reads r
      where r.workspace_id = p_workspace_id and r.client_id = p_client_id and (team or r.status = 'published')
    ), '[]'::jsonb),
    -- Cuts the client approved, to pick from when adding a post.
    'cuts', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title) order by c.position, c.created_at)
      from public.cuts c
      where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.status = 'approved'
    ), '[]'::jsonb)
  );
end
$$;

-- ---------- results: writing (both sides) ----------

-- A new post (p_id null) or a change to one. The client edits only what their side added.
create function public.save_post(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_cut_id uuid, p_title text, p_platform text, p_paid boolean,
  p_link text, p_live_on date, p_press text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
  team boolean := (actor->>'team')::boolean;
  new_id uuid;
begin
  if p_cut_id is not null and not exists (
    select 1 from public.cuts c where c.id = p_cut_id and c.workspace_id = p_workspace_id and c.client_id = p_client_id
  ) then raise exception 'cut_not_found'; end if;
  if p_live_on is null or p_live_on > current_date + 60 or p_live_on < date '2020-01-01' then
    raise exception 'invalid_post';
  end if;
  begin
    if p_id is null then
      if (select count(*) from public.posts p where p.workspace_id = p_workspace_id and p.client_id = p_client_id) >= 500 then
        raise exception 'too_many_posts';
      end if;
      insert into public.posts(workspace_id, client_id, cut_id, title, platform, paid, link, live_on, press, from_client, author_name)
      values (p_workspace_id, p_client_id, p_cut_id, trim(coalesce(p_title, '')), coalesce(p_platform, 'instagram'),
        coalesce(p_paid, false), trim(coalesce(p_link, '')), p_live_on, trim(coalesce(p_press, '')), not team, actor->>'who')
      returning id into new_id;
      return new_id;
    end if;
    update public.posts set cut_id = p_cut_id, title = trim(coalesce(p_title, '')), platform = coalesce(p_platform, 'instagram'),
      paid = coalesce(p_paid, false), link = trim(coalesce(p_link, '')), live_on = p_live_on,
      press = trim(coalesce(p_press, '')), updated_at = now()
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and (team or from_client);
    if not found then raise exception 'post_not_found'; end if;
  exception when check_violation then
    raise exception 'invalid_post';
  end;
  return p_id;
end
$$;

-- The app removes the post's screenshots from storage first, while the post still grants access to them.
create function public.delete_post(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
begin
  delete from public.posts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and ((actor->>'team')::boolean or from_client);
  if not found then raise exception 'post_not_found'; end if;
end
$$;

-- One checkpoint: the numbers, the screenshots and a note. Either side fills it in. Numbers a viewer of the
-- money can't see (spend, revenue) are kept as they were when someone without money access saves.
create function public.save_post_numbers(
  p_workspace_id uuid, p_client_id text, p_post_id uuid, p_day integer, p_metrics jsonb, p_shots text[], p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
  money boolean := (actor->>'team')::boolean or actor->>'role' in ('owner', 'finance');
  p public.posts%rowtype;
  prev public.post_numbers%rowtype;
  m jsonb := coalesce(p_metrics, '{}'::jsonb);
  pics text[] := coalesce(p_shots, '{}');
  changed boolean;
begin
  select * into p from public.posts where id = p_post_id and workspace_id = p_workspace_id and client_id = p_client_id;
  if not found then raise exception 'post_not_found'; end if;
  if p_day not in (7, 30) then raise exception 'invalid_numbers'; end if;
  if exists (select 1 from unnest(pics) s
             where not starts_with(s, p_workspace_id::text || '/' || p_client_id || '/' || p_post_id::text || '/')
                or length(s) > 400) then
    raise exception 'invalid_numbers';
  end if;
  if jsonb_typeof(m) <> 'object' then raise exception 'invalid_numbers'; end if;
  select * into prev from public.post_numbers where post_id = p_post_id and day = p_day for update;
  if not money then
    m := (m - 'spend' - 'revenue')
      || coalesce(jsonb_strip_nulls(jsonb_build_object('spend', prev.metrics->'spend', 'revenue', prev.metrics->'revenue')), '{}');
  end if;
  -- Whoever changes the numbers is who entered them.
  changed := prev.id is null or m is distinct from prev.metrics;
  begin
    insert into public.post_numbers(post_id, workspace_id, client_id, day, metrics, shots, note, entered_by, entered_at)
    values (p_post_id, p_workspace_id, p_client_id, p_day, m, pics, trim(coalesce(p_note, '')),
      case when m <> '{}'::jsonb then actor->>'who' else '' end, case when m <> '{}'::jsonb then now() end)
    on conflict (post_id, day) do update set
      metrics = excluded.metrics, shots = excluded.shots, note = excluded.note,
      entered_by = case when changed and excluded.metrics <> '{}'::jsonb then actor->>'who'
                        when excluded.metrics = '{}'::jsonb then '' else public.post_numbers.entered_by end,
      entered_at = case when changed and excluded.metrics <> '{}'::jsonb then now()
                        when excluded.metrics = '{}'::jsonb then null else public.post_numbers.entered_at end,
      updated_at = now();
  exception when check_violation then
    raise exception 'invalid_numbers';
  end;
end
$$;

-- ---------- monthly read (team writes, client reads) ----------

create function public.save_monthly_read(
  p_workspace_id uuid, p_client_id text, p_month date, p_best uuid, p_best_why text, p_worst uuid, p_worst_why text,
  p_learned text[], p_next text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
  m date := date_trunc('month', p_month)::date;
  r public.monthly_reads%rowtype;
  lines text[] := array(select trim(x) from unnest(coalesce(p_learned, '{}')) x where trim(x) <> '');
  tests text[] := array(select trim(x) from unnest(coalesce(p_next, '{}')) x where trim(x) <> '');
begin
  if not (actor->>'team')::boolean then raise exception 'forbidden'; end if;
  if m is null then raise exception 'invalid_read'; end if;
  if exists (select 1 from unnest(lines) x where length(x) > 300)
     or exists (select 1 from unnest(tests) x where length(x) > 160) then
    raise exception 'invalid_read';
  end if;
  if exists (select 1 from unnest(array[p_best, p_worst]) x
             where x is not null and not exists (
               select 1 from public.posts p where p.id = x and p.workspace_id = p_workspace_id and p.client_id = p_client_id)) then
    raise exception 'post_not_found';
  end if;
  select * into r from public.monthly_reads
  where workspace_id = p_workspace_id and client_id = p_client_id and month = m for update;
  if found and r.status = 'published' then raise exception 'read_published'; end if;
  begin
    insert into public.monthly_reads(workspace_id, client_id, month, best_post, best_why, worst_post, worst_why,
      learned, next_tests, author_name)
    values (p_workspace_id, p_client_id, m, p_best, trim(coalesce(p_best_why, '')), p_worst, trim(coalesce(p_worst_why, '')),
      lines, tests, actor->>'who')
    on conflict (workspace_id, client_id, month) do update set
      best_post = excluded.best_post, best_why = excluded.best_why, worst_post = excluded.worst_post,
      worst_why = excluded.worst_why, learned = excluded.learned, next_tests = excluded.next_tests,
      author_name = excluded.author_name, updated_at = now()
    returning * into r;
  exception when check_violation then
    raise exception 'invalid_read';
  end;
  return r.id;
end
$$;

-- Publish: the client sees it, and each test becomes a Gecko draft in Ideas, ready to shape and send.
create function public.publish_monthly_read(p_workspace_id uuid, p_client_id text, p_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
  r public.monthly_reads%rowtype;
  added integer := 0;
  test text;
  pos integer;
begin
  if not (actor->>'team')::boolean then raise exception 'forbidden'; end if;
  select * into r from public.monthly_reads
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'read_not_found'; end if;
  if r.status = 'published' then raise exception 'read_published'; end if;
  if cardinality(r.learned) = 0 then raise exception 'read_empty'; end if;
  select coalesce(max(c.position) + 1, 0) into pos from public.concepts c
  where c.workspace_id = p_workspace_id and c.client_id = p_client_id;
  foreach test in array r.next_tests loop
    insert into public.concepts(workspace_id, client_id, title, body, position, status, created_by, author_name)
    values (p_workspace_id, p_client_id, left(test, 160),
      'From the read for ' || to_char(r.month, 'FMMonth YYYY') || '.', pos + added, 'draft', (select auth.uid()),
      actor->>'who');
    added := added + 1;
  end loop;
  update public.monthly_reads set status = 'published', published_at = now(), updated_at = now() where id = r.id;
  return added;
end
$$;

create function public.delete_monthly_read(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
begin
  if not (actor->>'team')::boolean then raise exception 'forbidden'; end if;
  delete from public.monthly_reads
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and status = 'draft';
  if not found then raise exception 'read_not_found'; end if;
end
$$;

-- ---------- library ----------

create function public.library_item_to_json(i public.library_items, p_team boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'title', i.title, 'shoot', i.shoot, 'shotOn', i.shot_on, 'tags', to_jsonb(i.tags),
    'seconds', i.seconds, 'thumb', i.thumb, 'link', case when p_team then i.link else '' end,
    'talentId', i.talent_id,
    'talent', (select jsonb_build_object('name', o.name, 'usageTerms', o.usage_terms)
               from public.production_options o where o.id = i.talent_id),
    'createdAt', i.created_at
  )
$$;

create function public.get_library(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, false);
  team boolean := (actor->>'team')::boolean;
begin
  return jsonb_build_object(
    'team', team,
    'items', coalesce((
      select jsonb_agg(public.library_item_to_json(i, team) order by i.shot_on desc nulls last, i.created_at desc)
      from public.library_items i where i.workspace_id = p_workspace_id and i.client_id = p_client_id
    ), '[]'::jsonb),
    -- Cast the team can link a clip to (team only).
    'talent', case when team then coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name)
      from public.production_options o
      where o.workspace_id = p_workspace_id and o.client_id = p_client_id and o.kind = 'talent'
        and o.status in ('approved', 'booked', 'shot', 'paid', 'invoiced')
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end
$$;

create function public.save_library_item(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_kind text, p_title text, p_shoot text, p_shot_on date,
  p_tags text[], p_seconds numeric, p_thumb text, p_link text, p_talent_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
  v_tags text[] := array(select distinct lower(trim(x)) from unnest(coalesce(p_tags, '{}')) x where trim(x) <> '');
  new_id uuid;
begin
  if not (actor->>'team')::boolean then raise exception 'forbidden'; end if;
  if exists (select 1 from unnest(v_tags) x where length(x) > 30) then raise exception 'invalid_item'; end if;
  if p_talent_id is not null and not exists (
    select 1 from public.production_options o
    where o.id = p_talent_id and o.workspace_id = p_workspace_id and o.client_id = p_client_id and o.kind = 'talent'
  ) then raise exception 'invalid_item'; end if;
  begin
    if p_id is null then
      if (select count(*) from public.library_items i where i.workspace_id = p_workspace_id and i.client_id = p_client_id) >= 2000 then
        raise exception 'too_many_items';
      end if;
      insert into public.library_items(workspace_id, client_id, kind, title, shoot, shot_on, tags, seconds, thumb, link,
        talent_id, author_name)
      values (p_workspace_id, p_client_id, coalesce(p_kind, 'clip'), trim(coalesce(p_title, '')), trim(coalesce(p_shoot, '')),
        p_shot_on, v_tags, p_seconds, nullif(p_thumb, ''), trim(coalesce(p_link, '')), p_talent_id, actor->>'who')
      returning id into new_id;
      return new_id;
    end if;
    update public.library_items set kind = coalesce(p_kind, 'clip'), title = trim(coalesce(p_title, '')),
      shoot = trim(coalesce(p_shoot, '')), shot_on = p_shot_on, tags = v_tags, seconds = p_seconds,
      thumb = nullif(p_thumb, ''), link = trim(coalesce(p_link, '')), talent_id = p_talent_id, updated_at = now()
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
    if not found then raise exception 'item_not_found'; end if;
  exception when check_violation then
    raise exception 'invalid_item';
  end;
  return p_id;
end
$$;

create function public.delete_library_item(p_workspace_id uuid, p_client_id text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
  old_thumb text;
begin
  if not (actor->>'team')::boolean then raise exception 'forbidden'; end if;
  delete from public.library_items where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
  returning thumb into old_thumb;
  if not found then raise exception 'item_not_found'; end if;
  return old_thumb;
end
$$;

-- "Make something from these": the client's pick becomes a request in Notes and links, which the team answers.
create function public.library_request(p_workspace_id uuid, p_client_id text, p_ids uuid[], p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, false);
  picked text;
  n integer;
begin
  if (actor->>'team')::boolean then raise exception 'client_only'; end if;
  select count(*), string_agg('- ' || i.title || case when i.shoot <> '' then ' (' || i.shoot || ')' else '' end, E'\n' order by i.title)
  into n, picked
  from public.library_items i
  where i.id = any(coalesce(p_ids, '{}')) and i.workspace_id = p_workspace_id and i.client_id = p_client_id;
  if n = 0 or n > 30 then raise exception 'invalid_item'; end if;
  return public.client_add_shared(p_workspace_id, p_client_id, 'request',
    left('From the library: ' || n || case when n = 1 then ' clip' else ' clips' end, 160),
    left(coalesce(nullif(trim(p_body), '') || E'\n\n', '') || picked, 4000), '');
end
$$;

-- ---------- files ----------
-- results: <workspace>/<client>/<post>/<file>. The team with access and the client (not viewers, for writing).
-- library: <workspace>/<client>/<file>. The team writes; the client reads.

create function public.results_file_access(p_name text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(p_name, '/');
  ws uuid;
  acc public.client_accounts;
begin
  if array_length(parts, 1) <> 4 or parts[1] !~ '^[0-9a-f-]{36}$' or parts[3] !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  ws := parts[1]::uuid;
  if not exists (select 1 from public.posts p where p.id = parts[3]::uuid and p.workspace_id = ws and p.client_id = parts[2]) then
    return false;
  end if;
  if coalesce(public.member_role(ws), '') in ('founder', 'sales', 'editor') and public.has_client_access(ws, parts[2]) then
    return true;
  end if;
  acc := public.my_client_account(ws, parts[2]);
  return acc.id is not null and (not p_write or acc.role <> 'viewer');
end
$$;

create function public.library_file_access(p_name text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(p_name, '/');
  ws uuid;
begin
  if array_length(parts, 1) <> 3 or parts[1] !~ '^[0-9a-f-]{36}$' then return false; end if;
  ws := parts[1]::uuid;
  if coalesce(public.member_role(ws), '') in ('founder', 'sales', 'editor') and public.has_client_access(ws, parts[2]) then
    return true;
  end if;
  return not p_write and (public.my_client_account(ws, parts[2])).id is not null;
end
$$;

revoke all on function public.result_metrics_ok(jsonb), public.results_actor(uuid, text, boolean),
  public.post_to_json(public.posts, boolean), public.monthly_read_to_json(public.monthly_reads),
  public.library_item_to_json(public.library_items, boolean),
  public.get_results(uuid, text), public.save_post(uuid, text, uuid, uuid, text, text, boolean, text, date, text),
  public.delete_post(uuid, text, uuid), public.save_post_numbers(uuid, text, uuid, integer, jsonb, text[], text),
  public.save_monthly_read(uuid, text, date, uuid, text, uuid, text, text[], text[]),
  public.publish_monthly_read(uuid, text, uuid), public.delete_monthly_read(uuid, text, uuid),
  public.get_library(uuid, text),
  public.save_library_item(uuid, text, uuid, text, text, text, date, text[], numeric, text, text, uuid),
  public.delete_library_item(uuid, text, uuid), public.library_request(uuid, text, uuid[], text),
  public.results_file_access(text, boolean), public.library_file_access(text, boolean)
  from public, anon;
revoke all on function public.results_actor(uuid, text, boolean), public.post_to_json(public.posts, boolean),
  public.monthly_read_to_json(public.monthly_reads), public.library_item_to_json(public.library_items, boolean)
  from authenticated;
grant execute on function public.result_metrics_ok(jsonb),
  public.get_results(uuid, text), public.save_post(uuid, text, uuid, uuid, text, text, boolean, text, date, text),
  public.delete_post(uuid, text, uuid), public.save_post_numbers(uuid, text, uuid, integer, jsonb, text[], text),
  public.save_monthly_read(uuid, text, date, uuid, text, uuid, text, text[], text[]),
  public.publish_monthly_read(uuid, text, uuid), public.delete_monthly_read(uuid, text, uuid),
  public.get_library(uuid, text),
  public.save_library_item(uuid, text, uuid, text, text, text, date, text[], numeric, text, text, uuid),
  public.delete_library_item(uuid, text, uuid), public.library_request(uuid, text, uuid[], text),
  public.results_file_access(text, boolean), public.library_file_access(text, boolean)
  to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('results', 'results', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('library', 'library', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    execute $p$create policy results_read on storage.objects for select to authenticated
      using (bucket_id = 'results' and public.results_file_access(name, false))$p$;
    execute $p$create policy results_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'results' and public.results_file_access(name, true))$p$;
    execute $p$create policy results_delete on storage.objects for delete to authenticated
      using (bucket_id = 'results' and public.results_file_access(name, true))$p$;
    execute $p$create policy library_read on storage.objects for select to authenticated
      using (bucket_id = 'library' and public.library_file_access(name, false))$p$;
    execute $p$create policy library_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'library' and public.library_file_access(name, true))$p$;
    execute $p$create policy library_delete on storage.objects for delete to authenticated
      using (bucket_id = 'library' and public.library_file_access(name, true))$p$;
  end if;
end
$$;
