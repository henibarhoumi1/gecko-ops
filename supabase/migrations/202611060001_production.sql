-- Portal v2, phase B: talent, locations, props and the production budget.
-- Gecko proposes options (a model, an Airbnb, a prop), the client approves them against one budget per client,
-- and every approved cost is something Gecko pays upfront and puts on the balance invoice.
-- Approving inside the budget takes the owner, an approver or finance. Going over takes the owner or finance,
-- and an explicit "approve over budget". Viewers read and comment only.
-- Nobody touches these tables directly: the team and the client both go through the functions below.

-- ---------- tables ----------

create table public.production_budgets (
  workspace_id uuid not null,
  client_id text not null,
  cap numeric(10, 2) check (cap is null or (cap >= 0 and cap <= 10000000)),
  note text not null default '' check (length(note) <= 500),
  updated_by_name text not null default '' check (length(updated_by_name) <= 120),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create table public.production_options (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  kind text not null check (kind in ('talent', 'location', 'prop')),
  name text not null check (length(trim(name)) between 1 and 120),
  -- Talent: main, extra, voice. Location: the area. Prop: unused.
  role text not null default '' check (length(role) <= 80),
  details text not null default '' check (length(details) <= 4000),
  link text not null default '' check (length(link) <= 1000 and (link = '' or link ~* '^https?://\S+$')),
  -- Paths in the private "production" bucket: <workspace>/<client>/<file>.
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  cost numeric(10, 2) not null default 0 check (cost >= 0 and cost <= 10000000),
  cost_note text not null default '' check (length(cost_note) <= 160),
  when_note text not null default '' check (length(when_note) <= 160),
  usage_terms text not null default '' check (length(usage_terms) <= 500),
  -- Props the client brings cost Gecko nothing and stay off the budget.
  bought_by text not null default 'gecko' check (bought_by in ('gecko', 'client')),
  status text not null default 'proposed' check (status in
    ('suggested', 'proposed', 'approved', 'passed', 'booked', 'shot', 'paid', 'invoiced')),
  over_budget boolean not null default false,
  decided_by text not null default '' check (length(decided_by) <= 120),
  decided_at timestamptz,
  -- Team only: phone numbers, owner contact, deposits.
  private_notes text not null default '' check (length(private_notes) <= 2000),
  release_on_file boolean not null default false,
  from_client boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create index production_options_client on public.production_options(workspace_id, client_id, created_at);

-- Comments and decisions, never edited or deleted: this is the record of who said yes to which cost.
create table public.production_notes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.production_options(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  kind text not null check (kind in ('comment', 'approve', 'pass', 'changed')),
  body text not null default '' check (length(body) <= 2000),
  cost numeric(10, 2),
  from_client boolean not null default false,
  author_user uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now()
);

create index production_notes_option on public.production_notes(option_id, created_at);

alter table public.production_budgets enable row level security;
alter table public.production_options enable row level security;
alter table public.production_notes enable row level security;
revoke all on public.production_budgets, public.production_options, public.production_notes
  from public, anon, authenticated;

-- ---------- shared helpers ----------

-- What counts against the budget: everything said yes to that Gecko pays for.
create function public.production_committed(p_workspace_id uuid, p_client_id text, p_except uuid default null)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(o.cost), 0) from public.production_options o
  where o.workspace_id = p_workspace_id and o.client_id = p_client_id and o.bought_by = 'gecko'
    and o.status in ('approved', 'booked', 'shot', 'paid', 'invoiced')
    and (p_except is null or o.id <> p_except)
$$;

create function public.production_to_json(p_workspace_id uuid, p_client_id text, p_team boolean, p_money boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'budget', case when p_money then jsonb_build_object(
      'cap', b.cap, 'note', coalesce(b.note, ''),
      'committed', public.production_committed(p_workspace_id, p_client_id),
      'updatedAt', b.updated_at
    ) else null end,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'kind', o.kind, 'name', o.name, 'role', o.role, 'details', o.details, 'link', o.link,
        'photos', to_jsonb(o.photos),
        'cost', case when p_money then o.cost else null end,
        'costNote', case when p_money then o.cost_note else '' end,
        'when', o.when_note, 'usage', o.usage_terms, 'boughtBy', o.bought_by, 'status', o.status,
        'overBudget', o.over_budget, 'decidedBy', o.decided_by, 'decidedAt', o.decided_at,
        'fromClient', o.from_client, 'mine', o.created_by = (select auth.uid()), 'authorName', o.author_name,
        'createdAt', o.created_at,
        'privateNotes', case when p_team then o.private_notes else null end,
        'releaseOnFile', case when p_team then o.release_on_file else null end,
        'notes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', n.id, 'kind', n.kind, 'body', n.body,
            'cost', case when p_money then n.cost else null end,
            'fromClient', n.from_client, 'authorName', n.author_name, 'createdAt', n.created_at
          ) order by n.created_at)
          from public.production_notes n where n.option_id = o.id
        ), '[]'::jsonb)
      ) order by o.kind, o.created_at)
      from public.production_options o
      where o.workspace_id = p_workspace_id and o.client_id = p_client_id
    ), '[]'::jsonb)
  )
  from (select 1) one
  left join public.production_budgets b on b.workspace_id = p_workspace_id and b.client_id = p_client_id
