-- The trash (Gecko World V1, phase 2): every delete, by anyone on either side, is kept and can be put back.
-- A trigger copies each row just before it is deleted, together with the rows deleted with it (an idea's
-- notes, a script's versions…), all under one batch. Restoring a batch puts the rows back in the order they
-- left, and re-links what the delete unlinked (the scripts of an idea, the posts of a reel).
--
-- Who restores: the founder and producers, anything; anyone, their own deletes of the last hour (Undo).
-- Emptying the trash is a separate, labelled step: nothing here destroys anything.

create table public.trash (
  id bigserial primary key,
  batch bigint not null,
  workspace_id uuid not null,
  client_id text,
  tbl text not null,
  row_id text not null default '',
  label text not null default '',
  data jsonb not null,
  -- Rows that pointed at this one and were unlinked by the delete: [{"tbl","col","ids"}].
  links jsonb not null default '[]'::jsonb,
  -- The row the person deleted (the others went with it).
  top boolean not null default false,
  deleted_by uuid,
  deleted_by_name text not null default '',
  deleted_at timestamptz not null default now(),
  restored_at timestamptz,
  restored_by_name text not null default ''
);

create index trash_workspace on public.trash(workspace_id, deleted_at desc);
create index trash_batch on public.trash(batch);
alter table public.trash enable row level security;
revoke all on public.trash from public, anon, authenticated;
revoke all on sequence public.trash_id_seq from public, anon, authenticated;

create function public.to_trash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d jsonb := to_jsonb(old);
  ws uuid := (d->>'workspace_id')::uuid;
  -- One batch per delete: the transaction and the moment its statement started (rows deleted with it share both).
  -- 52 bits, so the number stays exact in a browser.
  b bigint := ('x' || left(md5(pg_catalog.txid_current()::text || pg_catalog.statement_timestamp()::text), 13))::bit(52)::bigint;
  v_links jsonb := '[]'::jsonb;
  who text;
begin
  if ws is null then return old; end if;
  if tg_table_name = 'concepts' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_links from (
      select jsonb_build_object('tbl', 'scripts', 'col', 'concept_id', 'ids', jsonb_agg(s.id)) x
      from public.scripts s where s.concept_id = (d->>'id')::uuid having count(*) > 0
    ) l;
  elsif tg_table_name = 'cuts' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_links from (
      select jsonb_build_object('tbl', 'posts', 'col', 'cut_id', 'ids', jsonb_agg(p.id)) x
      from public.posts p where p.cut_id = (d->>'id')::uuid having count(*) > 0
    ) l;
  end if;
  who := coalesce(
    public.my_member_name(ws),
    (select nullif(trim(a.display_name), '') from public.client_accounts a
     where a.workspace_id = ws and a.user_id = (select auth.uid()) and a.revoked_at is null limit 1),
    '');
  insert into public.trash(batch, workspace_id, client_id, tbl, row_id, label, data, links, top,
    deleted_by, deleted_by_name)
  values (b, ws, d->>'client_id', tg_table_name, coalesce(d->>'id', ''),
    left(coalesce(nullif(d->>'title', ''), nullif(d->>'brand', ''), nullif(d->>'name', ''),
      nullif(d->>'number', ''), nullif(d->>'body', ''), tg_table_name), 160),
    d, v_links, not exists (select 1 from public.trash t where t.batch = b),
    (select auth.uid()), left(who, 120));
  return old;
end
$$;

revoke all on function public.to_trash() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['concepts', 'concept_notes', 'scripts', 'script_notes', 'script_versions',
    'shoot_day_reels', 'shared_items', 'board_items', 'invoices', 'production_options', 'production_notes',
    'monthly_reads', 'library_items', 'posts', 'post_numbers', 'cuts', 'cut_notes', 'cut_versions',
    'whiteboards', 'leads']
  loop
    execute format('create trigger %I before delete on public.%I for each row execute function public.to_trash()',
      t || '_to_trash', t);
  end loop;
end
$$;

-- ---------- reading the trash ----------

-- The founder and producers: everything deleted in the workspace in the last 30 days, newest first.
create function public.get_trash(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'batch', t.batch, 'kind', t.tbl, 'label', t.label, 'clientId', t.client_id,
      'brand', (select c.brand from public.clients c where c.workspace_id = t.workspace_id and c.id = t.client_id),
      'deletedBy', t.deleted_by_name, 'deletedAt', t.deleted_at,
      'withIt', (select count(*) - 1 from public.trash x where x.batch = t.batch),
      'restoredAt', t.restored_at, 'restoredBy', t.restored_by_name
    ) order by t.deleted_at desc)
    from public.trash t
    where t.workspace_id = p_workspace_id and t.top and t.deleted_at > now() - interval '30 days'
      and (t.client_id is null or public.has_client_access(t.workspace_id, t.client_id))
  ), '[]'::jsonb);
