-- Finance OS (Heni, 24 Nov 2026): Gecko's own money, not only client invoices. Every amount in or out, planned or
-- done, with its VAT, who it's with, how it was paid and the photo of the facture. Private to the founder; the
-- founder can let named team members (an accountant, a partner) look, read-only. Receipts sit in a private bucket.

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('in', 'out')),
  -- planned: to receive or to pay; done: received or paid.
  status text not null default 'done' check (status in ('planned', 'done')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  category text not null default 'other' check (category ~ '^[a-z-]{1,40}$'),
  counterparty text not null default '' check (char_length(counterparty) <= 160),
  client_id text check (client_id is null or char_length(client_id) between 1 and 64),
  -- All taxes included (TTC), in dinars with millimes.
  amount numeric(14, 3) not null check (amount >= 0 and amount < 1000000000),
  vat_rate numeric(5, 2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  method text not null default '' check (method in ('', 'cash', 'transfer', 'cheque', 'card', 'd17', 'flouci', 'other')),
  reference text not null default '' check (char_length(reference) <= 80),
  due_on date,
  done_on date,
  note text not null default '' check (char_length(note) <= 2000),
  receipts text[] not null default '{}' check (cardinality(receipts) <= 12),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'planned' or done_on is not null)
);

create index finance_entries_ws_idx on public.finance_entries (workspace_id, coalesce(done_on, due_on) desc);

create trigger finance_entries_touch before update on public.finance_entries
  for each row execute function public.touch_updated_at();

create table public.finance_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  opening_balance numeric(14, 3) not null default 0,
  opening_on date,
  viewers uuid[] not null default '{}' check (cardinality(viewers) <= 20),
  updated_at timestamptz not null default now()
);

-- 'owner' for the founder, 'viewer' for people the founder let in, null for everyone else.
create function public.finance_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.member_role(p_workspace_id) = 'founder' then 'owner'
    when public.is_workspace_member(p_workspace_id) and exists (
      select 1 from public.finance_settings s
      where s.workspace_id = p_workspace_id and (select auth.uid()) = any (s.viewers)
    ) then 'viewer'
    else null
  end
$$;

revoke all on function public.finance_role(uuid) from public, anon;
grant execute on function public.finance_role(uuid) to authenticated;

alter table public.finance_entries enable row level security;
alter table public.finance_settings enable row level security;

create policy finance_entries_read on public.finance_entries for select to authenticated
  using (public.finance_role(workspace_id) is not null);
create policy finance_entries_add on public.finance_entries for insert to authenticated
  with check (public.finance_role(workspace_id) = 'owner');
create policy finance_entries_edit on public.finance_entries for update to authenticated
  using (public.finance_role(workspace_id) = 'owner')
  with check (public.finance_role(workspace_id) = 'owner');
create policy finance_entries_remove on public.finance_entries for delete to authenticated
  using (public.finance_role(workspace_id) = 'owner');

create policy finance_settings_read on public.finance_settings for select to authenticated
  using (public.finance_role(workspace_id) is not null);

grant select, insert, update, delete on public.finance_entries to authenticated;
grant select on public.finance_settings to authenticated;

-- The opening balance: what the account held on a given day, so the running balance is real.
create function public.set_finance_opening(p_workspace_id uuid, p_amount numeric, p_on date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.finance_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.finance_settings (workspace_id, opening_balance, opening_on)
  values (p_workspace_id, coalesce(p_amount, 0), p_on)
  on conflict (workspace_id) do update
    set opening_balance = excluded.opening_balance, opening_on = excluded.opening_on, updated_at = now();
end
$$;

-- Let a team member look at Finance (read-only), or take it back. Members are named by their member id.
create function public.set_finance_viewer(p_workspace_id uuid, p_member_id text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  if public.finance_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select wm.user_id into uid from public.workspace_members wm
  where wm.workspace_id = p_workspace_id and wm.member_id = p_member_id and wm.active and wm.user_id is not null;
  if uid is null then
    raise exception 'not_a_member' using errcode = '22023';
  end if;
  insert into public.finance_settings (workspace_id) values (p_workspace_id) on conflict do nothing;
  update public.finance_settings s
    set viewers = case
          when p_on then (select array_agg(distinct v) from unnest(s.viewers || uid) v)
          else array_remove(s.viewers, uid)
        end,
        updated_at = now()
    where s.workspace_id = p_workspace_id;
end
$$;

-- The team, for the founder's "who can look" list.
create function public.get_finance_people(p_workspace_id uuid)
returns table (member_id text, name text, role text, can_view boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.finance_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select wm.member_id, wm.display_name, wm.role,
           coalesce(wm.user_id = any (s.viewers), false)
    from public.workspace_members wm
    left join public.finance_settings s on s.workspace_id = wm.workspace_id
    where wm.workspace_id = p_workspace_id and wm.active and wm.role <> 'founder'
    order by wm.display_name;
end
$$;

revoke all on function public.set_finance_opening(uuid, numeric, date) from public, anon;
revoke all on function public.set_finance_viewer(uuid, text, boolean) from public, anon;
revoke all on function public.get_finance_people(uuid) from public, anon;
grant execute on function public.set_finance_opening(uuid, numeric, date) to authenticated;
grant execute on function public.set_finance_viewer(uuid, text, boolean) to authenticated;
grant execute on function public.get_finance_people(uuid) to authenticated;

-- Receipts (factures): a private bucket. Only finance can see them; only the founder adds or removes them.
create function public.receipt_ok(p_name text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ws text := split_part(coalesce(p_name, ''), '/', 1);
begin
  if p_name !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp|pdf)$' then return false; end if;
  if p_write then return public.finance_role(ws::uuid) = 'owner'; end if;
  return public.finance_role(ws::uuid) is not null;
end
$$;

revoke all on function public.receipt_ok(text, boolean) from public, anon;
grant execute on function public.receipt_ok(text, boolean) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    on conflict (id) do nothing;
    execute $p$create policy receipts_read on storage.objects for select to authenticated
      using (bucket_id = 'receipts' and public.receipt_ok(name, false))$p$;
    execute $p$create policy receipts_add on storage.objects for insert to authenticated
      with check (bucket_id = 'receipts' and public.receipt_ok(name, true))$p$;
    execute $p$create policy receipts_remove on storage.objects for delete to authenticated
      using (bucket_id = 'receipts' and public.receipt_ok(name, true))$p$;
  end if;
end
$$;
