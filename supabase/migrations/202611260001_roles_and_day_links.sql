-- Team roles and day links (Gecko World V1, phases 2c and 1).
--
-- 1. Every team member gets a title: main editor, project manager, DOP… on top of one of the four levels the
--    rules already know (founder, producer = 'sales', editor, production = 'assistant'). The title is what
--    people read; the level is what the database checks.
-- 2. Day links: a private link to one shoot day for crew without an account (a freelance DOP, an assistant
--    for the day). They read the day, use the line reader and tick reels; nothing else, and only until two
--    days after the shoot.

-- ---------- 1. titles ----------

alter table public.workspace_members add column title text not null default '' check (length(title) <= 60);
alter table public.workspace_invites add column title text not null default '' check (length(title) <= 60);

-- A member who joins through an invite takes the invite's title.
create function public.member_title_from_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.title, '') = '' then
    new.title := coalesce((select i.title from public.workspace_invites i
                           where i.workspace_id = new.workspace_id and i.email = lower(new.email)), '');
  end if;
  return new;
end
$$;

revoke all on function public.member_title_from_invite() from public, anon, authenticated;
create trigger workspace_members_title before insert on public.workspace_members
  for each row execute function public.member_title_from_invite();

-- The founder invites with a title.
create function public.invite_workspace_member(p_workspace_id uuid, p_email text, p_role text, p_title text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text := public.invite_workspace_member(p_workspace_id, p_email, p_role);
begin
  if length(coalesce(p_title, '')) > 60 then raise exception 'invalid_invite'; end if;
  update public.workspace_invites set title = trim(coalesce(p_title, ''))
  where workspace_id = p_workspace_id and email = lower(trim(p_email));
  return raw_token;
end
$$;

-- The founder changes someone's title or level. The founder's own row never changes here.
create function public.set_member_role(p_workspace_id uuid, p_member_id text, p_role text, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  if p_role is null or p_role not in ('sales', 'editor', 'assistant') or length(coalesce(p_title, '')) > 60 then
    raise exception 'invalid_role';
  end if;
  update public.workspace_members set role = p_role, title = trim(coalesce(p_title, ''))
  where workspace_id = p_workspace_id and member_id = p_member_id and role <> 'founder' and active;
  if not found then raise exception 'member_not_found'; end if;
end
$$;

-- The team list with titles, for everyone on the team.
create function public.get_members(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if not public.is_workspace_member(p_workspace_id) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.member_id, 'name', m.display_name, 'role', m.role, 'title', m.title,
      'userId', case when m.user_id = (select auth.uid()) then m.user_id::text else null end
    ) order by m.display_name)
    from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.active
  ), '[]'::jsonb);
end
$$;

revoke all on function public.invite_workspace_member(uuid, text, text, text),
  public.set_member_role(uuid, text, text, text), public.get_members(uuid) from public, anon;
grant execute on function public.invite_workspace_member(uuid, text, text, text),
  public.set_member_role(uuid, text, text, text), public.get_members(uuid) to authenticated;

-- ---------- 2. day links ----------

create table public.shoot_day_links (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.shoot_days(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  -- Who the link is for, shown on their ticks: "Ali, DOP".
  label text not null check (length(trim(label)) between 1 and 80),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create index shoot_day_links_day on public.shoot_day_links(day_id);
alter table public.shoot_day_links enable row level security;
revoke all on public.shoot_day_links from public, anon, authenticated;

-- A link for one person, valid until the end of the second day after the shoot. Founder and producers.
create function public.create_shoot_link(p_workspace_id uuid, p_client_id text, p_day_id uuid, p_label text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text;
  v_day date;
begin
  perform public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  select d.day into v_day from public.shoot_days d
  where d.id = p_day_id and d.workspace_id = p_workspace_id and d.client_id = p_client_id and d.removed_at is null;
  if v_day is null then raise exception 'shoot_day_not_found'; end if;
  if length(trim(coalesce(p_label, ''))) not between 1 and 80 then raise exception 'invalid_link'; end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.shoot_day_links(day_id, workspace_id, client_id, label, token_hash, expires_at, created_by)
  values (p_day_id, p_workspace_id, p_client_id, trim(p_label),
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    -- Midnight in Tunis after the second day following the shoot.
    ((v_day + 3)::timestamp at time zone 'Africa/Tunis'), (select auth.uid()));
  return raw_token;
end
$$;

create function public.get_shoot_links(p_workspace_id uuid, p_client_id text, p_day_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', l.id, 'label', l.label, 'expiresAt', l.expires_at,
      'createdAt', l.created_at) order by l.created_at)
    from public.shoot_day_links l
    where l.day_id = p_day_id and l.workspace_id = p_workspace_id and l.client_id = p_client_id
      and l.revoked_at is null and l.expires_at > now()
  ), '[]'::jsonb);