end
$$;

-- What the signed-in person just deleted, for the Undo button.
create function public.get_my_last_delete(p_workspace_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('batch', t.batch, 'kind', t.tbl, 'label', t.label, 'deletedAt', t.deleted_at)
  from public.trash t
  where t.workspace_id = p_workspace_id and t.top and t.deleted_by = (select auth.uid())
    and t.restored_at is null and t.deleted_at > now() - interval '2 minutes'
  order by t.id desc
  limit 1
$$;

-- ---------- putting it back ----------

create function public.restore_trash(p_workspace_id uuid, p_batch bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.trash;
  l jsonb;
  done integer := 0;
  skipped integer := 0;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.trash t where t.batch = p_batch and t.workspace_id = p_workspace_id
                 and t.restored_at is null) then
    raise exception 'trash_not_found';
  end if;
  -- Founder and producers restore anything they can see; anyone restores their own delete of the last hour.
  if not (
    (coalesce(public.member_role(p_workspace_id), '') in ('founder', 'sales')
      and not exists (select 1 from public.trash t where t.batch = p_batch and t.client_id is not null
                      and not public.has_client_access(p_workspace_id, t.client_id)))
    or not exists (select 1 from public.trash t where t.batch = p_batch
                   and (t.deleted_by is distinct from (select auth.uid()) or t.deleted_at < now() - interval '1 hour'))
  ) then
    raise exception 'forbidden';
  end if;
  who := coalesce(
    public.my_member_name(p_workspace_id),
    (select nullif(trim(a.display_name), '') from public.client_accounts a
     where a.workspace_id = p_workspace_id and a.user_id = (select auth.uid()) and a.revoked_at is null limit 1),
    '');
  for r in select * from public.trash t where t.batch = p_batch and t.workspace_id = p_workspace_id
           and t.restored_at is null order by t.id loop
    begin
      execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1) on conflict do nothing',
        r.tbl, r.tbl) using r.data;
      for l in select * from jsonb_array_elements(r.links) loop
        execute format('update public.%I set %I = $1 where id = any($2) and %I is null',
          l->>'tbl', l->>'col', l->>'col')
          using (r.data->>'id')::uuid, array(select jsonb_array_elements_text(l->'ids'))::uuid[];
      end loop;
      done := done + 1;
    exception when others then
      -- The item itself must come back; a note or version that can't (its author lost access) is skipped.
      if r.top then raise exception 'restore_failed'; end if;
      skipped := skipped + 1;
    end;
  end loop;
  update public.trash set restored_at = now(), restored_by_name = left(who, 120)
  where batch = p_batch and workspace_id = p_workspace_id and restored_at is null;
  return jsonb_build_object('restored', done, 'skipped', skipped);
end
$$;

revoke all on function public.get_trash(uuid), public.get_my_last_delete(uuid), public.restore_trash(uuid, bigint)
  from public, anon;
grant execute on function public.get_trash(uuid), public.get_my_last_delete(uuid), public.restore_trash(uuid, bigint)
  to authenticated;
