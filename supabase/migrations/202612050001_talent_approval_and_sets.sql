-- Talent needs two yeses, and each campaign has its own set list (Heni, 23 Nov 2026: "make the talents to be
-- approved from heni and the brand owner", "a talent or more for the script or the idea", "add sets to the
-- campaign, so each video has the option to choose a set from the set list. The list is not location, it's a set
-- list").
--
-- 1. Talent: the founder approves it on Gecko's side (new columns), and on the client's side only the brand
--    owner may approve it (before: any approver). A talent is ready to shoot once both said yes.
-- 2. project_sets: the sets of one campaign (project), in order. Team only. Each script (one video) picks one of
--    them in its shoot plan. Older scripts that picked an approved location keep it.
-- 3. Ideas (concepts) can name the talent they're written for, like scripts already do.
-- 4. Shoot days show names for talent and set instead of ids.
-- Additive only.

-- ---------- 1. talent: the founder's yes ----------

alter table public.production_options
  add column studio_approved_by text check (length(studio_approved_by) <= 120),
  add column studio_approved_at timestamptz;

-- The founder says yes (or takes it back) for Gecko. Talent only.
create function public.set_talent_studio_approval(p_workspace_id uuid, p_client_id text, p_id uuid, p_ok boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'founder_only'; end if;
  select left(coalesce(nullif(trim(m.display_name), ''), m.email, 'Gecko'), 120) into who
  from public.workspace_members m
  where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid());
  update public.production_options
  set studio_approved_by = case when p_ok then coalesce(who, 'Gecko') else null end,
      studio_approved_at = case when p_ok then now() else null end,
      updated_at = now()
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and kind = 'talent';
  if not found then raise exception 'option_not_found'; end if;
end
$$;

-- Both yeses for one client's talent, for the team and for the client's own people.
create function public.get_talent_approvals(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if not ((public.member_role(p_workspace_id) is not null and public.has_client_access(p_workspace_id, p_client_id))
          or (public.my_client_account(p_workspace_id, p_client_id)).id is not null) then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id,
      'studioBy', o.studio_approved_by,
      'studioAt', o.studio_approved_at,
      'brandBy', case when o.status in ('approved', 'booked', 'shot', 'paid', 'invoiced') then o.decided_by end,
      'brandAt', case when o.status in ('approved', 'booked', 'shot', 'paid', 'invoiced') then o.decided_at end
    ))
    from public.production_options o
    where o.workspace_id = p_workspace_id and o.client_id = p_client_id and o.kind = 'talent'
  ), '[]'::jsonb);
end
$$;

revoke all on function public.set_talent_studio_approval(uuid, text, uuid, boolean) from public, anon;
revoke all on function public.get_talent_approvals(uuid, text) from public, anon;
grant execute on function public.set_talent_studio_approval(uuid, text, uuid, boolean) to authenticated;
grant execute on function public.get_talent_approvals(uuid, text) to authenticated;

-- ---------- 1b. the client's side: only the brand owner approves talent ----------

create or replace function public.client_decide_option(
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
    -- Who plays in the brand's ads is the brand owner's call (checked after the budget rules, which apply to all).
    if o.kind = 'talent' and acc.role <> 'owner' then raise exception 'talent_owner_only'; end if;
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

-- ---------- 2. the set list of a campaign ----------

create table public.project_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  project_id text,
  name text not null check (length(trim(name)) between 1 and 120),
  notes text not null default '' check (length(notes) <= 1000),
  position integer not null default 0 check (position between 0 and 100000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_sets_client on public.project_sets(workspace_id, client_id, project_id, position);

create trigger project_sets_touch before update on public.project_sets
  for each row execute function public.touch_updated_at();

alter table public.project_sets enable row level security;
revoke all on public.project_sets from public, anon, authenticated;
grant select, insert, update, delete on public.project_sets to authenticated;

-- The same people who write scripts keep the set list; everyone on the client's team reads it.
create policy project_sets_read on public.project_sets for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy project_sets_insert on public.project_sets for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy project_sets_update on public.project_sets for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy project_sets_delete on public.project_sets for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));

-- ---------- 3. ideas name their talent ----------

alter table public.concepts
  add column talent text[] not null default '{}' check (cardinality(talent) <= 12);

-- ---------- 4. shoot days show names, not ids ----------

create or replace function public.shoot_reel_to_json(r public.shoot_day_reels, s public.scripts, p_team boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'scriptId', s.id, 'title', s.title, 'style', s.style, 'seconds', s.seconds,
    'scriptStatus', s.status, 'position', r.position, 'slot', r.slot, 'status', r.status, 'note', r.note,
    'linesDone', to_jsonb(r.lines_done), 'lineChanges', r.line_changes,
    'updatedBy', r.updated_by_name, 'updatedAt', r.updated_at,
    -- The client reads the lines once the script has been sent to them.
    'shared', p_team or s.status in ('review', 'changes', 'approved'),
    'hooks', case when p_team or s.status in ('review', 'changes', 'approved') then s.hooks else '[]'::jsonb end,
    'beats', case when p_team or s.status in ('review', 'changes', 'approved') then s.beats else '[]'::jsonb end,
    'cta', case when p_team or s.status in ('review', 'changes', 'approved') then s.cta else '' end,
    'hook', s.hook,
    'talent', coalesce((
      select jsonb_agg(coalesce(o.name, t.v) order by t.n)
      from jsonb_array_elements_text(coalesce(s.shoot->'talent', '[]'::jsonb)) with ordinality as t(v, n)
      left join public.production_options o on o.id::text = t.v and o.workspace_id = s.workspace_id
    ), '[]'::jsonb),
    'set', (
      select coalesce(ps.name, o.name, s.shoot->>'set')
      from (select s.shoot->>'set' as v) x
      left join public.project_sets ps on ps.id::text = x.v and ps.workspace_id = s.workspace_id
      left join public.production_options o on o.id::text = x.v and o.workspace_id = s.workspace_id
      where x.v is not null and x.v <> ''
    ),
    'props', coalesce((
      select jsonb_agg(coalesce(o.name, t.v) order by t.n)
      from jsonb_array_elements_text(coalesce(s.shoot->'props', '[]'::jsonb)) with ordinality as t(v, n)
      left join public.production_options o on o.id::text = t.v and o.workspace_id = s.workspace_id
    ), '[]'::jsonb),
    'extraProps', case when p_team then coalesce(s.shoot->>'extraProps', '') else '' end
  )
$$;
