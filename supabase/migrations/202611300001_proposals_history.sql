-- Proposals and history (Gecko World V1, phases 6 and 5).
--
-- Proposals: from a lead, the team writes a proposal (the plan, the price, what's included, the timeline)
-- and sends a link. The brand opens it without an account, and accepts it with their name; the lead moves
-- to Accepted and its log says so. Links are long random tokens, kept only as a hash (like crew day links),
-- and stop working after their date. Only the founder and sales see and write proposals.
--
-- History: one feed per client of who did what (ideas and scripts added and approved, cuts approved and
-- delivered, posts that went live, tasks done, monthly reads published, things removed). Read from the
-- tables that already exist, so nothing new is stored. The client sees their side of it: no team drafts,
-- no private tasks, no trash.

-- ---------- proposals ----------

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  lead_id text not null,
  -- What the brand reads: {lang, intro, goals[], plan, price, reels, included[], timeline[], terms}.
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object' and length(content::text) <= 20000),
  token_hash bytea unique check (octet_length(token_hash) = 32),
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  views integer not null default 0 check (views >= 0),
  accepted_at timestamptz,
  accepted_name text check (length(accepted_name) <= 120),
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  check ((accepted_at is null) = (accepted_name is null))
);

create index proposals_lead on public.proposals(workspace_id, lead_id, created_at desc);

create trigger proposals_to_trash before delete on public.proposals
  for each row execute function public.to_trash();

alter table public.proposals enable row level security;
revoke all on public.proposals from public, anon, authenticated;

create function public.proposal_seller(p_workspace_id uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then
    raise exception 'forbidden';
  end if;
  return coalesce(public.my_member_name(p_workspace_id), 'Gecko');
end
$$;

create function public.proposal_to_json(p public.proposals)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'leadId', p.lead_id, 'content', p.content, 'hasLink', p.token_hash is not null,
    'expiresAt', p.expires_at, 'sentAt', p.sent_at, 'viewedAt', p.viewed_at, 'views', p.views,
    'acceptedAt', p.accepted_at, 'acceptedName', p.accepted_name, 'author', p.author_name,
    'createdAt', p.created_at, 'updatedAt', p.updated_at)
$$;

