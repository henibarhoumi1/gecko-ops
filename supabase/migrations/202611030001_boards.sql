-- Boards: a shared canvas per client, for moodboards, shot lists, call sheets and anything else Gecko and the
-- client plan together. A board holds cards (notes, to-dos, links, videos played from their link, images,
-- tables, columns, arrows) and other boards. The team and the client both edit it.
--
-- Nobody touches the tables directly. Everyone goes through the functions below, which let in a team member with
-- access to the client, or a live client account for that client. Every change bumps the board's rev, so open
-- screens can poll one number and reload only when something changed.

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  parent_id uuid references public.boards(id) on delete cascade,
  title text not null default '' check (length(title) <= 120),
  rev bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create unique index boards_one_root on public.boards (workspace_id, client_id) where parent_id is null;
create index boards_parent on public.boards (parent_id);

create table public.board_items (
  id uuid primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  kind text not null check (kind in ('note', 'todo', 'link', 'video', 'image', 'table', 'column', 'board', 'arrow')),
  x double precision not null default 0 check (x between -100000 and 100000),
  y double precision not null default 0 check (y between -100000 and 100000),
  w double precision not null default 280 check (w between 40 and 4000),
  h double precision check (h is null or h between 40 and 4000),
  z integer not null default 0,
  column_id uuid,
  position double precision not null default 0,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and length(data::text) <= 20000),
  author_name text not null default '' check (length(author_name) <= 120),
  from_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_items_board on public.board_items (board_id);

alter table public.boards enable row level security;
alter table public.board_items enable row level security;
revoke all on public.boards from public, anon, authenticated;
revoke all on public.board_items from public, anon, authenticated;

-- Who is asking: a team member with access to this client, or the client. Raises when neither.
create function public.board_actor(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.has_client_access(p_workspace_id, p_client_id) then
    select coalesce(nullif(trim(wm.display_name), ''), wm.email) into who
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.active
    limit 1;
    return jsonb_build_object('name', left(coalesce(who, 'Gecko'), 120), 'client', false);
  end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  return jsonb_build_object('name', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120), 'client', true);
end
$$;

-- Used by the storage policies on the board images bucket: true for the team with access, and for the client.
create function public.board_access(p_workspace_id text, p_client_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ws uuid;
begin
  if p_workspace_id !~ '^[0-9a-f-]{36}$' then return false; end if;
  ws := p_workspace_id::uuid;
  return public.has_client_access(ws, p_client_id) or (public.my_client_account(ws, p_client_id)).id is not null;
end
$$;

create function public.board_item_to_json(i public.board_items)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'x', i.x, 'y', i.y, 'w', i.w, 'h', i.h, 'z', i.z,
    'columnId', i.column_id, 'position', i.position, 'data', i.data,
    'author', i.author_name, 'fromClient', i.from_client, 'updatedAt', i.updated_at,
    'count', case when i.kind = 'board' then (
      select count(*) from public.board_items c
      where c.board_id = (case when i.data->>'boardId' ~ '^[0-9a-f-]{36}$' then (i.data->>'boardId')::uuid end)
        and c.kind <> 'arrow'
    ) end
  )
$$;

-- Finds the board and checks it belongs to this client. A null board means the client's top board, made on first open.
create function public.board_for(p_workspace_id uuid, p_client_id text, p_board_id uuid)
returns public.boards
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
begin
  if p_board_id is null then
    select * into b from public.boards
    where workspace_id = p_workspace_id and client_id = p_client_id and parent_id is null;
    if b.id is null then
      insert into public.boards (workspace_id, client_id, title)
      values (p_workspace_id, p_client_id,
        coalesce((select c.brand from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id), 'Board'))
      on conflict do nothing;
      select * into b from public.boards
      where workspace_id = p_workspace_id and client_id = p_client_id and parent_id is null;
    end if;
  else
    select * into b from public.boards
    where id = p_board_id and workspace_id = p_workspace_id and client_id = p_client_id;
  end if;
  if b.id is null then raise exception 'board_not_found'; end if;
  return b;
end
$$;

