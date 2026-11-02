-- Portal v2, phase C (whiteboard): a real whiteboard on white, built on Excalidraw, replacing the green-mat board.
-- One row per board holds the drawing (Excalidraw elements) and a map of its images, which live in the private
-- "boards" bucket. Both sides draw on it; saves merge element by element (the higher version wins), so two people
-- editing different things at once never overwrite each other. The old board tables stay, read-only in the app.

create table public.whiteboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  title text not null check (length(trim(title)) between 1 and 80),
  elements jsonb not null default '[]' check (jsonb_typeof(elements) = 'array'),
  -- Excalidraw file id -> {"path": "<workspace>/<client>/<file>", "mimeType": "image/jpeg"}
  files jsonb not null default '{}' check (jsonb_typeof(files) = 'object'),
  position integer not null default 0,
  rev bigint not null default 1,
  updated_by_name text not null default '' check (length(updated_by_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check (pg_column_size(elements) <= 3000000)
);

create index whiteboards_client on public.whiteboards(workspace_id, client_id, position);

alter table public.whiteboards enable row level security;
revoke all on public.whiteboards from public, anon, authenticated;

-- Who is drawing: a team member with access to the client, or someone on the client's side. Null if neither.
create function public.whiteboard_who(p_workspace_id uuid, p_client_id text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.member_role(p_workspace_id) is not null and public.has_client_access(p_workspace_id, p_client_id) then
    return coalesce(public.my_member_name(p_workspace_id), 'Gecko');
  end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  return left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
end
$$;

create function public.list_whiteboards(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.whiteboard_who(p_workspace_id, p_client_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', w.id, 'title', w.title, 'rev', w.rev, 'updatedAt', w.updated_at,
      'updatedBy', w.updated_by_name) order by w.position, w.created_at)
    from public.whiteboards w where w.workspace_id = p_workspace_id and w.client_id = p_client_id
  ), '[]'::jsonb);
end
$$;

create function public.create_whiteboard(p_workspace_id uuid, p_client_id text, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.whiteboard_who(p_workspace_id, p_client_id);
  new_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.wb.' || p_client_id, 0));
  if (select count(*) from public.whiteboards w where w.workspace_id = p_workspace_id and w.client_id = p_client_id) >= 20 then
    raise exception 'whiteboard_limit';
  end if;
  begin
    insert into public.whiteboards(workspace_id, client_id, title, position, updated_by_name)
    values (p_workspace_id, p_client_id, trim(coalesce(p_title, '')),
      coalesce((select max(w.position) + 1 from public.whiteboards w
                where w.workspace_id = p_workspace_id and w.client_id = p_client_id), 0), who)
    returning id into new_id;
  exception when check_violation then
    raise exception 'invalid_board';
  end;
  return new_id;
end
$$;

create function public.get_whiteboard(p_workspace_id uuid, p_client_id text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w public.whiteboards%rowtype;
begin
  perform public.whiteboard_who(p_workspace_id, p_client_id);
  select * into w from public.whiteboards where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
  if not found then raise exception 'board_not_found'; end if;
  return jsonb_build_object('id', w.id, 'title', w.title, 'elements', w.elements, 'files', w.files, 'rev', w.rev,
    'updatedAt', w.updated_at, 'updatedBy', w.updated_by_name);
end
$$;

-- Cheap check for the 3-second poll: has anyone saved since?
create function public.whiteboard_rev(p_workspace_id uuid, p_client_id text, p_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.whiteboard_who(p_workspace_id, p_client_id);
  return (select w.rev from public.whiteboards w
          where w.id = p_id and w.workspace_id = p_workspace_id and w.client_id = p_client_id);
end
$$;

-- Save what changed. Each element keeps the higher version of the two; files only ever get added.
create function public.save_whiteboard(p_workspace_id uuid, p_client_id text, p_id uuid, p_elements jsonb, p_files jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.whiteboard_who(p_workspace_id, p_client_id);
  w public.whiteboards%rowtype;
  merged jsonb;
begin
  if jsonb_typeof(coalesce(p_elements, '[]')) <> 'array' or jsonb_typeof(coalesce(p_files, '{}')) <> 'object'
     or exists (select 1 from jsonb_array_elements(coalesce(p_elements, '[]')) e
                where jsonb_typeof(e) <> 'object' or e->>'id' is null)
     or exists (select 1 from jsonb_each(coalesce(p_files, '{}')) f
                where f.value->>'path' not like p_workspace_id::text || '/' || p_client_id || '/%') then
    raise exception 'invalid_board';
  end if;
  select * into w from public.whiteboards
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'board_not_found'; end if;
  select coalesce(jsonb_agg(pick order by pick->>'index' collate "C" nulls last, pick->>'id'), '[]'::jsonb) into merged
  from (
    select case
      when cur.e is null then inc.e
      when inc.e is null then cur.e
      when coalesce((inc.e->>'version')::bigint, 0) > coalesce((cur.e->>'version')::bigint, 0) then inc.e
      else cur.e end as pick
    from (select e, e->>'id' as id from jsonb_array_elements(w.elements) e) cur
    full join (select e, e->>'id' as id from jsonb_array_elements(coalesce(p_elements, '[]')) e) inc
      on cur.id = inc.id
  ) picked;
  begin
    update public.whiteboards set elements = merged, files = w.files || coalesce(p_files, '{}'),
      rev = w.rev + 1, updated_by_name = who, updated_at = now()
    where id = w.id;
  exception when check_violation then
    raise exception 'board_too_big';
  end;
  return w.rev + 1;
end
$$;

create function public.rename_whiteboard(p_workspace_id uuid, p_client_id text, p_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.whiteboard_who(p_workspace_id, p_client_id);
  begin
    update public.whiteboards set title = trim(coalesce(p_title, '')), rev = rev + 1, updated_at = now()
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
  exception when check_violation then
    raise exception 'invalid_board';
  end;
  if not found then raise exception 'board_not_found'; end if;
end
$$;

-- Only the team removes a whole board.
create function public.delete_whiteboard(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales', 'editor')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  delete from public.whiteboards where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
  if not found then raise exception 'board_not_found'; end if;
end
$$;

revoke all on function public.whiteboard_who(uuid, text), public.list_whiteboards(uuid, text),
  public.create_whiteboard(uuid, text, text), public.get_whiteboard(uuid, text, uuid),
  public.whiteboard_rev(uuid, text, uuid), public.save_whiteboard(uuid, text, uuid, jsonb, jsonb),
  public.rename_whiteboard(uuid, text, uuid, text), public.delete_whiteboard(uuid, text, uuid)
  from public, anon;
grant execute on function public.list_whiteboards(uuid, text), public.create_whiteboard(uuid, text, text),
  public.get_whiteboard(uuid, text, uuid), public.whiteboard_rev(uuid, text, uuid),
  public.save_whiteboard(uuid, text, uuid, jsonb, jsonb), public.rename_whiteboard(uuid, text, uuid, text),
  public.delete_whiteboard(uuid, text, uuid)
  to authenticated;
