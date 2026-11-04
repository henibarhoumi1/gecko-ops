-- Today and "new since your last visit".
--
-- 1. get_today: the founder's and producers' home. For every client they can see, what is waiting on the team
--    (change requests, unanswered client comments, client ideas, open requests), what is waiting on the client
--    (ideas, scripts, cuts and options sent for approval, invoices sent and unpaid), the dates coming up (shoots,
--    first drafts 7 days after the shoot, unfinished milestones, invoices due, lead follow-ups), new website
--    leads and the number of unread problems. Built from what is already recorded; nothing new is stored.
-- 2. client_portal_visit: called when a client opens their portal. Remembers when they were last there and
--    returns what Gecko did since the visit before: new ideas, scripts, cuts and options to look at, replies,
--    deliveries and, for owners and finance, invoices. Refreshing within 30 minutes keeps the same "since".

alter table public.client_accounts
  add column last_seen_at timestamptz,
  add column seen_before timestamptz;

create function public.get_today(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Africa/Tunis')::date;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'today', v_today,

    -- Waiting on the team.
    'us', coalesce((
      select jsonb_agg(row_to_json(u) order by u.at) from (
        select * from (
          -- The client asked for changes.
          select k.client_id, c.brand, 'concept' as part, k.id::text as id, k.title, 'changes' as why, k.updated_at as at,
                 (select left(n.body, 200) from public.concept_notes n
                  where n.concept_id = k.id and n.from_client and n.kind = 'changes'
                  order by n.created_at desc limit 1) as body
          from public.concepts k join public.clients c on c.workspace_id = k.workspace_id and c.id = k.client_id
          where k.workspace_id = p_workspace_id and k.status = 'changes'
          union all
          select s.client_id, c.brand, 'script', s.id::text, s.title, 'changes', s.updated_at,
                 (select left(n.body, 200) from public.script_notes n
                  where n.script_id = s.id and n.from_client and n.kind = 'changes'
                  order by n.created_at desc limit 1)
          from public.scripts s join public.clients c on c.workspace_id = s.workspace_id and c.id = s.client_id
          where s.workspace_id = p_workspace_id and s.status = 'changes'
          union all
          select k.client_id, c.brand, 'cut', k.id::text, k.title, 'changes', k.updated_at,
                 (select left(n.body, 200) from public.cut_notes n
                  where n.cut_id = k.id and n.from_client and n.kind = 'changes'
                  order by n.created_at desc limit 1)
          from public.cuts k join public.clients c on c.workspace_id = k.workspace_id and c.id = k.client_id
          where k.workspace_id = p_workspace_id and k.status = 'changes'
          union all
          -- The client's last word on something is a comment nobody on the team has answered.
          select n.client_id, c.brand, 'concept', k.id::text, k.title, 'comment', n.created_at, left(n.body, 200)
          from (select distinct on (concept_id) * from public.concept_notes
                where workspace_id = p_workspace_id order by concept_id, created_at desc) n
          join public.concepts k on k.id = n.concept_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.from_client and n.kind = 'comment' and k.status <> 'changes'
          union all
          select n.client_id, c.brand, 'script', s.id::text, s.title, 'comment', n.created_at, left(n.body, 200)
          from (select distinct on (script_id) * from public.script_notes
                where workspace_id = p_workspace_id order by script_id, created_at desc) n
          join public.scripts s on s.id = n.script_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.from_client and n.kind = 'comment' and s.status <> 'changes'
          union all
          select n.client_id, c.brand, 'cut', k.id::text, k.title, 'comment', n.created_at, left(n.body, 200)
          from (select distinct on (cut_id) * from public.cut_notes
                where workspace_id = p_workspace_id order by cut_id, created_at desc) n
          join public.cuts k on k.id = n.cut_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.from_client and n.kind = 'comment' and k.status <> 'changes'
          union all
          select n.client_id, c.brand, 'production', o.id::text, o.name, 'comment', n.created_at, left(n.body, 200)
          from (select distinct on (option_id) * from public.production_notes
                where workspace_id = p_workspace_id order by option_id, created_at desc) n
          join public.production_options o on o.id = n.option_id
          join public.clients c on c.workspace_id = n.workspace_id and c.id = n.client_id
          where n.from_client and n.kind = 'comment'
          union all
          -- Ideas and options the client suggested, and their open requests.
          select k.client_id, c.brand, 'concept', k.id::text, k.title, 'idea', k.created_at, left(k.body, 200)
          from public.concepts k join public.clients c on c.workspace_id = k.workspace_id and c.id = k.client_id
          where k.workspace_id = p_workspace_id and k.status = 'idea'
          union all
          select o.client_id, c.brand, 'production', o.id::text, o.name, 'suggested', o.created_at, left(o.details, 200)
          from public.production_options o join public.clients c on c.workspace_id = o.workspace_id and c.id = o.client_id
          where o.workspace_id = p_workspace_id and o.from_client and o.status = 'suggested'
          union all
          select i.client_id, c.brand, 'request', i.id::text, coalesce(nullif(i.title, ''), left(i.body, 80)), 'request',
                 i.created_at, left(i.body, 200)
          from public.shared_items i join public.clients c on c.workspace_id = i.workspace_id and c.id = i.client_id
          where i.workspace_id = p_workspace_id and i.kind = 'request' and i.status = 'open'
        ) a
        where public.has_client_access(p_workspace_id, a.client_id)
        order by a.at
        limit 100
      ) u), '[]'::jsonb),

    -- Waiting on the client: sent for approval, and since when.
    'client', coalesce((
      select jsonb_agg(row_to_json(w) order by w.at) from (
        select * from (
          select k.client_id, c.brand, 'concept' as part, k.id::text as id, k.title, k.updated_at as at, null::date as due
          from public.concepts k join public.clients c on c.workspace_id = k.workspace_id and c.id = k.client_id
          where k.workspace_id = p_workspace_id and k.status = 'review'
          union all
          select s.client_id, c.brand, 'script', s.id::text, s.title, s.updated_at, null
          from public.scripts s join public.clients c on c.workspace_id = s.workspace_id and c.id = s.client_id
          where s.workspace_id = p_workspace_id and s.status = 'review'
          union all
          select k.client_id, c.brand, 'cut', k.id::text, k.title,
                 coalesce((select max(v.created_at) from public.cut_versions v where v.cut_id = k.id), k.updated_at), null
          from public.cuts k join public.clients c on c.workspace_id = k.workspace_id and c.id = k.client_id
          where k.workspace_id = p_workspace_id and k.status = 'review'
          union all
          select o.client_id, c.brand, 'production', o.id::text, o.name, o.updated_at, null
          from public.production_options o join public.clients c on c.workspace_id = o.workspace_id and c.id = o.client_id
          where o.workspace_id = p_workspace_id and o.status = 'proposed' and not o.from_client
          union all
          select v.client_id, c.brand, 'invoice', v.id::text, coalesce(v.number, '') || ' · ' || v.total::text || ' TND',
                 coalesce(v.sent_at, v.updated_at), v.due_date
          from public.invoices v join public.clients c on c.workspace_id = v.workspace_id and c.id = v.client_id
          where v.workspace_id = p_workspace_id and v.status = 'sent'
        ) a
        where public.has_client_access(p_workspace_id, a.client_id)
        order by a.at
        limit 100
      ) w), '[]'::jsonb),

    -- Dates: from a week back (what slipped) to a month ahead.
    'dates', coalesce((
      select jsonb_agg(row_to_json(d) order by d.date, d.kind) from (
        select * from (
          select p.client_id, c.brand, 'shoot' as kind,
                 'Shoot' || case when p.shoot_place <> '' then ' · ' || p.shoot_place else '' end as label,
                 p.shoot_date as date
          from public.client_portals p join public.clients c on c.workspace_id = p.workspace_id and c.id = p.client_id
          where p.workspace_id = p_workspace_id and p.shoot_date is not null
          union all
          -- The promise on every offer: first drafts 7 days after the shoot.
          select p.client_id, c.brand, 'drafts', 'First drafts due (7 days after the shoot)', p.shoot_date + 7
          from public.client_portals p join public.clients c on c.workspace_id = p.workspace_id and c.id = p.client_id
          where p.workspace_id = p_workspace_id and p.shoot_date is not null
          union all
          select p.client_id, c.brand, 'milestone', left(m->>'label', 120), (m->>'date')::date
          from public.client_portals p
          join public.clients c on c.workspace_id = p.workspace_id and c.id = p.client_id
          cross join lateral jsonb_array_elements(p.milestones) m
          where p.workspace_id = p_workspace_id and coalesce((m->>'done')::boolean, false) = false
            and m->>'date' is not null
            and lower(m->>'label') not in ('shoot day', 'jour du tournage')
          union all
          select v.client_id, c.brand, 'invoice', 'Invoice ' || coalesce(v.number, '') || ' due', v.due_date
          from public.invoices v join public.clients c on c.workspace_id = v.workspace_id and c.id = v.client_id
          where v.workspace_id = p_workspace_id and v.status = 'sent'
        ) a
        where a.date between v_today - 7 and v_today + 30
          and public.has_client_access(p_workspace_id, a.client_id)
        union all
        select null, l.brand, 'lead', coalesce(nullif(l.next_step, ''), 'Follow up'), l.next_date
        from public.leads l
        where l.workspace_id = p_workspace_id and l.next_date is not null
          and l.next_date between v_today - 30 and v_today + 7
          and l.stage not in ('won', 'lost', 'nurture', 'signed')
        order by 5
        limit 60
      ) d), '[]'::jsonb),

    'leads', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'at', l.created_at, 'brand', l.brand,
               'form', l.extra->>'form', 'person', l.extra->>'person') order by l.created_at desc)
      from public.leads l
      where l.workspace_id = p_workspace_id and l.channel = 'Website' and l.stage = 'prospect'
        and l.created_at > now() - interval '14 days'), '[]'::jsonb),

    'problems', (select count(*) from public.client_errors e
                 where e.workspace_id = p_workspace_id and e.seen_at is null)
  );
