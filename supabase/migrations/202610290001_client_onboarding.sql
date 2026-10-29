-- Client onboarding: one sheet per client, filled by the client in their portal (signed in, or through their live page link)
-- and by the team in the client workspace. Answers are merged key by key, so two people can type at the same time.

create table public.client_onboarding (
  workspace_id uuid not null,
  client_id text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);
alter table public.client_onboarding enable row level security;
revoke all on public.client_onboarding from anon, authenticated;

-- Who may read and write a client's sheet: the founder or sales with access to the client, or a signed-in account of that client.
create function public.can_onboard(p_workspace_id uuid, p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (public.member_role(p_workspace_id) in ('founder', 'sales') and public.has_client_access(p_workspace_id, p_client_id))
    or exists (
      select 1 from public.client_accounts a
      where a.workspace_id = p_workspace_id and a.client_id = p_client_id
        and a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
    )
$$;

-- The client behind a live page link, or nothing.
create function public.onboarding_share_client(p_token text)
returns table (workspace_id uuid, client_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.workspace_id, s.client_id from public.client_shares s
  where p_token is not null and length(p_token) between 40 and 128
    and s.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())
  limit 1
$$;

create function public.onboarding_row(p_workspace_id uuid, p_client_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('data', o.data, 'updatedAt', o.updated_at, 'sentAt', o.sent_at)
     from public.client_onboarding o where o.workspace_id = p_workspace_id and o.client_id = p_client_id),
    jsonb_build_object('data', '{}'::jsonb, 'updatedAt', null, 'sentAt', null))
$$;

-- Merge changed answers (a key set to null is removed). p_sent marks the sheet as sent to Gecko.
create function public.onboarding_merge(p_workspace_id uuid, p_client_id text, p_patch jsonb, p_sent boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or pg_catalog.pg_column_size(p_patch) > 200000 then
    raise exception 'invalid_onboarding';
  end if;
  insert into public.client_onboarding(workspace_id, client_id, data, sent_at)
  values (p_workspace_id, p_client_id, jsonb_strip_nulls(p_patch), case when p_sent then now() end)
  on conflict (workspace_id, client_id) do update set
    data = jsonb_strip_nulls(public.client_onboarding.data || p_patch),
    updated_at = now(),
    sent_at = case when p_sent then now() else public.client_onboarding.sent_at end;
  if pg_catalog.pg_column_size((select o.data from public.client_onboarding o
      where o.workspace_id = p_workspace_id and o.client_id = p_client_id)) > 400000 then
    raise exception 'onboarding_too_large';
  end if;
  return public.onboarding_row(p_workspace_id, p_client_id);
end
$$;

-- Team or signed-in client.
create function public.get_client_onboarding(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_onboard(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return public.onboarding_row(p_workspace_id, p_client_id);
end
$$;

create function public.save_client_onboarding(p_workspace_id uuid, p_client_id text, p_patch jsonb, p_sent boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_onboard(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return public.onboarding_merge(p_workspace_id, p_client_id, p_patch, coalesce(p_sent, false));
end
$$;

-- Anyone holding the client's live page link.
create function public.get_shared_onboarding(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w uuid; c text;
begin
  select s.workspace_id, s.client_id into w, c from public.onboarding_share_client(p_token) s;
  if w is null then raise exception 'invalid_share'; end if;
  return public.onboarding_row(w, c);
end
$$;

create function public.save_shared_onboarding(p_token text, p_patch jsonb, p_sent boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w uuid; c text;
begin
  select s.workspace_id, s.client_id into w, c from public.onboarding_share_client(p_token) s;
  if w is null then raise exception 'invalid_share'; end if;
  return public.onboarding_merge(w, c, p_patch, coalesce(p_sent, false));
end
$$;

revoke all on function public.can_onboard(uuid, text), public.onboarding_share_client(text), public.onboarding_row(uuid, text),
  public.onboarding_merge(uuid, text, jsonb, boolean), public.get_client_onboarding(uuid, text),
  public.save_client_onboarding(uuid, text, jsonb, boolean), public.get_shared_onboarding(text),
  public.save_shared_onboarding(text, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.get_client_onboarding(uuid, text), public.save_client_onboarding(uuid, text, jsonb, boolean)
  to authenticated;
grant execute on function public.get_shared_onboarding(text), public.save_shared_onboarding(text, jsonb, boolean)
  to anon, authenticated;
