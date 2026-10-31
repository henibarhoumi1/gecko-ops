-- Gecko Ops update, 31 Oct: the client portal (campaign overview, concepts, comments and approvals).
-- Run this once in Supabase > SQL Editor ONLY if you already ran setup.sql before today. A fresh setup.sql already includes it.
-- Nothing existing is changed: it only adds the client_portals, concepts and concept_notes tables and their functions.

-- Client portal: the campaign overview each client sees, and the concepts Gecko and the client write,
-- discuss and approve together. The team reads and writes these tables directly under row level security.
-- Clients never touch the tables: they go through the get_my_portal and client_* functions below,
-- which check that the signed-in person holds a live account for that client.

-- ---------- checks used by the tables ----------

create function public.portal_items_ok(p_items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_items) <= 20
    and coalesce((select bool_and(length(trim(x)) between 1 and 200) from unnest(p_items) as items(x)), true)
$$;

-- Milestones: [{"label": "Shoot", "date": "2026-11-12", "done": false}, ...]
create function public.portal_milestones_ok(p_items jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_items) = 'array'
    and jsonb_array_length(p_items) <= 20
    and coalesce((
      select bool_and(
        jsonb_typeof(m) = 'object'
        and jsonb_typeof(m->'label') = 'string'
        and length(trim(m->>'label')) between 1 and 120
        and (m->'date' is null or jsonb_typeof(m->'date') = 'null'
             or (jsonb_typeof(m->'date') = 'string' and (m->>'date') ~ '^\d{4}-\d{2}-\d{2}$'))
        and (m->'done' is null or jsonb_typeof(m->'done') = 'boolean')
        and (select count(*) from jsonb_object_keys(m)) <= 3
      )
      from jsonb_array_elements(p_items) as items(m)
    ), true)
$$;

-- ---------- the campaign overview ----------

create table public.client_portals (
  workspace_id uuid not null,
  client_id text not null,
  campaign text not null default '' check (length(campaign) <= 160),
  summary text not null default '' check (length(summary) <= 2000),
  included text[] not null default '{}' check (public.portal_items_ok(included)),
  shoot_date date,
  shoot_place text not null default '' check (length(shoot_place) <= 200),
  next_step text not null default '' check (length(next_step) <= 500),
  milestones jsonb not null default '[]' check (public.portal_milestones_ok(milestones)),
  price numeric(12, 3) check (price >= 0),
  deposit_status text not null default 'due' check (deposit_status in ('due', 'paid')),
  balance_status text not null default 'later' check (balance_status in ('later', 'due', 'paid')),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create trigger client_portals_touch before update on public.client_portals
  for each row execute function public.touch_updated_at();

alter table public.client_portals enable row level security;
revoke all on public.client_portals from public, anon, authenticated;
grant select, insert, update, delete on public.client_portals to authenticated;

-- The overview carries the price, so like the money screens it stays with the founder and the client lead.
create policy client_portals_read on public.client_portals for select to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));
create policy client_portals_insert on public.client_portals for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));
create policy client_portals_update on public.client_portals for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));
create policy client_portals_delete on public.client_portals for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));

-- ---------- concepts ----------
-- status: draft (team only), review (waiting for the client), changes (the client asked for changes),
-- approved (the client approved this version), idea (written by the client, not a concept yet).

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  title text not null check (length(trim(title)) between 1 and 160),
  format text not null default 'reel' check (format in ('reel', 'carousel', 'static', 'other')),
  body text not null default '' check (length(body) <= 10000),
  refs text not null default '' check (length(refs) <= 2000),
  position integer not null default 0 check (position between 0 and 100000),
  from_client boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'review', 'changes', 'approved', 'idea')),
  version integer not null default 1 check (version between 1 and 10000),
  approved_version integer,
  approved_at timestamptz,
  approved_by text check (length(approved_by) <= 120),
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check ((status = 'approved') = (approved_at is not null)),
  check ((status = 'approved') = (approved_version is not null)),
  check (status <> 'idea' or from_client)
);

create index concepts_client on public.concepts(workspace_id, client_id, position);

create table public.concept_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  kind text not null default 'comment' check (kind in ('comment', 'approve', 'changes')),
  from_client boolean not null default false,
  author_user uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  body text not null default '' check (length(body) <= 4000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check (kind = 'comment' or from_client),
  check (kind <> 'comment' or length(trim(body)) > 0)
);

create index concept_notes_concept on public.concept_notes(concept_id, created_at);

