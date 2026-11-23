-- Gecko's yes is final (Heni, 23 Nov 2026): "if I approve something it's approved, it doesn't wait for the client
-- approval, just notify them."
--
-- 1. production_options.decided_by_studio: the option was approved by Gecko, not by the client.
-- 2. set_studio_approval: the founder approves any production option (talent, location, prop). A waiting option
--    becomes approved at once, budget or not (over_budget still records it). Taking it back returns an option
--    Gecko approved to "proposed"; an option the client approved stays approved.
--    set_talent_studio_approval and get_talent_approvals (23 Nov) stay as they were, for the app that is live
--    while this runs; the new app uses set_studio_approval and get_option_approvals.
-- 3. get_option_approvals: every kind, plus "gecko" when Gecko made the call (the client is told, not asked).
-- 4. client_decide_option: the client can't pass on what Gecko approved (they can still comment).
-- 5. client_portal_visit: "confirmed", the options Gecko approved since the client's last visit, shown in
--    "New since your last visit". Gecko's approval note doesn't also count as a reply.

alter table public.production_options
  add column decided_by_studio boolean not null default false;

-- An option that goes back to "proposed" (its price changed, or Gecko took the yes back) loses Gecko's yes too.
create function public.production_option_clear_studio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'proposed' and old.status is distinct from 'proposed' then
    new.decided_by_studio := false;
    new.studio_approved_by := null;
    new.studio_approved_at := null;
  end if;
  return new;
end
$$;
revoke all on function public.production_option_clear_studio() from public, anon, authenticated;
create trigger production_option_clear_studio before update of status on public.production_options
  for each row execute function public.production_option_clear_studio();

-- ---------- 2. Gecko approves ----------

create function public.set_studio_approval(p_workspace_id uuid, p_client_id text, p_id uuid, p_ok boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
  o public.production_options%rowtype;
  v_cap numeric;
  v_over boolean := false;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'founder_only'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.budget.' || p_client_id, 0));
  select * into o from public.production_options
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'option_not_found'; end if;
  select left(coalesce(nullif(trim(m.display_name), ''), m.email, 'Gecko'), 120) into who
  from public.workspace_members m
  where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid());
  who := coalesce(who, 'Gecko');

  if p_ok then
    if o.status in ('proposed', 'passed') then
      select b.cap into v_cap from public.production_budgets b
      where b.workspace_id = p_workspace_id and b.client_id = p_client_id;
      v_over := o.bought_by = 'gecko' and v_cap is not null
        and public.production_committed(p_workspace_id, p_client_id, o.id) + o.cost > v_cap;
      update public.production_options
      set status = 'approved', over_budget = v_over, decided_by = who, decided_at = now(), decided_by_studio = true,
          studio_approved_by = who, studio_approved_at = now(), updated_at = now()
      where id = o.id;
      insert into public.production_notes(option_id, workspace_id, client_id, kind, body, cost, from_client, author_user, author_name)
      values (o.id, p_workspace_id, p_client_id, 'approve', 'Approved by Gecko.', o.cost, false, (select auth.uid()), who);
    else
      update public.production_options
      set studio_approved_by = who, studio_approved_at = now(), updated_at = now()
      where id = o.id;
    end if;
  else
    update public.production_options
    set studio_approved_by = null, studio_approved_at = null,
        status = case when decided_by_studio and status = 'approved' then 'proposed' else status end,
        decided_by = case when decided_by_studio and status = 'approved' then '' else decided_by end,
        decided_at = case when decided_by_studio and status = 'approved' then null else decided_at end,
        over_budget = case when decided_by_studio and status = 'approved' then false else over_budget end,
        decided_by_studio = case when decided_by_studio and status = 'approved' then false else decided_by_studio end,
        updated_at = now()
    where id = o.id;
  end if;
end
$$;
revoke all on function public.set_studio_approval(uuid, text, uuid, boolean) from public, anon;
grant execute on function public.set_studio_approval(uuid, text, uuid, boolean) to authenticated;


-- ---------- 3. who said yes, for every option ----------

create function public.get_option_approvals(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if not ((public.member_role(p_workspace_id) is not null and public.has_client_access(p_workspace_id, p_client_id))
          or (public.my_client_account(p_workspace_id, p_client_id)).id is not null) then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id,
      'kind', o.kind,
      'gecko', o.decided_by_studio,
      'studioBy', o.studio_approved_by,
      'studioAt', o.studio_approved_at,
      'brandBy', case when not o.decided_by_studio and o.status in ('approved', 'booked', 'shot', 'paid', 'invoiced')
                      then o.decided_by end,
      'brandAt', case when not o.decided_by_studio and o.status in ('approved', 'booked', 'shot', 'paid', 'invoiced')
                      then o.decided_at end
    ))
    from public.production_options o
    where o.workspace_id = p_workspace_id and o.client_id = p_client_id
  ), '[]'::jsonb);
end
$$;
revoke all on function public.get_option_approvals(uuid, text) from public, anon;
grant execute on function public.get_option_approvals(uuid, text) to authenticated;

-- ---------- 4. the client's side ----------

create or replace function public.client_decide_option(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_decision text, p_body text, p_over boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  o public.production_options%rowtype;
  v_cap numeric;
  v_over boolean := false;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role = 'viewer' then raise exception 'spend_approver_only'; end if;
  if p_decision not in ('approve', 'pass') or length(coalesce(p_body, '')) > 2000 then raise exception 'invalid_note'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.budget.' || p_client_id, 0));
  select * into o from public.production_options
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'option_not_found'; end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  if p_decision = 'approve' then
    if o.status not in ('proposed', 'passed') then raise exception 'not_waiting'; end if;
    select b.cap into v_cap from public.production_budgets b
    where b.workspace_id = p_workspace_id and b.client_id = p_client_id;
    v_over := o.bought_by = 'gecko' and v_cap is not null
      and public.production_committed(p_workspace_id, p_client_id, o.id) + o.cost > v_cap;
    if v_over and not coalesce(p_over, false) then raise exception 'over_budget'; end if;
    if v_over and acc.role not in ('owner', 'finance') then raise exception 'over_budget_owner'; end if;
    -- Who plays in the brand's ads is the brand owner's call (checked after the budget rules, which apply to all).
    if o.kind = 'talent' and acc.role <> 'owner' then raise exception 'talent_owner_only'; end if;
    update public.production_options set status = 'approved', over_budget = v_over, decided_by = who,
      decided_at = now(), decided_by_studio = false, updated_at = now() where id = o.id;
  else
    if o.status not in ('proposed', 'approved') then raise exception 'not_waiting'; end if;
    -- Gecko's yes is final: the client can comment on it, not undo it.
    if o.decided_by_studio and o.status = 'approved' then raise exception 'gecko_decided'; end if;
    update public.production_options set status = 'passed', over_budget = false, decided_by = who,
      decided_at = now(), updated_at = now() where id = o.id;
  end if;
  insert into public.production_notes(option_id, workspace_id, client_id, kind, body, cost, from_client, author_user, author_name)
  values (o.id, p_workspace_id, p_client_id, p_decision, trim(coalesce(p_body, '')), o.cost, true, (select auth.uid()), who);
  return public.get_my_production(p_workspace_id, p_client_id);
end
$$;

-- ---------- 5. tell the client ----------

create or replace function public.client_portal_visit(p_workspace_id uuid, p_client_id text)
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
    'confirmed', (select count(*) from public.production_options o
                  where o.workspace_id = p_workspace_id and o.client_id = p_client_id
                    and o.decided_by_studio and o.status <> 'passed' and o.decided_at > v_since),
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
                    and kind <> 'approve'
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