create function public.get_board(p_workspace_id uuid, p_client_id text, p_board_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  b := public.board_for(p_workspace_id, p_client_id, p_board_id);
  return jsonb_build_object(
    'board', jsonb_build_object('id', b.id, 'title', b.title, 'parentId', b.parent_id, 'rev', b.rev),
    'path', (
      with recursive up as (
        select p.id, p.parent_id, p.title, 0 as depth from public.boards p where p.id = b.parent_id
        union all
        select p.id, p.parent_id, p.title, up.depth + 1 from public.boards p join up on p.id = up.parent_id
        where up.depth < 50
      )
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title) order by depth desc), '[]'::jsonb) from up
    ),
    'items', coalesce((
      select jsonb_agg(public.board_item_to_json(i) order by i.z, i.created_at)
      from public.board_items i where i.board_id = b.id
    ), '[]'::jsonb)
  );
end
$$;

-- One cheap number for open screens to poll.
create function public.board_rev(p_workspace_id uuid, p_client_id text, p_board_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r bigint;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  select rev into r from public.boards
  where id = p_board_id and workspace_id = p_workspace_id and client_id = p_client_id;
  if r is null then raise exception 'board_not_found'; end if;
  return r;
end
$$;

-- Adds or updates cards, many at once (a template, a drag of several cards). Each card is a JSON object with an
-- id made by the app. A new board card gets its board made here. Returns the new rev.
create function public.save_board_items(p_workspace_id uuid, p_client_id text, p_board_id uuid, p_items jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.board_actor(p_workspace_id, p_client_id);
  b public.boards := public.board_for(p_workspace_id, p_client_id, p_board_id);
  it jsonb;
  item_id uuid;
  d jsonb;
  child uuid;
  r bigint;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then raise exception 'invalid_card'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or coalesce(it->>'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (it ? 'data' and jsonb_typeof(it->'data') <> 'object') then
      raise exception 'invalid_card';
    end if;
    item_id := (it->>'id')::uuid;
    if exists (select 1 from public.board_items where id = item_id and board_id <> b.id) then
      raise exception 'invalid_card';
    end if;
    d := coalesce(it->'data', (select data from public.board_items where id = item_id), '{}'::jsonb);

    if it->>'kind' = 'board' and not exists (select 1 from public.board_items where id = item_id) then
      if (select count(*) from public.boards where workspace_id = p_workspace_id and client_id = p_client_id) >= 200 then
        raise exception 'too_many_boards';
      end if;
      insert into public.boards (workspace_id, client_id, parent_id, title)
      values (p_workspace_id, p_client_id, b.id, left(coalesce(nullif(trim(d->>'title'), ''), 'Untitled board'), 120))
      returning id into child;
      d := d || jsonb_build_object('boardId', child);
    elsif exists (select 1 from public.board_items where id = item_id and kind = 'board') then
      -- the card keeps pointing at its own board, whatever the app sends
      d := d || jsonb_build_object('boardId', (select data->'boardId' from public.board_items where id = item_id));
    end if;

    insert into public.board_items as i (id, board_id, kind, x, y, w, h, z, column_id, position, data, author_name, from_client)
    values (
      item_id, b.id, it->>'kind',
      coalesce((it->>'x')::double precision, 0), coalesce((it->>'y')::double precision, 0),
      coalesce((it->>'w')::double precision, 280), (it->>'h')::double precision,
      coalesce((it->>'z')::integer, 0),
      case when it->>'columnId' ~ '^[0-9a-f-]{36}$' then (it->>'columnId')::uuid end,
      coalesce((it->>'position')::double precision, 0),
      d, actor->>'name', (actor->>'client')::boolean
    )
    on conflict (id) do update set
      x = coalesce((it->>'x')::double precision, i.x),
      y = coalesce((it->>'y')::double precision, i.y),
      w = coalesce((it->>'w')::double precision, i.w),
      h = case when it ? 'h' then (it->>'h')::double precision else i.h end,
      z = coalesce((it->>'z')::integer, i.z),
      column_id = case when it ? 'columnId' then
        case when it->>'columnId' ~ '^[0-9a-f-]{36}$' then (it->>'columnId')::uuid end else i.column_id end,
      position = coalesce((it->>'position')::double precision, i.position),
      data = excluded.data,
      updated_at = now();
  end loop;

  if (select count(*) from public.board_items where board_id = b.id) > 500 then raise exception 'board_full'; end if;
  -- a card can only sit in a column of the same board
  update public.board_items i set column_id = null
  where i.board_id = b.id and i.column_id is not null
    and not exists (select 1 from public.board_items c where c.id = i.column_id and c.board_id = b.id and c.kind = 'column');

  update public.boards set rev = rev + 1, updated_at = now() where id = b.id returning rev into r;
  -- a board card shows how many cards its board holds, so the parent changes too
  if b.parent_id is not null then update public.boards set rev = rev + 1 where id = b.parent_id; end if;
  return r;
end
$$;

-- Deletes cards. Cards in a deleted column stay on the board, arrows to a deleted card go with it, and a deleted
-- board card takes its board and everything in it.
create function public.delete_board_items(p_workspace_id uuid, p_client_id text, p_board_id uuid, p_ids uuid[])
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
  r bigint;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  b := public.board_for(p_workspace_id, p_client_id, p_board_id);
  if cardinality(p_ids) > 200 then raise exception 'invalid_card'; end if;

  update public.board_items set column_id = null where board_id = b.id and column_id = any(p_ids);
  delete from public.boards child
  using public.board_items i
  where i.board_id = b.id and i.id = any(p_ids) and i.kind = 'board'
    and i.data->>'boardId' ~ '^[0-9a-f-]{36}$' and child.id = (i.data->>'boardId')::uuid and child.parent_id = b.id;
  delete from public.board_items
  where board_id = b.id and (id = any(p_ids)
    or (kind = 'arrow' and (data->>'from' = any(p_ids::text[]) or data->>'to' = any(p_ids::text[]))));

  update public.boards set rev = rev + 1, updated_at = now() where id = b.id returning rev into r;
  if b.parent_id is not null then update public.boards set rev = rev + 1 where id = b.parent_id; end if;
  return r;
end
$$;

create function public.rename_board(p_workspace_id uuid, p_client_id text, p_board_id uuid, p_title text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
  t text := left(trim(coalesce(p_title, '')), 120);
  r bigint;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  b := public.board_for(p_workspace_id, p_client_id, p_board_id);
  if t = '' then raise exception 'invalid_card'; end if;
  update public.boards set title = t, rev = rev + 1, updated_at = now() where id = b.id returning rev into r;
  if b.parent_id is not null then
    update public.board_items set data = data || jsonb_build_object('title', t), updated_at = now()
    where board_id = b.parent_id and kind = 'board' and data->>'boardId' = b.id::text;
    update public.boards set rev = rev + 1 where id = b.parent_id;
  end if;
  return r;
end
$$;

revoke all on function public.board_actor(uuid, text) from public, anon;
revoke all on function public.board_access(text, text) from public, anon;
revoke all on function public.board_for(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.board_item_to_json(public.board_items) from public, anon, authenticated;
revoke all on function public.get_board(uuid, text, uuid) from public, anon;
revoke all on function public.board_rev(uuid, text, uuid) from public, anon;
revoke all on function public.save_board_items(uuid, text, uuid, jsonb) from public, anon;
revoke all on function public.delete_board_items(uuid, text, uuid, uuid[]) from public, anon;
revoke all on function public.rename_board(uuid, text, uuid, text) from public, anon;
grant execute on function public.board_actor(uuid, text) to authenticated;
grant execute on function public.board_access(text, text) to authenticated;
grant execute on function public.get_board(uuid, text, uuid) to authenticated;
grant execute on function public.board_rev(uuid, text, uuid) to authenticated;
grant execute on function public.save_board_items(uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.delete_board_items(uuid, text, uuid, uuid[]) to authenticated;
grant execute on function public.rename_board(uuid, text, uuid, text) to authenticated;

-- Images on boards: a private bucket, 5 MB per image, paths <workspace>/<client>/<file>. Only runs where Supabase
-- storage exists (not in the local test database).
do $do$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('boards', 'boards', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    on conflict (id) do nothing;
    execute $p$create policy boards_read on storage.objects for select to authenticated
      using (bucket_id = 'boards' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
    execute $p$create policy boards_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'boards' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
    execute $p$create policy boards_delete on storage.objects for delete to authenticated
      using (bucket_id = 'boards' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
  end if;
end
$do$;
