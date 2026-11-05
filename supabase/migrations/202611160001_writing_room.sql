-- The writing room: ideas and scripts the way an ad is built, and the founder approving for a client.
--
-- 1. Ideas get a hook line (the first words of the ad) next to their format and reference.
-- 2. Script parts: each scene line may say which part of the ad it is, 'lead' or 'body' (the hook and the CTA have
--    their own fields), so a script reads Hook → Lead → Body 1, 2, 3 → CTA.
-- 3. Script templates: the style is now the template it was written from ('problem-fix', 'before-after', 'founder',
--    'review', 'reasons', 'other'). The old styles stay valid for scripts already written.
-- 4. team_approve_for_client: when the client says yes on a call, the founder approves the idea, the script or the
--    video for them. It is recorded as the client's decision, made by the founder: "Heni for Yasmine · on a call".
--    The client keeps their own Approve button; whoever approves first counts.

-- ---------- 1. ideas: a hook line ----------
alter table public.concepts add column hook text not null default '' check (length(hook) <= 200);

create or replace function public.concepts_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'review') then raise exception 'client_only'; end if;
    new.from_client := false;
    new.version := 1;
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
    new.created_by := (select auth.uid());
    new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  -- UPDATE: who wrote it, when and which client never change.
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.client_id := old.client_id;
  new.from_client := old.from_client;
  new.created_by := old.created_by;
  new.author_name := old.author_name;
  new.created_at := old.created_at;
  -- Approving is the client's (or the founder's, for them, through team_approve_for_client).
  if new.status is distinct from old.status and new.status in ('approved', 'changes', 'idea') then
    raise exception 'client_only';
  end if;
  new.approved_version := old.approved_version;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  if (new.title, new.format, new.body, new.refs, new.hook) is distinct from (old.title, old.format, old.body, old.refs, old.hook) then
    new.version := old.version + 1;
    -- A changed idea goes back to the client: an old approval no longer covers it.
    if old.status in ('approved', 'changes') and new.status = old.status then new.status := 'review'; end if;
  else
    new.version := old.version;
  end if;
  if new.status <> 'approved' then
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create or replace function public.concept_to_json(c public.concepts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'format', c.format, 'hook', c.hook, 'body', c.body, 'refs', c.refs,
    'position', c.position, 'fromClient', c.from_client, 'status', c.status, 'version', c.version,
    'approvedVersion', c.approved_version, 'approvedAt', c.approved_at, 'approvedBy', c.approved_by,
    'authorName', c.author_name, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'fromClient', n.from_client, 'authorName', n.author_name,
        'body', n.body, 'version', n.version, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.concept_notes n where n.concept_id = c.id
    ), '[]'::jsonb)
  )
$$;

-- ---------- 2. script parts ----------
create or replace function public.script_lines_ok(p_lines jsonb, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_lines) = 'array'
    and jsonb_array_length(p_lines) <= p_max
    and coalesce((
      select bool_and(
        jsonb_typeof(l) = 'object'
        and (select count(*) from jsonb_object_keys(l)) <= 4
        and (select bool_and(k in ('see', 'hear', 'text', 'part')) from jsonb_object_keys(l) as keys(k))
        and (l->'see' is null or (jsonb_typeof(l->'see') = 'string' and length(l->>'see') <= 1000))
        and (l->'hear' is null or (jsonb_typeof(l->'hear') = 'string' and length(l->>'hear') <= 1000))
        and (l->'text' is null or (jsonb_typeof(l->'text') = 'string' and length(l->>'text') <= 300))
        and (l->'part' is null or l->>'part' in ('lead', 'body'))
      )
      from jsonb_array_elements(p_lines) as lines(l)
    ), true)
$$;

-- ---------- 3. script templates ----------
alter table public.scripts drop constraint scripts_style_check;
alter table public.scripts add constraint scripts_style_check check (style in (
  'problem-fix', 'before-after', 'founder', 'review', 'reasons', 'other',
  'talking-head', 'demo', 'skit', 'ugc', 'voiceover'
));
alter table public.scripts alter column style set default 'problem-fix';

