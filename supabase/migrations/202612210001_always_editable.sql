-- Always editable (Heni, 26 Nov 2026: "can we always always even after gecko or heni or client approves idea or
-- script have the option to edit the scripts and sets and talents at all time?").
--
-- The client (owners and approvers) can now edit, at any stage once it's shared with them:
-- 1. A script's words: Gecko's or their own, in review, changes or approved. Editing an approved script makes a new
--    version and sends it back for one approval (to the client for Gecko's scripts, to Gecko for the client's),
--    with a note in the history so the team sees it. The approved version stays in the version history.
-- 2. An idea's words, hook and format: their own ideas at any stage, and Gecko's ideas in review, changes or
--    approved. Same rule: an approved idea whose words or hook change goes back for one approval, with a note.
-- 3. Talent, sets and props on any shared script or idea, approved ones included. That's logistics: no new
--    version, nothing to re-approve.
-- 4. Which idea a script comes from, on any shared script.
-- Drafts Gecko hasn't shared stay Gecko's. Viewers still read only. Same signatures: replaces the functions.

create or replace function public.client_write_script(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_title text, p_seconds integer, p_goal text,
  p_hooks jsonb, p_beats jsonb, p_cta text, p_treatment jsonb, p_style text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  s public.scripts%rowtype;
  who text;
  next_content jsonb;
  was_approved boolean;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role not in ('owner', 'approver') then raise exception 'writer_only'; end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.write.' || acc.id::text, 0));
  begin
    if p_id is null then
      if (select count(*) from public.scripts x
          where x.workspace_id = p_workspace_id and x.client_id = p_client_id and x.written_by = 'client'
            and x.created_at > now() - interval '1 hour') >= 20 then
        raise exception 'feedback_rate_limited';
      end if;
      insert into public.scripts(workspace_id, client_id, title, style, seconds, goal, hooks, beats, cta, treatment,
        position, status, written_by, created_by, author_name)
      values (p_workspace_id, p_client_id, trim(coalesce(p_title, '')), coalesce(p_style, 'other'), coalesce(p_seconds, 30),
        trim(coalesce(p_goal, '')), coalesce(p_hooks, '[]'), coalesce(p_beats, '[]'), trim(coalesce(p_cta, '')),
        coalesce(p_treatment, '{}'),
        coalesce((select max(x.position) + 1 from public.scripts x
                  where x.workspace_id = p_workspace_id and x.client_id = p_client_id), 0),
        'review', 'client', (select auth.uid()), who)
      returning * into s;
      return public.script_to_json(s);
    end if;
    select * into s from public.scripts
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
    -- Any script the client can see: theirs, or Gecko's once shared (review, changes, approved).
    if not found or (s.written_by <> 'client' and s.status not in ('review', 'changes', 'approved')) then
      raise exception 'script_locked';
    end if;
    was_approved := s.status = 'approved';
    next_content := jsonb_build_object(
      'title', trim(coalesce(p_title, '')), 'style', coalesce(p_style, s.style), 'seconds', coalesce(p_seconds, 30),
      'goal', trim(coalesce(p_goal, '')), 'hooks', coalesce(p_hooks, '[]'), 'beats', coalesce(p_beats, '[]'),
      'cta', trim(coalesce(p_cta, '')), 'treatment', coalesce(p_treatment, '{}'));
    if next_content is distinct from public.script_content(s) then
      update public.scripts set title = next_content->>'title', style = next_content->>'style', seconds = (next_content->>'seconds')::integer,
        goal = next_content->>'goal', hooks = next_content->'hooks', beats = next_content->'beats',
        cta = next_content->>'cta', treatment = next_content->'treatment',
        version = s.version + 1, status = 'review',
        approved_version = null, approved_at = null, approved_by = null,
        author_name = case when s.written_by = 'client' then who else s.author_name end
      where id = s.id returning * into s;
      -- The edit shows in the history and reaches the team: always on Gecko's scripts, and on the client's own
      -- when it was already approved.
      if s.written_by <> 'client' or was_approved then
        insert into public.script_notes(workspace_id, client_id, script_id, kind, from_client, author_user, author_name, body, version)
        values (p_workspace_id, p_client_id, s.id, 'comment', true, (select auth.uid()), who,
          case when was_approved
            then format('Edited the approved script (version %s). It needs one more approval.', s.version)
            else format('Edited the script (version %s).', s.version) end,
          s.version);
      end if;
    end if;
  exception when check_violation then
    raise exception 'invalid_script';
  end;
  return public.script_to_json(s);
end
$$;

create or replace function public.client_set_script_shoot(p_workspace_id uuid, p_client_id text, p_id uuid, p_shoot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  s public.scripts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role not in ('owner', 'approver') then raise exception 'writer_only'; end if;
  if p_shoot is null or not public.shoot_plan_ids_ok(p_workspace_id, p_client_id, p_shoot) then
    raise exception 'invalid_shoot_plan';
  end if;
  update public.scripts set shoot = public.shoot_plan_tidy(p_shoot)
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and (written_by = 'client' or status in ('review', 'changes', 'approved'))
  returning * into s;
  if not found then raise exception 'script_locked'; end if;
  return public.script_to_json(s);
end
$$;

create or replace function public.client_set_script_idea(
  p_workspace_id uuid, p_client_id text, p_script_id uuid, p_concept_id uuid
)
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
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role not in ('owner', 'approver') then raise exception 'writer_only'; end if;
  if p_concept_id is not null and not exists (
    select 1 from public.concepts c
    where c.id = p_concept_id and c.workspace_id = p_workspace_id and c.client_id = p_client_id
      and c.status = 'approved'
  ) then
    raise exception 'concept_not_found';
  end if;
  update public.scripts set concept_id = p_concept_id
  where id = p_script_id and workspace_id = p_workspace_id and client_id = p_client_id
    and (written_by = 'client' or status in ('review', 'changes', 'approved'));
  if not found then raise exception 'script_locked'; end if;
end
$$;

-- An idea the client may edit: their own (any stage), or Gecko's once shared, by an owner or approver.
create or replace function public.client_may_edit_idea(c public.concepts, acc public.client_accounts)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (c.from_client and c.created_by = (select auth.uid()))
      or (acc.role in ('owner', 'approver') and c.status in ('review', 'changes', 'approved'))
$$;
revoke all on function public.client_may_edit_idea(public.concepts, public.client_accounts) from public, anon;

create or replace function public.client_save_idea(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_title text, p_body text, p_refs text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.concepts%rowtype;
  who text;
  was_approved boolean;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 160
     or coalesce(length(p_body), 0) > 10000 or coalesce(length(p_refs), 0) > 2000 then
    raise exception 'invalid_idea';
  end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  if p_id is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.ideas.' || acc.id::text, 0));
    if (select count(*) from public.concepts x
        where x.workspace_id = p_workspace_id and x.client_id = p_client_id and x.from_client) >= 200 then
      raise exception 'too_many_ideas';
    end if;
    insert into public.concepts(workspace_id, client_id, title, body, refs, position, from_client, status, created_by, author_name)
    values (p_workspace_id, p_client_id, trim(p_title), coalesce(p_body, ''), coalesce(p_refs, ''),
      coalesce((select max(x.position) + 1 from public.concepts x
        where x.workspace_id = p_workspace_id and x.client_id = p_client_id), 0),
      true, 'idea', (select auth.uid()), who)
    returning * into c;
    return public.concept_to_json(c);
  end if;

  select * into c from public.concepts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found or not public.client_may_edit_idea(c, acc) then raise exception 'invalid_idea'; end if;
  if (trim(p_title), coalesce(p_body, ''), coalesce(p_refs, '')) is not distinct from (c.title, c.body, c.refs) then
    return public.concept_to_json(c);
  end if;
  was_approved := c.status = 'approved';
  update public.concepts set title = trim(p_title), body = coalesce(p_body, ''), refs = coalesce(p_refs, ''),
    version = version + 1,
    status = case when c.status = 'idea' then 'idea' else 'review' end,
    approved_version = null, approved_at = null, approved_by = null
  where id = c.id
  returning * into c;
  if not c.from_client or was_approved then
    insert into public.concept_notes(workspace_id, client_id, concept_id, kind, from_client, author_user, author_name, body, version)
    values (p_workspace_id, p_client_id, c.id, 'comment', true, (select auth.uid()), who,
      case when was_approved
        then format('Edited the approved idea (version %s). It needs one more approval.', c.version)
        else format('Edited the idea (version %s).', c.version) end,
      c.version);
  end if;
  return public.concept_to_json(c);
end
$$;

create or replace function public.client_set_idea_details(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_hook text, p_format text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.concepts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if coalesce(length(p_hook), 0) > 200 or coalesce(p_format, 'reel') not in ('reel', 'carousel', 'static', 'other') then
    raise exception 'invalid_idea';
  end if;
  select * into c from public.concepts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found or not public.client_may_edit_idea(c, acc) then raise exception 'invalid_idea'; end if;
  if (trim(coalesce(p_hook, '')), coalesce(p_format, c.format)) is not distinct from (c.hook, c.format) then return; end if;
  update public.concepts set hook = trim(coalesce(p_hook, '')), format = coalesce(p_format, format)
  where id = c.id;
  -- A new hook on an approved idea is a new version too.
  if c.status = 'approved' then
    update public.concepts set status = 'review', version = version + 1,
      approved_version = null, approved_at = null, approved_by = null
    where id = c.id returning * into c;
    insert into public.concept_notes(workspace_id, client_id, concept_id, kind, from_client, author_user, author_name, body, version)
    values (p_workspace_id, p_client_id, c.id, 'comment', true, (select auth.uid()),
      left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120),
      format('Changed the hook of the approved idea (version %s). It needs one more approval.', c.version), c.version);
  end if;
end
$$;

create or replace function public.client_set_idea_shoot(p_workspace_id uuid, p_client_id text, p_id uuid, p_shoot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.concepts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role not in ('owner', 'approver') then raise exception 'writer_only'; end if;
  if p_shoot is null or not public.shoot_plan_ids_ok(p_workspace_id, p_client_id, p_shoot) then
    raise exception 'invalid_shoot_plan';
  end if;
  select * into c from public.concepts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found or not public.client_may_edit_idea(c, acc) then raise exception 'invalid_idea'; end if;
  update public.concepts set shoot = public.shoot_plan_tidy(p_shoot) where id = c.id;
end
$$;