end
$$;

create function public.client_portal_visit(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_account public.client_accounts%rowtype;
  v_since timestamptz;
  v_money boolean;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select * into v_account from public.client_accounts a
  where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.user_id = v_uid
    and a.accepted_at is not null and a.revoked_at is null
  limit 1;
  if not found then raise exception 'forbidden'; end if;

  if v_account.last_seen_at is null or v_account.last_seen_at < now() - interval '30 minutes' then
    update public.client_accounts
    set seen_before = coalesce(last_seen_at, accepted_at), last_seen_at = now()
    where id = v_account.id
    returning seen_before into v_since;
  else
    update public.client_accounts set last_seen_at = now() where id = v_account.id;
    v_since := coalesce(v_account.seen_before, v_account.accepted_at);
  end if;
  v_money := v_account.role in ('owner', 'finance');

  return jsonb_build_object(
    'since', v_since,
    'ideas', (select count(*) from public.concepts k
              where k.workspace_id = p_workspace_id and k.client_id = p_client_id and not k.from_client
                and k.status = 'review' and k.updated_at > v_since),
    'scripts', (select count(*) from public.scripts s
                where s.workspace_id = p_workspace_id and s.client_id = p_client_id
                  and s.status = 'review' and s.updated_at > v_since),
    'cuts', (select count(distinct v.cut_id) from public.cut_versions v
             join public.cuts k on k.id = v.cut_id
             where v.workspace_id = p_workspace_id and v.client_id = p_client_id
               and k.status = 'review' and v.created_at > v_since),
    'options', (select count(*) from public.production_options o
                where o.workspace_id = p_workspace_id and o.client_id = p_client_id and not o.from_client
                  and o.status = 'proposed' and o.updated_at > v_since),
    'replies', (select count(*) from (
                  select created_at from public.concept_notes
                  where workspace_id = p_workspace_id and client_id = p_client_id and not from_client
                  union all
                  select created_at from public.script_notes
                  where workspace_id = p_workspace_id and client_id = p_client_id and not from_client
                  union all
                  select created_at from public.cut_notes
                  where workspace_id = p_workspace_id and client_id = p_client_id and not from_client
                  union all
                  select created_at from public.production_notes
                  where workspace_id = p_workspace_id and client_id = p_client_id and not from_client
                  union all
                  select answered_at from public.shared_items
                  where workspace_id = p_workspace_id and client_id = p_client_id and kind = 'request'
                    and answered_at is not null
                ) r where r.created_at > v_since),
    'delivered', (select count(*) from public.cuts k
                  where k.workspace_id = p_workspace_id and k.client_id = p_client_id and k.delivered_at > v_since),
    'invoices', case when v_money then (select count(*) from public.invoices v
                  where v.workspace_id = p_workspace_id and v.client_id = p_client_id
                    and v.status in ('sent', 'paid') and v.sent_at > v_since) else 0 end
  );
end
$$;

revoke all on function public.get_today(uuid) from public, anon;
revoke all on function public.client_portal_visit(uuid, text) from public, anon;
grant execute on function public.get_today(uuid) to authenticated;
grant execute on function public.client_portal_visit(uuid, text) to authenticated;