-- ---------- 4. the founder approves for the client ----------
create function public.team_approve_for_client(
  p_workspace_id uuid, p_client_id text, p_kind text, p_id uuid, p_version integer, p_hook integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_who text;
  v_founder text;
  v_client text;
  v_hooks integer;
  v_concept public.concepts%rowtype;
  v_script public.scripts%rowtype;
  v_cut public.cuts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') <> 'founder' then raise exception 'founder_only'; end if;
  if p_kind not in ('concept', 'script', 'cut') then raise exception 'invalid_note'; end if;
  v_founder := coalesce(nullif(trim(public.my_member_name(p_workspace_id)), ''), 'Gecko');
  -- The person at the brand who signs off: the owner's name, else the brand.
  select coalesce(
    (select nullif(trim(a.display_name), '') from public.client_accounts a
     where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.accepted_at is not null
       and a.revoked_at is null
     order by (a.role = 'owner') desc, a.accepted_at limit 1),
    (select c.brand from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id))
  into v_client;
  if v_client is null then raise exception 'forbidden'; end if;
  v_who := left(format('%s for %s · on a call', v_founder, v_client), 120);

  if p_kind = 'concept' then
    select * into v_concept from public.concepts
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
    if not found then raise exception 'invalid_note'; end if;
    if v_concept.status not in ('review', 'changes') or v_concept.version is distinct from p_version then
      raise exception 'concept_changed';
    end if;
    insert into public.concept_notes(workspace_id, client_id, concept_id, kind, from_client, author_user, author_name, body, version)
    values (p_workspace_id, p_client_id, v_concept.id, 'approve', true, (select auth.uid()), v_who, '', v_concept.version);
    update public.concepts set status = 'approved', approved_version = v_concept.version, approved_at = now(), approved_by = v_who
    where id = v_concept.id;

  elsif p_kind = 'script' then
    select * into v_script from public.scripts
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
    if not found then raise exception 'invalid_note'; end if;
    -- A script the client wrote is already Gecko's to approve, with the usual button.
    if v_script.written_by = 'client' then raise exception 'gecko_approves'; end if;
    if v_script.status not in ('review', 'changes') or v_script.version is distinct from p_version then
      raise exception 'script_changed';
    end if;
    v_hooks := jsonb_array_length(v_script.hooks);
    if v_hooks > 1 and (p_hook is null or p_hook < 0 or p_hook >= v_hooks) then raise exception 'hook_required'; end if;
    if v_hooks <= 1 then p_hook := case when v_hooks = 1 then 0 else null end; end if;
    insert into public.script_notes(workspace_id, client_id, script_id, kind, hook, from_client, author_user, author_name, body, version)
    values (p_workspace_id, p_client_id, v_script.id, 'approve', p_hook, true, (select auth.uid()), v_who, '', v_script.version);
    update public.scripts set status = 'approved', hook = p_hook, approved_version = v_script.version, approved_at = now(), approved_by = v_who
    where id = v_script.id;

  else
    select * into v_cut from public.cuts
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
    if not found then raise exception 'invalid_note'; end if;
    if v_cut.status not in ('review', 'changes') or v_cut.version is distinct from p_version then
      raise exception 'cut_changed';
    end if;
    insert into public.cut_notes(cut_id, workspace_id, client_id, version, kind, from_client, author_name, body)
    values (v_cut.id, p_workspace_id, p_client_id, v_cut.version, 'approve', true, v_who, '');
    update public.cuts set status = 'approved', approved_version = v_cut.version, approved_at = now(), approved_by = v_who,
      updated_at = now()
    where id = v_cut.id;
  end if;
end
$$;

-- Decisions on the notes tables: the client's owners and approvers, and now the founder approving for them.
create or replace function public.client_decision_guard()
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
  ) and not (
    new.kind = 'approve' and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = new.workspace_id and m.user_id = new.author_user and m.role = 'founder'
    )
  ) then
    raise exception 'approver_only';
  end if;
  return new;
end
$$;

revoke all on function public.team_approve_for_client(uuid, text, text, uuid, integer, integer) from public, anon;
grant execute on function public.team_approve_for_client(uuid, text, text, uuid, integer, integer) to authenticated;