end
$$;

create function public.revoke_shoot_link(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  update public.shoot_day_links set revoked_at = now()
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and revoked_at is null;
  if not found then raise exception 'link_not_found'; end if;
end
$$;

-- The link behind a token, while it is valid.
create function public.shoot_link_for(p_token text)
returns public.shoot_day_links
language sql
stable
set search_path = ''
as $$
  select l.* from public.shoot_day_links l
  join public.shoot_days d on d.id = l.day_id and d.removed_at is null
  where p_token ~ '^[0-9a-f]{64}$'
    and l.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and l.revoked_at is null and l.expires_at > now()
$$;

revoke all on function public.shoot_link_for(text) from public, anon, authenticated;

-- What the crew sees through the link: the day with the client's rules (no private notes, no phone numbers,
-- no money), plus the lines of every script on it, since they shoot them.
create function public.get_shoot_day_by_link(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.shoot_day_links := public.shoot_link_for(p_token);
  d public.shoot_days;
begin
  if l.id is null then raise exception 'link_expired'; end if;
  select * into d from public.shoot_days where id = l.day_id;
  return jsonb_build_object(
    'brand', (select c.brand from public.clients c where c.workspace_id = l.workspace_id and c.id = l.client_id),
    'who', l.label,
    'expiresAt', l.expires_at,
    'day', public.shoot_day_to_json(d, false) || jsonb_build_object('reels', coalesce((
      select jsonb_agg(public.shoot_reel_to_json(r, s, true) - 'extraProps' order by r.position, r.created_at)
      from public.shoot_day_reels r join public.scripts s on s.id = r.script_id
      where r.day_id = d.id and r.removed_at is null
    ), '[]'::jsonb))
  );
end
$$;

-- The crew ticks reels, writes notes for the edit, marks lines read: the same changes as update_shoot_reel.
create function public.update_shoot_reel_by_link(p_token text, p_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.shoot_day_links := public.shoot_link_for(p_token);
begin
  if l.id is null then raise exception 'link_expired'; end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object'
     or (p_changes ? 'linesDone' and jsonb_typeof(p_changes->'linesDone') <> 'array') then
    raise exception 'invalid_reel';
  end if;
  begin
    update public.shoot_day_reels r set
      status = coalesce(p_changes->>'status', r.status),
      note = case when p_changes ? 'note' then trim(coalesce(p_changes->>'note', '')) else r.note end,
      lines_done = case when p_changes ? 'linesDone'
        then array(select distinct x from jsonb_array_elements_text(p_changes->'linesDone') x order by x)
        else r.lines_done end,
      line_changes = case when p_changes ? 'lineChanges' then p_changes->'lineChanges' else r.line_changes end,
      updated_by_name = left(l.label, 120), updated_at = now()
    where r.id = p_id and r.day_id = l.day_id and r.removed_at is null;
    if not found then raise exception 'reel_not_found'; end if;
  exception when check_violation or not_null_violation or invalid_text_representation
    or invalid_parameter_value then
    raise exception 'invalid_reel';
  end;
end
$$;

revoke all on function public.create_shoot_link(uuid, text, uuid, text), public.get_shoot_links(uuid, text, uuid),
  public.revoke_shoot_link(uuid, text, uuid) from public, anon;
grant execute on function public.create_shoot_link(uuid, text, uuid, text), public.get_shoot_links(uuid, text, uuid),
  public.revoke_shoot_link(uuid, text, uuid) to authenticated;
-- The two link functions are the only ones open without an account; both check the token first.
revoke all on function public.get_shoot_day_by_link(text), public.update_shoot_reel_by_link(text, uuid, jsonb)
  from public;
grant execute on function public.get_shoot_day_by_link(text), public.update_shoot_reel_by_link(text, uuid, jsonb)
  to anon, authenticated;
