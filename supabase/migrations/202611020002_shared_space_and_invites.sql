-- The shared space: what Gecko and the client both fill in.
-- Brand notes: one short living page of do's and don'ts per client, edited by both sides.
-- References: links either side drops in ("this hook", "this light", "never this"), each with a note.
-- Requests: anything not tied to a script or a reel. Each gets an answer from Gecko and closes.
-- The team reads and writes the tables under row level security; clients go through the client_* functions.

-- ---------- brand notes ----------

create table public.client_brand_notes (
  workspace_id uuid not null,
  client_id text not null,
  body text not null default '' check (length(body) <= 8000),
  updated_by_name text not null default '' check (length(updated_by_name) <= 120),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create function public.brand_notes_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    new.updated_by_name := coalesce(public.my_member_name(new.workspace_id), '');
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger client_brand_notes_guard before insert or update on public.client_brand_notes
  for each row execute function public.brand_notes_guard();

-- ---------- references and requests ----------

create table public.shared_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  kind text not null check (kind in ('reference', 'request')),
  title text not null default '' check (length(title) <= 160),
  body text not null default '' check (length(body) <= 4000),
  url text not null default '' check (length(url) <= 1000 and (url = '' or url ~* '^https?://\S+$')),
  status text check (status in ('open', 'answered', 'closed')),
  answer text not null default '' check (length(answer) <= 4000),
  answered_by text not null default '' check (length(answered_by) <= 120),
  answered_at timestamptz,
  from_client boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check ((kind = 'request') = (status is not null)),
  check (kind <> 'request' or length(trim(body)) > 0),
  check (kind <> 'reference' or length(trim(url)) > 0 or length(trim(body)) > 0)
);

create index shared_items_client on public.shared_items(workspace_id, client_id, created_at);

-- Team writes: the database sets who wrote it, and answering a request stamps who answered and when.
create function public.shared_items_guard()
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
    if new.kind = 'request' then raise exception 'client_only'; end if;
    new.from_client := false;
    new.status := null;
    new.answer := '';
    new.answered_by := '';
    new.answered_at := null;
    new.created_by := (select auth.uid());
    new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.client_id := old.client_id;
  new.kind := old.kind;
  new.from_client := old.from_client;
  new.created_by := old.created_by;
  new.author_name := old.author_name;
  new.created_at := old.created_at;
  if old.from_client then
    -- The team answers or closes a client's item but never rewrites what the client wrote.
    new.title := old.title;
    new.body := old.body;
    new.url := old.url;
  end if;
  if old.kind = 'request' then
    if new.answer is distinct from old.answer then
      new.answered_by := coalesce(public.my_member_name(new.workspace_id), '');
      new.answered_at := now();
      if new.status = 'open' and length(trim(new.answer)) > 0 then new.status := 'answered'; end if;
    else
      new.answered_by := old.answered_by;
      new.answered_at := old.answered_at;
    end if;
  else
    new.status := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger shared_items_guard before insert or update on public.shared_items
  for each row execute function public.shared_items_guard();

alter table public.client_brand_notes enable row level security;
alter table public.shared_items enable row level security;
revoke all on public.client_brand_notes, public.shared_items from public, anon, authenticated;
grant select, insert, update on public.client_brand_notes to authenticated;
grant select, insert, update, delete on public.shared_items to authenticated;

create policy brand_notes_read on public.client_brand_notes for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy brand_notes_insert on public.client_brand_notes for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy brand_notes_update on public.client_brand_notes for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));

create policy shared_items_read on public.shared_items for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy shared_items_insert on public.shared_items for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy shared_items_update on public.shared_items for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
-- The team removes its own references; a client's items stay on record (requests close instead).
create policy shared_items_delete on public.shared_items for delete to authenticated
  using (not from_client and public.member_role(workspace_id) in ('founder', 'sales', 'editor')
    and public.has_client_access(workspace_id, client_id));

-- ---------- what the client sees and does ----------

