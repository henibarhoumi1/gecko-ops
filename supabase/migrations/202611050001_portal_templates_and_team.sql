-- Portal v2, phase A.
-- 1. Templates: each client's portal is either Performance (ads that sell a product: reels, hooks, calls to action)
--    or Cinematic (image work: films, stills, treatments). The template changes the words on every screen.
-- 2. A cover still for the top of a Cinematic portal, stored like the logo: a small image on the overview row.
-- 3. The client's own team: every client login has a role (owner, approver, finance, viewer). Owners invite and
--    remove their own people; only owners and approvers can approve or ask for changes.

-- ---------- templates and cover ----------

alter table public.client_portals
  add column template text not null default 'performance' check (template in ('performance', 'cinematic')),
  add column cover text check (
    cover is null
    or (length(cover) <= 700000 and cover ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$')
  );

-- ---------- roles ----------

alter table public.client_accounts
  add column role text not null default 'owner' check (role in ('owner', 'approver', 'finance', 'viewer'));

-- Accounts that can still sign in (or are invited and haven't been removed), for the 5-person limit.
create function public.client_team_size(p_workspace_id uuid, p_client_id text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.client_accounts
  where workspace_id = p_workspace_id and client_id = p_client_id and revoked_at is null
    and (user_id is not null or expires_at > now())
$$;

-- Team side: invite a client email with a role. The first person on a portal is its owner unless a role is given.
drop function public.invite_client_account(uuid, text, text);
create function public.invite_client_account(
  p_workspace_id uuid, p_client_id text, p_email text, p_role text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text;
  new_role text;
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  if p_email is null or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or (p_role is not null and p_role not in ('owner', 'approver', 'finance', 'viewer')) then
    raise exception 'invalid_invite';
  end if;
  new_role := coalesce(p_role, case when exists (
    select 1 from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.role = 'owner'
      and a.revoked_at is null and lower(a.email) <> lower(trim(p_email))
  ) then 'approver' else 'owner' end);
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.client_accounts(workspace_id, client_id, email, token_hash, expires_at, invited_by, role)
  values (p_workspace_id, p_client_id, lower(trim(p_email)),
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), now() + interval '14 days', (select auth.uid()),
    new_role)
  on conflict (workspace_id, client_id, email) do update set
    token_hash = excluded.token_hash, expires_at = excluded.expires_at,
    revoked_at = null, invited_by = excluded.invited_by,
    role = coalesce(p_role, public.client_accounts.role),
    accepted_at = case when public.client_accounts.user_id is null then null else public.client_accounts.accepted_at end;
  return raw_token;
end
$$;

create or replace function public.list_client_accounts(p_workspace_id uuid, p_client_id text)
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
      'expires', a.expires_at, 'revoked', a.revoked_at is not null, 'createdAt', a.created_at,
      'role', a.role)
    from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id
    order by a.created_at;
end
$$;

-- Team side: change someone's role.
create function public.set_client_account_role(p_workspace_id uuid, p_account_id uuid, p_role text)
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
  if p_role is null or p_role not in ('owner', 'approver', 'finance', 'viewer') then raise exception 'invalid_role'; end if;
  update public.client_accounts set role = p_role where workspace_id = p_workspace_id and id = p_account_id;
end
$$;

-- ---------- the client's own team ----------

-- Everyone on the portal sees who else is on it; only owners see emails and pending invites' links status.
create function public.get_my_team(p_workspace_id uuid, p_client_id text)
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
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'name', left(coalesce(nullif(trim(a.display_name), ''), split_part(a.email, '@', 1)), 120),
      'email', case when acc.role = 'owner' or a.id = acc.id then a.email else null end,
      'role', a.role,
      'joined', a.user_id is not null and a.accepted_at is not null,
      'expires', case when acc.role = 'owner' then a.expires_at else null end,
      'me', a.id = acc.id
    ) order by a.user_id is null, a.created_at)
    from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.revoked_at is null
      and (a.user_id is not null or a.expires_at > now())
  ), '[]'::jsonb);
end
$$;

-- An owner invites someone from their side. Returns the one-time code for the link they send on.
create function public.client_invite_teammate(p_workspace_id uuid, p_client_id text, p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  raw_token text;
  email_in text := lower(trim(coalesce(p_email, '')));
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null or acc.role <> 'owner' then raise exception 'owner_only'; end if;
  if email_in !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_role is null or p_role not in ('owner', 'approver', 'finance', 'viewer') then
    raise exception 'invalid_invite';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.team.' || p_client_id, 0));
  if exists (
    select 1 from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.email = email_in
      and a.revoked_at is null and a.user_id is not null
  ) then raise exception 'already_on_team'; end if;
  if public.client_team_size(p_workspace_id, p_client_id) >= 5 and not exists (
    select 1 from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.email = email_in
      and a.revoked_at is null and a.expires_at > now()
  ) then raise exception 'team_full'; end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.client_accounts(workspace_id, client_id, email, token_hash, expires_at, invited_by, role)
  values (p_workspace_id, p_client_id, email_in,
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), now() + interval '14 days', (select auth.uid()), p_role)
  on conflict (workspace_id, client_id, email) do update set
    token_hash = excluded.token_hash, expires_at = excluded.expires_at, revoked_at = null,
    invited_by = excluded.invited_by, role = excluded.role,
    accepted_at = case when public.client_accounts.user_id is null then null else public.client_accounts.accepted_at end;
  return raw_token;
