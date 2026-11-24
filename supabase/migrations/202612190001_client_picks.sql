-- The client picks the talent, the set and the props for each idea and each script, with a note (Heni, 24 Nov
-- 2026: "make sure the client always can select which set and which talents and props and notes on each idea or
-- script really, show the talents pics on the option").
--
-- 1. concepts.client_picks and scripts.client_picks: what the client chose, kept apart from the team's own choice
--    (concepts.talent, scripts.shoot) so neither overwrites the other. The team takes the client's picks in one
--    click.
-- 2. client_set_picks: the client saves picks. Every id must be one of this client's own options (talent, props,
--    locations) or sets; viewers read only.
-- 3. get_my_picks: the client reads their picks and the set list of their campaigns (sets were team-read only).
-- Additive only.

alter table public.concepts
  add column client_picks jsonb not null default '{}'::jsonb
    check (jsonb_typeof(client_picks) = 'object' and pg_column_size(client_picks) <= 8192);
alter table public.scripts
  add column client_picks jsonb not null default '{}'::jsonb
    check (jsonb_typeof(client_picks) = 'object' and pg_column_size(client_picks) <= 8192);

create function public.client_set_picks(
  p_workspace_id uuid, p_client_id text, p_kind text, p_id uuid,
  p_talent uuid[], p_set uuid, p_location uuid, p_props uuid[], p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  picks jsonb;
  n integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role = 'viewer' then raise exception 'viewer_read_only'; end if;
  if p_kind not in ('concept', 'script') then raise exception 'invalid_picks'; end if;
  if length(coalesce(p_note, '')) > 1000
    or cardinality(coalesce(p_talent, '{}')) > 12
    or cardinality(coalesce(p_props, '{}')) > 24 then
    raise exception 'invalid_picks';
  end if;

  -- Every id belongs to this client.
  select count(*) into n from unnest(coalesce(p_talent, '{}')) t(id)
  where not exists (select 1 from public.production_options o where o.id = t.id and o.workspace_id = p_workspace_id
    and o.client_id = p_client_id and o.kind = 'talent' and o.status <> 'passed');
  if n > 0 then raise exception 'invalid_picks'; end if;
  select count(*) into n from unnest(coalesce(p_props, '{}')) t(id)
  where not exists (select 1 from public.production_options o where o.id = t.id and o.workspace_id = p_workspace_id
    and o.client_id = p_client_id and o.kind = 'prop' and o.status <> 'passed');
  if n > 0 then raise exception 'invalid_picks'; end if;
  if p_location is not null and not exists (select 1 from public.production_options o where o.id = p_location
    and o.workspace_id = p_workspace_id and o.client_id = p_client_id and o.kind = 'location' and o.status <> 'passed') then
    raise exception 'invalid_picks';
  end if;
  if p_set is not null and not exists (select 1 from public.project_sets s where s.id = p_set
    and s.workspace_id = p_workspace_id and s.client_id = p_client_id) then
    raise exception 'invalid_picks';
  end if;

  picks := jsonb_build_object(
    'talent', to_jsonb(coalesce(p_talent, '{}')),
    'set', p_set,
    'location', p_location,
    'props', to_jsonb(coalesce(p_props, '{}')),
    'note', trim(coalesce(p_note, '')),
    'by', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120),
    'at', now()
  );
  if p_kind = 'concept' then
    update public.concepts set client_picks = picks
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
  else
    update public.scripts set client_picks = picks
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
  end if;
  if not found then raise exception 'picks_target_not_found'; end if;
  return picks;
end
$$;

create function public.get_my_picks(p_workspace_id uuid, p_client_id text)
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
  return jsonb_build_object(
    'concepts', coalesce((select jsonb_object_agg(c.id, c.client_picks) from public.concepts c
      where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.client_picks <> '{}'::jsonb), '{}'::jsonb),
    'scripts', coalesce((select jsonb_object_agg(s.id, s.client_picks) from public.scripts s
      where s.workspace_id = p_workspace_id and s.client_id = p_client_id and s.client_picks <> '{}'::jsonb), '{}'::jsonb),
    'sets', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'notes', s.notes,
        'projectId', s.project_id) order by s.position, s.created_at)
      from public.project_sets s where s.workspace_id = p_workspace_id and s.client_id = p_client_id), '[]'::jsonb)
  );
end
$$;

revoke all on function public.client_set_picks(uuid, text, text, uuid, uuid[], uuid, uuid, uuid[], text) from public, anon;
revoke all on function public.get_my_picks(uuid, text) from public, anon;
grant execute on function public.client_set_picks(uuid, text, text, uuid, uuid[], uuid, uuid, uuid[], text) to authenticated;
grant execute on function public.get_my_picks(uuid, text) to authenticated;