$$;

-- ---------- the team ----------

create function public.production_team_check(p_workspace_id uuid, p_client_id text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return coalesce(public.my_member_name(p_workspace_id), '');
end
$$;

create function public.get_production(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.production_team_check(p_workspace_id, p_client_id);
  return public.production_to_json(p_workspace_id, p_client_id, true, true);
end
$$;

create function public.set_production_budget(p_workspace_id uuid, p_client_id text, p_cap numeric, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.production_team_check(p_workspace_id, p_client_id);
begin
  if p_cap is not null and (p_cap < 0 or p_cap > 10000000) then raise exception 'invalid_budget'; end if;
  insert into public.production_budgets(workspace_id, client_id, cap, note, updated_by_name)
  values (p_workspace_id, p_client_id, p_cap, left(trim(coalesce(p_note, '')), 500), who)
  on conflict (workspace_id, client_id) do update set
    cap = excluded.cap, note = excluded.note, updated_by_name = excluded.updated_by_name, updated_at = now();
end
$$;

-- Add or edit an option. A new one, or a client's suggestion Gecko takes up, goes to the client as a proposal.
-- Changing the cost of something already approved sends it back for a new yes.
create function public.save_production_option(p_workspace_id uuid, p_client_id text, p_option jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.production_team_check(p_workspace_id, p_client_id);
  old_row public.production_options%rowtype;
  new_id uuid;
  new_cost numeric := coalesce((p_option->>'cost')::numeric, 0);
  v_photos text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_option->'photos', '[]'::jsonb))), '{}');
begin
  if exists (select 1 from unnest(v_photos) p where p not like p_workspace_id::text || '/' || p_client_id || '/%') then
    raise exception 'invalid_option';
  end if;
  begin
    if p_option->>'id' is null then
      insert into public.production_options(workspace_id, client_id, kind, name, role, details, link, photos, cost,
        cost_note, when_note, usage_terms, bought_by, private_notes, release_on_file, created_by, author_name)
      values (p_workspace_id, p_client_id, p_option->>'kind', trim(coalesce(p_option->>'name', '')),
        trim(coalesce(p_option->>'role', '')), trim(coalesce(p_option->>'details', '')),
        trim(coalesce(p_option->>'link', '')), v_photos, new_cost, trim(coalesce(p_option->>'costNote', '')),
        trim(coalesce(p_option->>'when', '')), trim(coalesce(p_option->>'usage', '')),
        coalesce(p_option->>'boughtBy', 'gecko'), trim(coalesce(p_option->>'privateNotes', '')),
        coalesce((p_option->>'releaseOnFile')::boolean, false), (select auth.uid()), who)
      returning id into new_id;
      return new_id;
    end if;
    select * into old_row from public.production_options
    where id = (p_option->>'id')::uuid and workspace_id = p_workspace_id and client_id = p_client_id for update;
    if not found then raise exception 'option_not_found'; end if;
    update public.production_options set
      name = trim(coalesce(p_option->>'name', '')), role = trim(coalesce(p_option->>'role', '')),
      details = trim(coalesce(p_option->>'details', '')), link = trim(coalesce(p_option->>'link', '')),
      photos = v_photos, cost = new_cost, cost_note = trim(coalesce(p_option->>'costNote', '')),
      when_note = trim(coalesce(p_option->>'when', '')), usage_terms = trim(coalesce(p_option->>'usage', '')),
      bought_by = coalesce(p_option->>'boughtBy', old_row.bought_by),
      private_notes = trim(coalesce(p_option->>'privateNotes', '')),
      release_on_file = coalesce((p_option->>'releaseOnFile')::boolean, false),
      status = case
        when old_row.status = 'suggested' then 'proposed'
        when old_row.status in ('approved', 'booked', 'shot', 'paid', 'invoiced') and new_cost <> old_row.cost then 'proposed'
        else old_row.status end,
      over_budget = case when new_cost <> old_row.cost then false else old_row.over_budget end,
      decided_by = case when new_cost <> old_row.cost then '' else old_row.decided_by end,
      decided_at = case when new_cost <> old_row.cost then null else old_row.decided_at end,
      updated_at = now()
    where id = old_row.id;
  exception when check_violation or invalid_text_representation then
    raise exception 'invalid_option';
  end;
  if new_cost <> old_row.cost and old_row.status <> 'suggested' then
    insert into public.production_notes(option_id, workspace_id, client_id, kind, body, cost, author_user, author_name)
    values (old_row.id, p_workspace_id, p_client_id, 'changed', '', new_cost, (select auth.uid()), who);
  end if;
  return old_row.id;