-- The signed-in team member's name, for the record of who wrote what.
create function public.my_member_name(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(coalesce(nullif(trim(wm.display_name), ''), wm.email), 120)
  from public.workspace_members wm
  where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.active
  limit 1
$$;

-- Rules for team writes (requests run as the authenticated role). The client functions below run as the
-- table owner and set every field themselves, so these rules do not apply to them. The trigger runs as the
-- caller (security invoker) so current_user tells the two apart.
create function public.concepts_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'review') then raise exception 'client_only'; end if;
    new.from_client := false;
    new.version := 1;
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
    new.created_by := (select auth.uid());
    new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  -- UPDATE: who wrote it, when and which client never change.
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.client_id := old.client_id;
  new.from_client := old.from_client;
  new.created_by := old.created_by;
  new.author_name := old.author_name;
  new.created_at := old.created_at;
  -- Only the client can approve or ask for changes; the approval record is theirs.
  if new.status is distinct from old.status and new.status in ('approved', 'changes', 'idea') then
    raise exception 'client_only';
  end if;
  new.approved_version := old.approved_version;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  if (new.title, new.format, new.body, new.refs) is distinct from (old.title, old.format, old.body, old.refs) then
    new.version := old.version + 1;
    -- A changed concept goes back to the client: an old approval no longer covers it.
    if old.status in ('approved', 'changes') and new.status = old.status then new.status := 'review'; end if;
  else
    new.version := old.version;
  end if;
  if new.status <> 'approved' then
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger concepts_guard before insert or update on public.concepts
  for each row execute function public.concepts_guard();

create function public.concept_notes_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.concepts%rowtype;
begin
  if current_user <> 'authenticated' then return new; end if;
  select * into c from public.concepts where id = new.concept_id;
  if not found or c.workspace_id <> new.workspace_id or c.client_id <> new.client_id then
    raise exception 'invalid_note';
  end if;
  if new.kind <> 'comment' then raise exception 'client_only'; end if;
  new.from_client := false;
  new.author_user := (select auth.uid());
  new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
  new.version := c.version;
  new.created_at := now();
  return new;
end
$$;

create trigger concept_notes_guard before insert on public.concept_notes
  for each row execute function public.concept_notes_guard();

alter table public.concepts enable row level security;
alter table public.concept_notes enable row level security;
revoke all on public.concepts, public.concept_notes from public, anon, authenticated;
grant select, insert, update, delete on public.concepts to authenticated;
grant select, insert, delete on public.concept_notes to authenticated;

create policy concepts_read on public.concepts for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy concepts_insert on public.concepts for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy concepts_update on public.concepts for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy concepts_delete on public.concepts for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));

create policy concept_notes_read on public.concept_notes for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy concept_notes_insert on public.concept_notes for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
-- Team members can take back their own comments; the client's approvals and requests stay on record.
create policy concept_notes_delete on public.concept_notes for delete to authenticated
  using (author_user = (select auth.uid()) and not from_client and public.member_role(workspace_id) is not null);

-- ---------- what the client can do ----------

-- The signed-in person's live account for this client, or nothing.
create function public.my_client_account(p_workspace_id uuid, p_client_id text)
returns public.client_accounts
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.client_accounts a
  where a.workspace_id = p_workspace_id and a.client_id = p_client_id
    and a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
  limit 1
$$;

create function public.concept_to_json(c public.concepts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'format', c.format, 'body', c.body, 'refs', c.refs,
    'position', c.position, 'fromClient', c.from_client, 'status', c.status, 'version', c.version,
    'approvedVersion', c.approved_version, 'approvedAt', c.approved_at, 'approvedBy', c.approved_by,
    'authorName', c.author_name, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'fromClient', n.from_client, 'authorName', n.author_name,
        'body', n.body, 'version', n.version, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.concept_notes n where n.concept_id = c.id
    ), '[]'::jsonb)
  )
$$;

-- Everything the portal shows: the overview, every concept the team shared (never drafts), and the client's ideas.
create function public.get_my_portal(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  p public.client_portals%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  select * into p from public.client_portals where workspace_id = p_workspace_id and client_id = p_client_id;
  return jsonb_build_object(
    'brand', (select c.brand from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id),
    'me', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120),
    'overview', case when p.client_id is null then null else jsonb_build_object(
      'campaign', p.campaign, 'summary', p.summary, 'included', to_jsonb(p.included),
      'shootDate', p.shoot_date, 'shootPlace', p.shoot_place, 'nextStep', p.next_step,
      'milestones', p.milestones, 'price', p.price,
      'depositStatus', p.deposit_status, 'balanceStatus', p.balance_status, 'updatedAt', p.updated_at
    ) end,
    'concepts', coalesce((
      select jsonb_agg(public.concept_to_json(c) order by c.position, c.created_at)
      from public.concepts c
      where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.status <> 'draft'
    ), '[]'::jsonb)
  );
