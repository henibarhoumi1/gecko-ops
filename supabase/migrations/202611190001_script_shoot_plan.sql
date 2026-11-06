-- The shoot plan of a script: which approved talent plays it, on which set, with which props.
-- Team only. It picks from the client's production options; changing it is logistics, not a new version
-- of the words, so the script keeps its status and approval.
create function public.shoot_plan_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (select bool_and(k in ('talent', 'set', 'props', 'extraProps')) from jsonb_object_keys(p) as keys(k)) is not false
    and (p->'talent' is null or (jsonb_typeof(p->'talent') = 'array' and jsonb_array_length(p->'talent') <= 12
         and not exists (select 1 from jsonb_array_elements(p->'talent') e where jsonb_typeof(e) <> 'string')))
    and (p->'set' is null or jsonb_typeof(p->'set') in ('string', 'null'))
    and (p->'props' is null or (jsonb_typeof(p->'props') = 'array' and jsonb_array_length(p->'props') <= 30
         and not exists (select 1 from jsonb_array_elements(p->'props') e where jsonb_typeof(e) <> 'string')))
    and (p->'extraProps' is null or (jsonb_typeof(p->'extraProps') = 'string' and length(p->>'extraProps') <= 1000))
$$;

alter table public.scripts add column shoot jsonb not null default '{}'::jsonb check (public.shoot_plan_ok(shoot));
