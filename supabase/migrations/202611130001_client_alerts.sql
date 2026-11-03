-- Alerts: so Heni hears when something goes wrong for a client, and sees what clients did, without
-- waiting for a client to tell him.
--
-- 1. client_errors: when a screen crashes or a request fails unexpectedly, the browser reports it with
--    report_client_error. Only the error text, the page path and which client: no form contents, no
--    passwords. Nobody reads or writes the table directly; it is reached only through the functions below.
-- 2. get_client_alerts: for the founder and producers, the recent errors plus what clients approved,
--    asked to change or commented on, built from the existing note tables (nothing new is recorded).
-- 3. mark_client_errors_seen: the founder or a producer clears the list once read.
-- The hourly client-health workflow reads only counts from client_errors, never the text.

create table public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  from_client boolean not null default false,
  workspace_id uuid,
  client_id text,
  area text not null check (area in ('crash', 'request', 'unexpected')),
  message text not null check (length(message) <= 500),
  path text not null default '' check (length(path) <= 300),
  seen_at timestamptz
);
create index client_errors_recent on public.client_errors(workspace_id, created_at desc);
create index client_errors_by_user on public.client_errors(user_id, created_at desc);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

-- Never fails: a broken error report must not cause a second error. Capped at 30 reports per person per
-- hour, so a crash loop can't fill the table. The client is kept only if the caller belongs to it.
create function public.report_client_error(
  p_workspace_id uuid, p_client_id text, p_area text, p_message text, p_path text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  is_client boolean := false;
  ws uuid := null;
  cl text := null;
begin
  if uid is null or coalesce(trim(p_message), '') = '' then return; end if;
  if (select count(*) from public.client_errors e
      where e.user_id = uid and e.created_at > now() - interval '1 hour') >= 30 then
    return;
  end if;

  if p_workspace_id is not null and p_client_id is not null then
    if exists (select 1 from public.client_accounts a
               where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.user_id = uid
                 and a.accepted_at is not null and a.revoked_at is null) then
      ws := p_workspace_id; cl := p_client_id; is_client := true;
    elsif public.has_client_access(p_workspace_id, p_client_id) then
      ws := p_workspace_id; cl := p_client_id;
    end if;
  elsif p_workspace_id is not null and public.is_workspace_member(p_workspace_id) then
    ws := p_workspace_id;
  end if;

  -- A client whose page didn't say which brand: file it under their brand, so the team still sees it.
  if ws is null and not exists (select 1 from public.workspace_members m where m.user_id = uid and m.active) then
    select a.workspace_id, a.client_id into ws, cl
    from public.client_accounts a
    where a.user_id = uid and a.accepted_at is not null and a.revoked_at is null
    order by a.accepted_at desc
    limit 1;
    is_client := ws is not null;
  end if;

  insert into public.client_errors (user_id, from_client, workspace_id, client_id, area, message, path)
  values (uid, is_client, ws, cl,
          case when p_area in ('crash', 'request', 'unexpected') then p_area else 'unexpected' end,
          left(trim(p_message), 500), left(coalesce(p_path, ''), 300));
exception when others then
  return;
end
$$;

create function public.get_client_alerts(p_workspace_id uuid, p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 60));
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'errors', coalesce((
      select jsonb_agg(row_to_json(x) order by x.at desc) from (
        select e.id, e.created_at as at, e.client_id, c.brand, e.from_client, e.area, e.message, e.path,
               e.seen_at is not null as seen
        from public.client_errors e
        left join public.clients c on c.workspace_id = e.workspace_id and c.id = e.client_id
        where e.workspace_id = p_workspace_id and e.created_at > since
        order by e.created_at desc
        limit 200
      ) x), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(row_to_json(y) order by y.at desc) from (
        select * from (
          select n.created_at as at, n.client_id, c.brand, 'concept' as part, n.kind, k.title,
                 n.author_name as author, left(n.body, 240) as body
          from public.concept_notes n
          join public.concepts k on k.id = n.concept_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.workspace_id = p_workspace_id and n.from_client and n.created_at > since
          union all
          select n.created_at, n.client_id, c.brand, 'script', n.kind, s.title, n.author_name, left(n.body, 240)
          from public.script_notes n
          join public.scripts s on s.id = n.script_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.workspace_id = p_workspace_id and n.from_client and n.created_at > since
          union all
          select n.created_at, n.client_id, c.brand, 'cut', n.kind, k.title, n.author_name, left(n.body, 240)
          from public.cut_notes n
          join public.cuts k on k.id = n.cut_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.workspace_id = p_workspace_id and n.from_client and n.created_at > since
          union all
          select n.created_at, n.client_id, c.brand, 'production', n.kind, o.name, n.author_name, left(n.body, 240)
          from public.production_notes n
          join public.production_options o on o.id = n.option_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.workspace_id = p_workspace_id and n.from_client and n.created_at > since
        ) a
        order by a.at desc
        limit 200
      ) y), '[]'::jsonb)
  );
end
$$;

create function public.mark_client_errors_seen(p_workspace_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then
    raise exception 'forbidden';
  end if;
  update public.client_errors set seen_at = now()
  where workspace_id = p_workspace_id and seen_at is null;
end
$$;

revoke all on function public.report_client_error(uuid, text, text, text, text) from public, anon;
revoke all on function public.get_client_alerts(uuid, integer) from public, anon;
revoke all on function public.mark_client_errors_seen(uuid) from public, anon;
grant execute on function public.report_client_error(uuid, text, text, text, text) to authenticated;
grant execute on function public.get_client_alerts(uuid, integer) to authenticated;
grant execute on function public.mark_client_errors_seen(uuid) to authenticated;