create function public.shared_item_to_json(i public.shared_items)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'title', i.title, 'body', i.body, 'url', i.url, 'status', i.status,
    'answer', i.answer, 'answeredBy', i.answered_by, 'answeredAt', i.answered_at,
    'fromClient', i.from_client, 'mine', i.created_by = (select auth.uid()),
    'authorName', i.author_name, 'createdAt', i.created_at
  )
$$;

create function public.get_my_shared(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  n public.client_brand_notes%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  select * into n from public.client_brand_notes where workspace_id = p_workspace_id and client_id = p_client_id;
  return jsonb_build_object(
    'brandNotes', jsonb_build_object(
      'body', coalesce(n.body, ''), 'updatedBy', coalesce(n.updated_by_name, ''), 'updatedAt', n.updated_at
    ),
    'items', coalesce((
      select jsonb_agg(public.shared_item_to_json(i) order by i.created_at desc)
      from public.shared_items i where i.workspace_id = p_workspace_id and i.client_id = p_client_id
    ), '[]'::jsonb)
  );
end
$$;

create function public.client_save_brand_notes(p_workspace_id uuid, p_client_id text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_body is null or length(p_body) > 8000 then raise exception 'invalid_notes'; end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  insert into public.client_brand_notes(workspace_id, client_id, body, updated_by_name)
  values (p_workspace_id, p_client_id, p_body, who)
  on conflict (workspace_id, client_id) do update set body = excluded.body, updated_by_name = excluded.updated_by_name;
  return public.get_my_shared(p_workspace_id, p_client_id);
end
$$;

-- Add a reference or a request.
create function public.client_add_shared(
  p_workspace_id uuid, p_client_id text, p_kind text, p_title text, p_body text, p_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  i public.shared_items%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('reference', 'request') then raise exception 'invalid_item'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.shared.' || acc.id::text, 0));
  if (select count(*) from public.shared_items x
      where x.workspace_id = p_workspace_id and x.client_id = p_client_id and x.from_client
        and x.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'feedback_rate_limited';
  end if;
  begin
    insert into public.shared_items(workspace_id, client_id, kind, title, body, url, status, from_client, created_by, author_name)
    values (p_workspace_id, p_client_id, p_kind, trim(coalesce(p_title, '')), trim(coalesce(p_body, '')),
      trim(coalesce(p_url, '')), case when p_kind = 'request' then 'open' end, true, (select auth.uid()),
      left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120))
    returning * into i;
  exception when check_violation then
    raise exception 'invalid_item';
  end;
  return public.shared_item_to_json(i);
end
$$;

-- The client removes a reference they added, or withdraws a request nobody has answered yet.
create function public.client_remove_shared(p_workspace_id uuid, p_client_id text, p_id uuid)
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
  delete from public.shared_items
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and from_client and created_by = (select auth.uid())
    and (kind = 'reference' or status = 'open');
  return found;
end
$$;

revoke all on function public.brand_notes_guard(), public.shared_items_guard(),
  public.shared_item_to_json(public.shared_items), public.get_my_shared(uuid, text),
  public.client_save_brand_notes(uuid, text, text),
  public.client_add_shared(uuid, text, text, text, text, text),
  public.client_remove_shared(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.brand_notes_guard(), public.shared_items_guard() to authenticated;
grant execute on function public.get_my_shared(uuid, text),
  public.client_save_brand_notes(uuid, text, text),
  public.client_add_shared(uuid, text, text, text, text, text),
  public.client_remove_shared(uuid, text, uuid)
  to authenticated;

-- ---------- a friendlier invite ----------
-- Whoever holds a live invite link may see which brand it is for and which email it was sent to, so the invite
-- page can greet them by brand and fill in the email for them. Nothing else, and nothing for a used, revoked or
-- expired link. The link itself is the secret: it was sent only to that person.
create function public.peek_client_invite(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('brand', c.brand, 'email', a.email)
  from public.client_accounts a
  join public.clients c on c.workspace_id = a.workspace_id and c.id = a.client_id
  where p_token ~ '^[0-9a-f]{64}$'
    and a.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and a.revoked_at is null and a.accepted_at is null and a.expires_at > now()
  limit 1
$$;

revoke all on function public.peek_client_invite(text) from public;
grant execute on function public.peek_client_invite(text) to anon, authenticated;