end
$$;

-- Move an approved option along: booked, shot, paid by Gecko, on the invoice (or a step back).
-- Only the client approves; Gecko never sets "approved" on something that wasn't.
create function public.set_production_status(p_workspace_id uuid, p_client_id text, p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur text;
begin
  perform public.production_team_check(p_workspace_id, p_client_id);
  select status into cur from public.production_options
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if cur is null then raise exception 'option_not_found'; end if;
  if p_status not in ('approved', 'booked', 'shot', 'paid', 'invoiced')
     or cur not in ('approved', 'booked', 'shot', 'paid', 'invoiced') then raise exception 'not_approved_yet'; end if;
  update public.production_options set status = p_status, updated_at = now() where id = p_id;
end
$$;

-- Withdraw an option nobody has said yes to.
create function public.delete_production_option(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_team_check(p_workspace_id, p_client_id);
  delete from public.production_options
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and status in ('suggested', 'proposed', 'passed');
  if not found then raise exception 'option_committed'; end if;
end
$$;

create function public.add_production_note(p_workspace_id uuid, p_client_id text, p_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.production_team_check(p_workspace_id, p_client_id);
begin
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 2000 then raise exception 'invalid_note'; end if;
  if not exists (select 1 from public.production_options
                 where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id) then
    raise exception 'option_not_found';
  end if;
  insert into public.production_notes(option_id, workspace_id, client_id, kind, body, author_user, author_name)
  values (p_id, p_workspace_id, p_client_id, 'comment', trim(p_body), (select auth.uid()), who);
end
$$;

-- ---------- the client ----------

create function public.get_my_production(p_workspace_id uuid, p_client_id text)
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
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  -- Viewers see who and where, not what it costs.
  return public.production_to_json(p_workspace_id, p_client_id, false, acc.role <> 'viewer');
end
$$;

-- Approve or pass on an option. Going over the budget needs p_over = true and the owner or finance.
create function public.client_decide_option(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_decision text, p_body text, p_over boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  o public.production_options%rowtype;
  v_cap numeric;
  v_over boolean := false;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role = 'viewer' then raise exception 'spend_approver_only'; end if;
  if p_decision not in ('approve', 'pass') or length(coalesce(p_body, '')) > 2000 then raise exception 'invalid_note'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.budget.' || p_client_id, 0));
  select * into o from public.production_options
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'option_not_found'; end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  if p_decision = 'approve' then
    if o.status not in ('proposed', 'passed') then raise exception 'not_waiting'; end if;
    select b.cap into v_cap from public.production_budgets b
    where b.workspace_id = p_workspace_id and b.client_id = p_client_id;
    v_over := o.bought_by = 'gecko' and v_cap is not null
      and public.production_committed(p_workspace_id, p_client_id, o.id) + o.cost > v_cap;
    if v_over and not coalesce(p_over, false) then raise exception 'over_budget'; end if;
    if v_over and acc.role not in ('owner', 'finance') then raise exception 'over_budget_owner'; end if;
    update public.production_options set status = 'approved', over_budget = v_over, decided_by = who,
      decided_at = now(), updated_at = now() where id = o.id;
  else
    if o.status not in ('proposed', 'approved') then raise exception 'not_waiting'; end if;
    update public.production_options set status = 'passed', over_budget = false, decided_by = who,
      decided_at = now(), updated_at = now() where id = o.id;
  end if;
  insert into public.production_notes(option_id, workspace_id, client_id, kind, body, cost, from_client, author_user, author_name)
  values (o.id, p_workspace_id, p_client_id, p_decision, trim(coalesce(p_body, '')), o.cost, true, (select auth.uid()), who);
  return public.get_my_production(p_workspace_id, p_client_id);
end
$$;

create function public.client_comment_option(p_workspace_id uuid, p_client_id text, p_id uuid, p_body text)
returns void
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
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 2000 then raise exception 'invalid_note'; end if;
  if not exists (select 1 from public.production_options
                 where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id) then
    raise exception 'option_not_found';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.prodnote.' || acc.id::text, 0));
  if (select count(*) from public.production_notes n
      where n.workspace_id = p_workspace_id and n.client_id = p_client_id and n.author_user = (select auth.uid())
        and n.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'feedback_rate_limited';
  end if;
  insert into public.production_notes(option_id, workspace_id, client_id, kind, body, from_client, author_user, author_name)
  values (p_id, p_workspace_id, p_client_id, 'comment', trim(p_body), true, (select auth.uid()),
    left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120));
end
$$;

-- The client suggests someone or somewhere. Gecko prices it and sends it back as a proposal.
create function public.client_suggest_option(
  p_workspace_id uuid, p_client_id text, p_kind text, p_name text, p_details text, p_link text, p_photos text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) p
             where p not like p_workspace_id::text || '/' || p_client_id || '/%') then
    raise exception 'invalid_option';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.suggest.' || acc.id::text, 0));
  if (select count(*) from public.production_options o
      where o.workspace_id = p_workspace_id and o.client_id = p_client_id and o.from_client
        and o.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'feedback_rate_limited';
  end if;
  begin
    insert into public.production_options(workspace_id, client_id, kind, name, details, link, photos, status,
      from_client, created_by, author_name)
    values (p_workspace_id, p_client_id, p_kind, trim(coalesce(p_name, '')), trim(coalesce(p_details, '')),
      trim(coalesce(p_link, '')), coalesce(p_photos, '{}'), 'suggested', true, (select auth.uid()),
      left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120))
    returning id into new_id;
  exception when check_violation then
    raise exception 'invalid_option';
  end;
  return new_id;
end
$$;

create function public.client_remove_suggestion(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
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
  delete from public.production_options
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and status = 'suggested' and created_by = (select auth.uid());
  if not found then raise exception 'option_not_found'; end if;
end
$$;

-- ---------- grants ----------

revoke all on function public.production_committed(uuid, text, uuid), public.production_to_json(uuid, text, boolean, boolean),
  public.production_team_check(uuid, text), public.get_production(uuid, text),
  public.set_production_budget(uuid, text, numeric, text), public.save_production_option(uuid, text, jsonb),
  public.set_production_status(uuid, text, uuid, text), public.delete_production_option(uuid, text, uuid),
  public.add_production_note(uuid, text, uuid, text), public.get_my_production(uuid, text),
  public.client_decide_option(uuid, text, uuid, text, text, boolean), public.client_comment_option(uuid, text, uuid, text),
  public.client_suggest_option(uuid, text, text, text, text, text, text[]),
  public.client_remove_suggestion(uuid, text, uuid)
  from public, anon;
grant execute on function public.get_production(uuid, text), public.set_production_budget(uuid, text, numeric, text),
  public.save_production_option(uuid, text, jsonb), public.set_production_status(uuid, text, uuid, text),
  public.delete_production_option(uuid, text, uuid), public.add_production_note(uuid, text, uuid, text),
  public.get_my_production(uuid, text), public.client_decide_option(uuid, text, uuid, text, text, boolean),
  public.client_comment_option(uuid, text, uuid, text),
  public.client_suggest_option(uuid, text, text, text, text, text, text[]),
  public.client_remove_suggestion(uuid, text, uuid)
  to authenticated;

-- ---------- photos ----------
-- A private bucket like the board's, 5 MB per photo, same access rule (the team with access, and the client).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('production', 'production', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    execute $p$create policy production_read on storage.objects for select to authenticated
      using (bucket_id = 'production' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
    execute $p$create policy production_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'production' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
  end if;
end
$$;
