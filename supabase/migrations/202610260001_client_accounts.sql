-- Client accounts: a client signs in with their own email and sees only their own published client page.
-- One Gecko workspace per install: only the first workspace can be created from the app.

create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  w_id uuid;
  member_key text;
  user_email text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  user_email := lower(coalesce((select auth.jwt()->>'email'), ''));
  if user_email = '' or not exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  ) then raise exception 'verified_email_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.create_workspace', 0));
  if exists (select 1 from public.workspaces) then raise exception 'workspace_exists'; end if;
  insert into public.workspaces(name) values (trim(p_name)) returning id into w_id;
  member_key := 'm' || left(replace((select auth.uid())::text, '-', ''), 16);
  insert into public.workspace_members(
    workspace_id, member_id, user_id, email, display_name, role
  ) values (
    w_id, member_key, (select auth.uid()), user_email,
    coalesce(nullif(trim((select auth.jwt()->>'user_metadata')::jsonb->>'name'), ''), 'Founder'),
    'founder'
  );
  insert into public.workspace_settings(workspace_id, data) values (w_id, '{}'::jsonb);
  return w_id;
end
$$;

create table public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  display_name text not null default '' check (length(display_name) <= 120),
  user_id uuid references auth.users(id) on delete set null,
  token_hash bytea unique check (token_hash is null or octet_length(token_hash) = 32),
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, client_id, email),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete cascade
);
alter table public.client_accounts enable row level security;
revoke all on public.client_accounts from anon, authenticated;

-- Team side: founder or sales (with access to that client) invites a client email. Returns the one-time invite code.
create function public.invite_client_account(p_workspace_id uuid, p_client_id text, p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text;
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  if p_email is null or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_invite'; end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.client_accounts(workspace_id, client_id, email, token_hash, expires_at, invited_by)
  values (p_workspace_id, p_client_id, lower(trim(p_email)),
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), now() + interval '14 days', (select auth.uid()))
  on conflict (workspace_id, client_id, email) do update set
    token_hash = excluded.token_hash, expires_at = excluded.expires_at,
    revoked_at = null, invited_by = excluded.invited_by,
    accepted_at = case when public.client_accounts.user_id is null then null else public.client_accounts.accepted_at end;
  return raw_token;
end
$$;