end
$$;

-- Approve, ask for changes, or comment. Approving needs the version the client is looking at,
-- so nobody approves a concept that changed since they read it.
create function public.client_concept_note(
  p_workspace_id uuid, p_client_id text, p_concept_id uuid, p_kind text, p_body text, p_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.concepts%rowtype;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('comment', 'approve', 'changes') or p_body is null or length(p_body) > 4000
     or (p_kind in ('comment', 'changes') and length(trim(p_body)) = 0) then
    raise exception 'invalid_note';
  end if;
  select * into c from public.concepts
  where id = p_concept_id and workspace_id = p_workspace_id and client_id = p_client_id and status <> 'draft'
  for update;
  if not found then raise exception 'invalid_note'; end if;
  if p_kind <> 'comment' and (c.status not in ('review', 'changes') or c.version is distinct from p_version) then
    raise exception 'concept_changed';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.notes.' || acc.id::text, 0));
  if (select count(*) from public.concept_notes n
      where n.workspace_id = p_workspace_id and n.client_id = p_client_id and n.from_client
        and n.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'feedback_rate_limited';
  end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  insert into public.concept_notes(workspace_id, client_id, concept_id, kind, from_client, author_user, author_name, body, version)
  values (p_workspace_id, p_client_id, c.id, p_kind, true, (select auth.uid()), who, trim(p_body), c.version);
  if p_kind = 'approve' then
    update public.concepts set status = 'approved', approved_version = c.version, approved_at = now(), approved_by = who
    where id = c.id returning * into c;
  elsif p_kind = 'changes' then
    update public.concepts set status = 'changes', approved_version = null, approved_at = null, approved_by = null
    where id = c.id returning * into c;
  end if;
  return public.concept_to_json(c);
end
$$;

-- The client writes or edits one of their own ideas (p_id null adds a new one). Ideas the team
-- has already taken into a concept can no longer be edited by the client.
create function public.client_save_idea(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_title text, p_body text, p_refs text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.concepts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 160
     or coalesce(length(p_body), 0) > 10000 or coalesce(length(p_refs), 0) > 2000 then
    raise exception 'invalid_idea';
  end if;
  if p_id is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.ideas.' || acc.id::text, 0));
    if (select count(*) from public.concepts x
        where x.workspace_id = p_workspace_id and x.client_id = p_client_id and x.from_client) >= 200 then
      raise exception 'too_many_ideas';
    end if;
    insert into public.concepts(workspace_id, client_id, title, body, refs, position, from_client, status, created_by, author_name)
    values (p_workspace_id, p_client_id, trim(p_title), coalesce(p_body, ''), coalesce(p_refs, ''),
      coalesce((select max(x.position) + 1 from public.concepts x
        where x.workspace_id = p_workspace_id and x.client_id = p_client_id), 0),
      true, 'idea', (select auth.uid()), left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120))
    returning * into c;
  else
    update public.concepts set title = trim(p_title), body = coalesce(p_body, ''), refs = coalesce(p_refs, ''),
      version = version + 1
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
      and from_client and status = 'idea' and created_by = (select auth.uid())
    returning * into c;
    if not found then raise exception 'invalid_idea'; end if;
  end if;
  return public.concept_to_json(c);
end
$$;

create function public.client_delete_idea(p_workspace_id uuid, p_client_id text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  delete from public.concepts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and from_client and status = 'idea' and created_by = (select auth.uid());
  return found;
end
$$;

revoke all on function public.portal_items_ok(text[]), public.portal_milestones_ok(jsonb),
  public.my_member_name(uuid), public.concepts_guard(), public.concept_notes_guard(),
  public.my_client_account(uuid, text), public.concept_to_json(public.concepts),
  public.get_my_portal(uuid, text),
  public.client_concept_note(uuid, text, uuid, text, text, integer),
  public.client_save_idea(uuid, text, uuid, text, text, text),
  public.client_delete_idea(uuid, text, uuid)
  from public, anon, authenticated;
-- The table checks and triggers call these, so every role that writes the tables needs them.
grant execute on function public.portal_items_ok(text[]), public.portal_milestones_ok(jsonb),
  public.my_member_name(uuid), public.concepts_guard(), public.concept_notes_guard() to authenticated;
grant execute on function public.get_my_portal(uuid, text),
  public.client_concept_note(uuid, text, uuid, text, text, integer),
  public.client_save_idea(uuid, text, uuid, text, text, text),
  public.client_delete_idea(uuid, text, uuid)
  to authenticated;