end
$$;

-- An owner changes someone's role. The portal always keeps at least one owner.
create function public.client_set_teammate_role(p_workspace_id uuid, p_client_id text, p_account_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  target public.client_accounts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null or acc.role <> 'owner' then raise exception 'owner_only'; end if;
  if p_role is null or p_role not in ('owner', 'approver', 'finance', 'viewer') then raise exception 'invalid_role'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.team.' || p_client_id, 0));
  select * into target from public.client_accounts
  where id = p_account_id and workspace_id = p_workspace_id and client_id = p_client_id and revoked_at is null
  for update;
  if not found then raise exception 'member_not_found'; end if;
  if target.role = 'owner' and p_role <> 'owner' and (
    select count(*) from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.role = 'owner'
      and a.revoked_at is null and a.user_id is not null and a.id <> target.id
  ) = 0 then raise exception 'last_owner'; end if;
  update public.client_accounts set role = p_role where id = target.id;
end
$$;

-- An owner removes someone (or cancels an invite). Nobody removes themselves here; Gecko can.
create function public.client_remove_teammate(p_workspace_id uuid, p_client_id text, p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null or acc.role <> 'owner' then raise exception 'owner_only'; end if;
  if p_account_id = acc.id then raise exception 'cannot_remove_self'; end if;
  update public.client_accounts set revoked_at = now(), token_hash = null
  where id = p_account_id and workspace_id = p_workspace_id and client_id = p_client_id and revoked_at is null;
  if not found then raise exception 'member_not_found'; end if;
end
$$;

-- Only owners and approvers can approve or ask for changes, on ideas, scripts and cuts alike.
-- Checked on the notes tables themselves, so every path that records a decision is covered. Named to run after the
-- existing *_notes_guard triggers, which settle whether a note comes from the client.
create function public.client_decision_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.from_client and new.kind in ('approve', 'changes') and not exists (
    select 1 from public.client_accounts a
    where a.workspace_id = new.workspace_id and a.client_id = new.client_id and a.user_id = new.author_user
      and a.revoked_at is null and a.role in ('owner', 'approver')
  ) then
    raise exception 'approver_only';
  end if;
  return new;
end
$$;

create trigger concept_notes_role_guard before insert on public.concept_notes
  for each row execute function public.client_decision_guard();
create trigger script_notes_role_guard before insert on public.script_notes
  for each row execute function public.client_decision_guard();
-- Videos may not be set up on every database yet (they are switched off live).
do $$
begin
  if to_regclass('public.video_notes') is not null then
    create trigger video_notes_role_guard before insert on public.video_notes
      for each row execute function public.client_decision_guard();
  end if;
end
$$;

-- ---------- the portal read ----------

create or replace function public.get_my_portal(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  p public.client_portals%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  select * into p from public.client_portals where workspace_id = p_workspace_id and client_id = p_client_id;
  return jsonb_build_object(
    'brand', (select c.brand from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id),
    'me', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120),
    'role', acc.role,
    'logo', p.logo,
    'template', coalesce(p.template, 'performance'),
    'cover', p.cover,
    -- A row that only holds a logo, cover or template is not a campaign plan yet.
    'overview', case when p.client_id is null or (
        p.campaign = '' and p.summary = '' and cardinality(p.included) = 0 and p.shoot_date is null
        and p.price is null and p.milestones = '[]'::jsonb and p.reels is null and p.next_step = ''
      ) then null else jsonb_build_object(
      'campaign', p.campaign, 'summary', p.summary, 'included', to_jsonb(p.included),
      'shootDate', p.shoot_date, 'shootPlace', p.shoot_place, 'nextStep', p.next_step,
      'milestones', p.milestones,
      -- Money is for owners and finance only.
      'price', case when acc.role in ('owner', 'finance') then p.price else null end,
      'depositStatus', p.deposit_status, 'balanceStatus', p.balance_status, 'updatedAt', p.updated_at,
      'plan', p.plan, 'reels', p.reels
    ) end,
    'concepts', coalesce((
      select jsonb_agg(public.concept_to_json(c) order by c.position, c.created_at)
      from public.concepts c
      where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.status <> 'draft'
    ), '[]'::jsonb),
    'scripts', coalesce((
      select jsonb_agg(public.script_to_json(s) order by s.position, s.created_at)
      from public.scripts s
      where s.workspace_id = p_workspace_id and s.client_id = p_client_id and s.status <> 'draft'
    ), '[]'::jsonb)
  );
end
$$;

revoke all on function public.client_team_size(uuid, text), public.client_decision_guard(),
  public.invite_client_account(uuid, text, text, text), public.set_client_account_role(uuid, uuid, text),
  public.get_my_team(uuid, text), public.client_invite_teammate(uuid, text, text, text),
  public.client_set_teammate_role(uuid, text, uuid, text), public.client_remove_teammate(uuid, text, uuid)
  from public, anon;
grant execute on function public.invite_client_account(uuid, text, text, text),
  public.set_client_account_role(uuid, uuid, text), public.get_my_team(uuid, text),
  public.client_invite_teammate(uuid, text, text, text), public.client_set_teammate_role(uuid, text, uuid, text),
  public.client_remove_teammate(uuid, text, uuid) to authenticated;
revoke all on function public.get_my_portal(uuid, text) from public, anon;
grant execute on function public.get_my_portal(uuid, text) to authenticated;