create function public.list_client_accounts(p_workspace_id uuid, p_client_id text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return query
    select jsonb_build_object('id', a.id, 'email', a.email, 'name', a.display_name,
      'joined', a.accepted_at is not null and a.user_id is not null,
      'expires', a.expires_at, 'revoked', a.revoked_at is not null, 'createdAt', a.created_at)
    from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id
    order by a.created_at;
end
$$;

create function public.revoke_client_account(p_workspace_id uuid, p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_id text;
begin
  select client_id into c_id from public.client_accounts where workspace_id = p_workspace_id and id = p_account_id;
  if c_id is null or public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, c_id) then raise exception 'forbidden'; end if;
  update public.client_accounts set revoked_at = now(), token_hash = null
  where workspace_id = p_workspace_id and id = p_account_id;
end
$$;

-- Client side: the signed-in client claims the invite sent to their verified email.
create function public.accept_client_invite(p_token text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts%rowtype;
  user_email text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  user_email := lower(coalesce((select auth.jwt()->>'email'), ''));
  if p_token is null or length(p_token) <> 64 or not exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  ) then raise exception 'invalid_invite'; end if;
  select * into acc from public.client_accounts
  where token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and revoked_at is null and expires_at > now() and email = user_email
  for update;
  if not found then raise exception 'invalid_invite'; end if;
  update public.client_accounts set user_id = (select auth.uid()), accepted_at = now(), token_hash = null,
    display_name = left(coalesce(nullif(trim(p_display_name), ''), display_name), 120)
  where id = acc.id;
  return jsonb_build_object('workspaceId', acc.workspace_id, 'clientId', acc.client_id);
end
$$;

create function public.get_my_client_portals()
returns table (workspace_id uuid, client_id text, brand text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.workspace_id, a.client_id, c.brand
  from public.client_accounts a
  join public.clients c on c.workspace_id = a.workspace_id and c.id = a.client_id
  where a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
  order by c.brand
$$;

-- The newest live client page (whole-client share preferred) for a client this account belongs to.
create function public.my_client_share_id(p_workspace_id uuid, p_client_id text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.client_shares s
  where s.workspace_id = p_workspace_id and s.client_id = p_client_id
    and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())
    and exists (
      select 1 from public.client_accounts a
      where a.workspace_id = p_workspace_id and a.client_id = p_client_id
        and a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
    )
  order by (s.project_id is null) desc, s.published_at desc
  limit 1
$$;

create function public.get_my_client_share(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.client_shares%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into s from public.client_shares where id = public.my_client_share_id(p_workspace_id, p_client_id);
  if not found then return null; end if;
  return jsonb_build_object(
    'enabled', true,
    'snapshot', jsonb_build_object(
      'v', s.snapshot->'v', 'brand', s.snapshot->'brand', 'contact', s.snapshot->'contact',
      'company', s.snapshot->'company', 'lang', s.snapshot->'lang', 'title', s.snapshot->'title',
      'sections', s.snapshot->'sections', 'projects', s.snapshot->'projects',
      'invoices', s.snapshot->'invoices', 'boards', s.snapshot->'boards'
    ),
    'publishedAt', s.published_at
  );
end
$$;

create function public.submit_my_client_feedback(
  p_workspace_id uuid, p_client_id text, p_kind text, p_target text, p_text text, p_project_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.client_shares%rowtype;
  f_id uuid;
  feedback_project text;
  who_name text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('comment', 'approve', 'changes')
     or p_target is null or length(p_target) not between 1 and 256
     or p_text is null or length(p_text) > 4000 then
    raise exception 'invalid_feedback';
  end if;
  select * into s from public.client_shares where id = public.my_client_share_id(p_workspace_id, p_client_id);
  if not found or p_target = 'other' or not (s.feedback_targets ? p_target)
     or not coalesce(s.feedback_targets->p_target, '[]'::jsonb) @> jsonb_build_array(p_kind) then
    raise exception 'invalid_share_or_target';
  end if;
  feedback_project := coalesce(nullif(p_project_id, ''), s.project_id);
  if feedback_project is not null and (
    (s.project_id is not null and feedback_project <> s.project_id)
    or not exists (
      select 1 from jsonb_array_elements(coalesce(s.snapshot->'projects', '[]'::jsonb)) as projects(project)
      where project->>'id' = feedback_project
    )
  ) then raise exception 'invalid_feedback_project'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(s.id::text, 0));
  if (
    select count(*) from public.client_feedback f
    where f.share_id = s.id and f.created_at > now() - interval '1 hour'
  ) >= 30 then raise exception 'feedback_rate_limited'; end if;
  select left(coalesce(nullif(a.display_name, ''), a.email), 120) into who_name
  from public.client_accounts a
  where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.user_id = (select auth.uid())
  limit 1;
  insert into public.client_feedback(workspace_id, share_id, client_id, project_id, kind, target, text, who)
  values (s.workspace_id, s.id, s.client_id, feedback_project, p_kind, p_target, p_text, coalesce(who_name, 'Client'))
  returning id into f_id;
  return f_id;
end
$$;

revoke all on function public.invite_client_account(uuid, text, text), public.list_client_accounts(uuid, text),
  public.revoke_client_account(uuid, uuid), public.accept_client_invite(text, text),
  public.get_my_client_portals(), public.my_client_share_id(uuid, text),
  public.get_my_client_share(uuid, text),
  public.submit_my_client_feedback(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.invite_client_account(uuid, text, text), public.list_client_accounts(uuid, text),
  public.revoke_client_account(uuid, uuid), public.accept_client_invite(text, text),
  public.get_my_client_portals(), public.get_my_client_share(uuid, text),
  public.submit_my_client_feedback(uuid, text, text, text, text, text)
  to authenticated;