create function public.get_lead_proposals(p_workspace_id uuid, p_lead_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.proposal_seller(p_workspace_id);
  return coalesce((
    select jsonb_agg(public.proposal_to_json(p) order by p.created_at desc)
    from public.proposals p where p.workspace_id = p_workspace_id and p.lead_id = p_lead_id
  ), '[]'::jsonb);
end
$$;

-- A new proposal (no id) or changes to one. An accepted proposal no longer changes.
create function public.save_proposal(p_workspace_id uuid, p_lead_id text, p_id uuid, p_content jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.proposal_seller(p_workspace_id);
  v_id uuid;
begin
  if not exists (select 1 from public.leads l where l.workspace_id = p_workspace_id and l.id = p_lead_id) then
    raise exception 'lead_not_found';
  end if;
  begin
    if p_id is null then
      insert into public.proposals(workspace_id, lead_id, content, created_by, author_name)
      values (p_workspace_id, p_lead_id, coalesce(p_content, '{}'::jsonb), (select auth.uid()), who)
      returning id into v_id;
    else
      update public.proposals set content = coalesce(p_content, '{}'::jsonb), updated_at = now()
      where id = p_id and workspace_id = p_workspace_id and lead_id = p_lead_id and accepted_at is null
      returning id into v_id;
      if v_id is null then raise exception 'proposal_not_found'; end if;
    end if;
  exception when check_violation then
    raise exception 'invalid_proposal';
  end;
  return v_id;
end
$$;

-- A new link for the brand (an old one stops working). Returns the token once; only its hash is kept.
-- The lead moves to Proposal sent if it was earlier in the pipeline.
create function public.create_proposal_link(p_workspace_id uuid, p_id uuid, p_days integer default 30)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.proposal_seller(p_workspace_id);
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  p public.proposals;
begin
  if p_days is null or p_days not between 1 and 90 then raise exception 'invalid_proposal'; end if;
  update public.proposals set
    token_hash = extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    expires_at = now() + make_interval(days => p_days),
    sent_at = coalesce(sent_at, now()),
    updated_at = now()
  where id = p_id and workspace_id = p_workspace_id and accepted_at is null
  returning * into p;
  if p.id is null then raise exception 'proposal_not_found'; end if;
  update public.leads set
    stage = 'proposal_sent',
    log = log || jsonb_build_array(jsonb_build_object('at', now(), 'who', who, 'moment', 'proposal', 'channel', 'link', 'text', 'Proposal sent')),
    updated_at = now()
  where workspace_id = p_workspace_id and id = p.lead_id
    and stage in ('prospect', 'contacted', 'conversation', 'meeting_booked', 'qualified', 'nurture');
  return raw_token;
end
$$;

-- Removes a proposal (into the trash).
create function public.remove_proposal(p_workspace_id uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.proposal_seller(p_workspace_id);
  delete from public.proposals where id = p_id and workspace_id = p_workspace_id;
  if not found then raise exception 'proposal_not_found'; end if;
end
$$;

-- The proposal a link opens, if the link is still good.
create function public.proposal_for(p_token text)
returns public.proposals
language sql
stable
set search_path = ''
as $$
  select p.* from public.proposals p
  where length(coalesce(p_token, '')) = 64
    and p.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and p.expires_at > now()
$$;

-- For the brand, without an account. Counts the visit.
create function public.get_proposal_by_link(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  p public.proposals := public.proposal_for(p_token);
begin
  if p.id is null then raise exception 'link_expired'; end if;
  if current_setting('transaction_read_only', true) <> 'on' and p.accepted_at is null then
    update public.proposals set views = views + 1, viewed_at = coalesce(viewed_at, now()) where id = p.id;
  end if;
  return jsonb_build_object(
    'brand', (select l.brand from public.leads l where l.workspace_id = p.workspace_id and l.id = p.lead_id),
    'from', p.author_name,
    'content', p.content,
    'expiresAt', p.expires_at,
    'acceptedAt', p.accepted_at,
    'acceptedName', p.accepted_name);
end
$$;

-- The brand says yes. The lead moves to Accepted and its log says who accepted.
create function public.accept_proposal_by_link(p_token text, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals := public.proposal_for(p_token);
  v_name text := left(trim(coalesce(p_name, '')), 120);
begin
  if p.id is null then raise exception 'link_expired'; end if;
  if length(v_name) < 2 then raise exception 'name_required'; end if;
  if p.accepted_at is not null then return; end if;
  update public.proposals set accepted_at = now(), accepted_name = v_name, updated_at = now() where id = p.id;
  update public.leads set
    stage = case when stage in ('signed', 'won') then stage else 'accepted' end,
    log = log || jsonb_build_array(jsonb_build_object('at', now(), 'who', v_name, 'text', 'Accepted the proposal')),
    updated_at = now()
  where workspace_id = p.workspace_id and id = p.lead_id;
end
$$;

-- ---------- history ----------

create function public.get_client_history(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  team boolean := (public.task_actor(p_workspace_id, p_client_id, 'read')->>'team')::boolean;
  since timestamptz := now() - interval '120 days';
begin
  return coalesce((
    select jsonb_agg(to_jsonb(h) order by h.at desc)
    from (
      select * from (
        select c.created_at as at, c.author_name as who, c.from_client as client, 'idea_added' as kind,
               c.title, '/concepts#idea-' || c.id as link
        from public.concepts c
        where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.created_at > since
          and (team or c.status <> 'draft' or c.from_client)
        union all
        select c.approved_at, c.approved_by, null, 'idea_approved', c.title, '/concepts#idea-' || c.id
        from public.concepts c
        where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.approved_at > since
        union all
        select s.created_at, s.author_name, s.written_by = 'client', 'script_added', s.title, '/scripts#script-' || s.id
        from public.scripts s
        where s.workspace_id = p_workspace_id and s.client_id = p_client_id and s.created_at > since
          and (team or s.status <> 'draft' or s.written_by = 'client')
        union all
        select s.approved_at, s.approved_by, null, 'script_approved', s.title, '/scripts#script-' || s.id
        from public.scripts s
        where s.workspace_id = p_workspace_id and s.client_id = p_client_id and s.approved_at > since
        union all
        select c.approved_at, c.approved_by, null, 'cut_approved', c.title, '/cuts'
        from public.cuts c
        where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.approved_at > since
        union all
        select c.delivered_at, 'Gecko', false, 'cut_delivered', c.title, '/cuts'
        from public.cuts c
        where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.delivered_at > since
        union all
        select p.created_at, p.author_name, p.from_client, 'post_live', p.title, '/results/' || p.id
        from public.posts p
        where p.workspace_id = p_workspace_id and p.client_id = p_client_id and p.created_at > since
        union all
        select t.done_at, t.done_by_name, null, 'task_done', t.title, '/tasks'
        from public.tasks t
        where t.workspace_id = p_workspace_id and t.client_id = p_client_id and t.done_at > since
          and (team or not t.private)
        union all
        select r.published_at, r.author_name, false, 'read_published', to_char(r.month, 'YYYY-MM'), '/results'
        from public.monthly_reads r
        where r.workspace_id = p_workspace_id and r.client_id = p_client_id and r.published_at > since
        union all
        select x.deleted_at, x.deleted_by_name, null, 'removed', x.label, '/trash'
        from public.trash x
        where team and x.workspace_id = p_workspace_id and x.client_id = p_client_id and x.top
          and x.deleted_at > since
      ) all_events
      where at is not null
      order by at desc
      limit 150
    ) h
  ), '[]'::jsonb);
end
$$;

-- ---------- View as client reads the history too ----------

create or replace function public.team_preview(p_workspace_id uuid, p_client_id text, p_role text, p_read text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id)
     or not exists (select 1 from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id) then
    raise exception 'forbidden';
  end if;
  if p_role is null or p_role not in ('owner', 'approver', 'finance', 'viewer') then
    raise exception 'invalid_role';
  end if;
  if p_read is null or p_read not in ('portal', 'team', 'production', 'cuts', 'invoices', 'shoot', 'tasks', 'history') then
    raise exception 'invalid_read';
  end if;
  -- Nothing can be written from here to the end of this transaction.
  perform pg_catalog.set_config('transaction_read_only', 'on', true);
  perform pg_catalog.set_config('gecko.preview', p_workspace_id::text || '|' || p_client_id || '|' || p_role, true);
  result := case p_read
    when 'portal' then public.get_my_portal(p_workspace_id, p_client_id)
    when 'team' then public.get_my_team(p_workspace_id, p_client_id)
    when 'production' then public.get_my_production(p_workspace_id, p_client_id)
    when 'cuts' then public.get_my_cuts(p_workspace_id, p_client_id)
    when 'invoices' then public.get_my_invoices(p_workspace_id, p_client_id)
    when 'shoot' then public.get_shoot_days(p_workspace_id, p_client_id)
    when 'tasks' then public.get_tasks(p_workspace_id, p_client_id)
    when 'history' then public.get_client_history(p_workspace_id, p_client_id)
  end;
  perform pg_catalog.set_config('gecko.preview', '', true);
  return result;
end
$$;

-- ---------- grants ----------

revoke all on function public.proposal_seller(uuid), public.proposal_to_json(public.proposals),
  public.proposal_for(text) from public, anon, authenticated;
revoke all on function public.get_lead_proposals(uuid, text), public.save_proposal(uuid, text, uuid, jsonb),
  public.create_proposal_link(uuid, uuid, integer), public.remove_proposal(uuid, uuid),
  public.get_client_history(uuid, text) from public, anon;
grant execute on function public.get_lead_proposals(uuid, text), public.save_proposal(uuid, text, uuid, jsonb),
  public.create_proposal_link(uuid, uuid, integer), public.remove_proposal(uuid, uuid),
  public.get_client_history(uuid, text) to authenticated;
revoke all on function public.get_proposal_by_link(text), public.accept_proposal_by_link(text, text) from public;
grant execute on function public.get_proposal_by_link(text), public.accept_proposal_by_link(text, text)
  to anon, authenticated;
