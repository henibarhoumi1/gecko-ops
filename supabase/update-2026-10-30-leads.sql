-- Gecko Ops update, 30 Oct: leads move into their own table (the new app reads it directly; the current app keeps working).
-- Run this once in Supabase > SQL Editor ONLY if you already ran setup.sql before today. A fresh setup.sql already includes it.
-- Your existing leads are copied across; the old copies stay in workspace_records as a backup.

-- Leads get their own table with real columns instead of a JSON blob in workspace_records.
-- The new app reads and writes this table directly, guarded by row level security.
-- The current app keeps working: get/put/delete_workspace_record route the 'leads' collection here.

create table public.leads (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null check (length(id) between 1 and 128),
  brand text not null check (length(trim(brand)) between 1 and 160),
  stage text not null default 'prospect' check (stage in (
    'prospect', 'contacted', 'conversation', 'meeting_booked', 'qualified',
    'proposal_sent', 'negotiation', 'accepted', 'signed', 'won', 'lost', 'nurture'
  )),
  channel text check (length(channel) <= 60),
  contact text check (length(contact) <= 160),
  handle text check (length(handle) <= 160),
  phone text check (length(phone) <= 60),
  whatsapp text check (length(whatsapp) <= 60),
  url text check (length(url) <= 500),
  sector text check (length(sector) <= 120),
  pack text check (length(pack) <= 60),
  value numeric(12, 3) check (value >= 0),
  client_id text,
  owner_member_id text,
  next_step text check (length(next_step) <= 500),
  next_date date,
  lost_reason text check (length(lost_reason) <= 60),
  qualification boolean[] not null default '{}' check (cardinality(qualification) <= 12),
  history jsonb not null default '[]' check (jsonb_typeof(history) = 'array'),
  log jsonb not null default '[]' check (jsonb_typeof(log) = 'array'),
  -- Fields the old app stored that have no column yet; kept so nothing is lost.
  extra jsonb not null default '{}' check (jsonb_typeof(extra) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete set null (client_id),
  foreign key (workspace_id, owner_member_id)
    references public.workspace_members(workspace_id, member_id) on delete set null (owner_member_id)
);

create index leads_workspace_stage on public.leads(workspace_id, stage);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
revoke all on public.leads from public, anon, authenticated;
grant select, insert, update, delete on public.leads to authenticated;

create policy leads_read on public.leads for select to authenticated
  using (
    public.can_read_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );
create policy leads_insert on public.leads for insert to authenticated
  with check (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );
create policy leads_update on public.leads for update to authenticated
  using (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  )
  with check (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );
create policy leads_delete on public.leads for delete to authenticated
  using (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );

-- The JSON shape the current app uses, built from a row.
create function public.lead_to_json(l public.leads)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select l.extra || jsonb_build_object(
    'id', l.id, 'brand', l.brand, 'stage', l.stage,
    'channel', coalesce(l.channel, ''), 'contact', coalesce(l.contact, ''),
    'handle', coalesce(l.handle, ''), 'phone', coalesce(l.phone, ''),
    'whatsapp', coalesce(l.whatsapp, ''), 'url', coalesce(l.url, ''),
    'sector', coalesce(l.sector, ''), 'pack', coalesce(l.pack, ''),
    'value', l.value, 'owner', coalesce(l.owner_member_id, ''),
    'next', coalesce(l.next_step, ''), 'nextDate', coalesce(l.next_date::text, ''),
    'lostReason', coalesce(l.lost_reason, ''), 'q', to_jsonb(l.qualification),
    'history', l.history, 'log', l.log
  ) || case when l.client_id is null then '{}'::jsonb else jsonb_build_object('clientId', l.client_id) end
$$;

-- A row from the current app's JSON shape. Unknown fields go to `extra`; an owner who is not an active member is dropped.
create function public.lead_from_json(p_workspace_id uuid, p_id text, p_data jsonb)
returns public.leads
language plpgsql
stable
set search_path = ''
as $$
declare
  l public.leads;
  next_date_text text := nullif(p_data->>'nextDate', '');
  value_json jsonb := p_data->'value';
begin
  if next_date_text is not null and next_date_text !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'invalid_lead';
  end if;
  if value_json is not null and jsonb_typeof(value_json) not in ('number', 'null')
     and not (jsonb_typeof(value_json) = 'string' and (value_json #>> '{}') in ('', '0')) then
    raise exception 'invalid_lead';
  end if;
  l.workspace_id := p_workspace_id;
  l.id := p_id;
  l.brand := trim(coalesce(p_data->>'brand', ''));
  l.stage := coalesce(nullif(p_data->>'stage', ''), 'prospect');
  l.channel := nullif(p_data->>'channel', '');
  l.contact := nullif(p_data->>'contact', '');
  l.handle := nullif(p_data->>'handle', '');
  l.phone := nullif(p_data->>'phone', '');
  l.whatsapp := nullif(p_data->>'whatsapp', '');
  l.url := nullif(p_data->>'url', '');
  l.sector := nullif(p_data->>'sector', '');
  l.pack := nullif(p_data->>'pack', '');
  l.value := case when jsonb_typeof(value_json) = 'number' then (value_json #>> '{}')::numeric end;
  l.client_id := nullif(p_data->>'clientId', '');
  l.owner_member_id := (
    select wm.member_id from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.member_id = nullif(p_data->>'owner', '') and wm.active
  );
  l.next_step := nullif(p_data->>'next', '');
  l.next_date := next_date_text::date;
  l.lost_reason := nullif(p_data->>'lostReason', '');
  l.qualification := coalesce(
    (select array_agg(x::boolean) from jsonb_array_elements_text(
      case when jsonb_typeof(p_data->'q') = 'array' then p_data->'q' else '[]' end) as q(x)),
    '{}'
  );
  l.history := case when jsonb_typeof(p_data->'history') = 'array' then p_data->'history' else '[]' end;
  l.log := case when jsonb_typeof(p_data->'log') = 'array' then p_data->'log' else '[]' end;
  l.extra := p_data - array[
    'id', 'brand', 'stage', 'channel', 'contact', 'handle', 'phone', 'whatsapp', 'url',
    'sector', 'pack', 'value', 'clientId', 'owner', 'next', 'nextDate', 'lostReason',
    'q', 'history', 'log'
  ]::text[];
  l.created_at := now();
  l.updated_at := now();
  return l;
end
$$;

-- Copy existing leads across. The old rows stay in workspace_records untouched, as a backup.
insert into public.leads
select (public.lead_from_json(r.workspace_id, r.id, r.data)).*
from public.workspace_records r
where r.collection = 'leads'
on conflict (workspace_id, id) do nothing;
update public.leads l set created_at = r.created_at, updated_at = r.updated_at
from public.workspace_records r
where r.collection = 'leads' and r.workspace_id = l.workspace_id and r.id = l.id;

-- The current app's record functions: the originals keep handling every other collection.
alter function public.get_workspace_records(uuid, text) rename to get_workspace_records_base;
alter function public.put_workspace_record(uuid, text, text, jsonb) rename to put_workspace_record_base;
alter function public.delete_workspace_record(uuid, text, text) rename to delete_workspace_record_base;

create function public.get_workspace_records(p_workspace_id uuid, p_collection text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_collection <> 'leads' then
    return query select * from public.get_workspace_records_base(p_workspace_id, p_collection);
    return;
  end if;
  if public.member_role(p_workspace_id) is null
     or not public.can_read_collection(p_workspace_id, 'leads') then raise exception 'forbidden'; end if;
  return query
    select public.lead_to_json(l) from public.leads l
    where l.workspace_id = p_workspace_id
      and (l.client_id is null or public.has_client_access(l.workspace_id, l.client_id));
end
$$;

create function public.put_workspace_record(
  p_workspace_id uuid, p_collection text, p_id text, p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.leads;
begin
  if p_collection <> 'leads' then
    return public.put_workspace_record_base(p_workspace_id, p_collection, p_id, p_data);
  end if;
  if public.member_role(p_workspace_id) is null
     or not public.can_write_collection(p_workspace_id, 'leads') then raise exception 'forbidden'; end if;
  if p_id is null or length(p_id) not between 1 and 128
     or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid_record'; end if;
  if p_data ? 'id' and p_data->>'id' <> p_id then raise exception 'id_mismatch'; end if;
  l := public.lead_from_json(p_workspace_id, p_id, p_data);
  if length(l.brand) not between 1 and 160 or l.stage not in (
    'prospect', 'contacted', 'conversation', 'meeting_booked', 'qualified',
    'proposal_sent', 'negotiation', 'accepted', 'signed', 'won', 'lost', 'nurture'
  ) then raise exception 'invalid_lead'; end if;
  if l.client_id is not null and not public.has_client_access(p_workspace_id, l.client_id) then
    raise exception 'forbidden_client';
  end if;
  if exists (
    select 1 from public.leads o where o.workspace_id = p_workspace_id and o.id = p_id
      and o.client_id is not null and not public.has_client_access(p_workspace_id, o.client_id)
  ) then raise exception 'forbidden_record'; end if;
  insert into public.leads values (l.*)
  on conflict (workspace_id, id) do update set
    brand = excluded.brand, stage = excluded.stage, channel = excluded.channel,
    contact = excluded.contact, handle = excluded.handle, phone = excluded.phone,
    whatsapp = excluded.whatsapp, url = excluded.url, sector = excluded.sector,
    pack = excluded.pack, value = excluded.value, client_id = excluded.client_id,
    owner_member_id = excluded.owner_member_id, next_step = excluded.next_step,
    next_date = excluded.next_date, lost_reason = excluded.lost_reason,
    qualification = excluded.qualification, history = excluded.history,
    log = excluded.log, extra = excluded.extra;
  select * into l from public.leads where workspace_id = p_workspace_id and id = p_id;
  return public.lead_to_json(l);
end
$$;

create function public.delete_workspace_record(
  p_workspace_id uuid, p_collection text, p_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_collection <> 'leads' then
    return public.delete_workspace_record_base(p_workspace_id, p_collection, p_id);
  end if;
  if public.member_role(p_workspace_id) is null
     or not public.can_write_collection(p_workspace_id, 'leads') then raise exception 'forbidden'; end if;
  delete from public.leads
  where workspace_id = p_workspace_id and id = p_id
    and (client_id is null or public.has_client_access(workspace_id, client_id));
  return found;
end
$$;

revoke all on function public.get_workspace_records_base(uuid, text),
  public.put_workspace_record_base(uuid, text, text, jsonb),
  public.delete_workspace_record_base(uuid, text, text),
  public.lead_to_json(public.leads), public.lead_from_json(uuid, text, jsonb),
  public.touch_updated_at()
  from public, anon, authenticated;
revoke all on function public.get_workspace_records(uuid, text),
  public.put_workspace_record(uuid, text, text, jsonb),
  public.delete_workspace_record(uuid, text, text)
  from public, anon;
grant execute on function public.get_workspace_records(uuid, text),
  public.put_workspace_record(uuid, text, text, jsonb),
  public.delete_workspace_record(uuid, text, text)
  to authenticated;
