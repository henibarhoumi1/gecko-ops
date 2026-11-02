-- Portal v2, phase C (writing): scripts and treatments written by either side, approved by the other.
-- The client (owner or approver) can write a script or treatment of their own. Gecko approves it, asks for changes,
-- or rewrites it as a new version, which then goes back to the client for their yes. One rule everywhere:
-- whoever wrote the version on screen waits for the other side.
-- Cinematic treatments also carry their sections (mood, story, music, styling, casting), versioned with the rest.

-- ---------- columns ----------

create function public.treatment_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and coalesce((
      select bool_and(k in ('mood', 'story', 'music', 'styling', 'casting')
        and jsonb_typeof(p->k) = 'string' and length(p->>k) <= 2000)
      from jsonb_object_keys(p) as keys(k)
    ), true)
$$;

alter table public.scripts
  add column written_by text not null default 'gecko' check (written_by in ('gecko', 'client')),
  add column treatment jsonb not null default '{}' check (public.treatment_ok(treatment));

create or replace function public.script_content(s public.scripts)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'title', s.title, 'style', s.style, 'seconds', s.seconds, 'goal', s.goal,
    'hooks', s.hooks, 'beats', s.beats, 'cta', s.cta, 'treatment', s.treatment
  )
$$;

create or replace function public.script_to_json(s public.scripts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.script_content(s) || jsonb_build_object(
    'id', s.id, 'conceptId', s.concept_id, 'position', s.position, 'status', s.status, 'version', s.version,
    'hook', s.hook, 'approvedVersion', s.approved_version, 'approvedAt', s.approved_at, 'approvedBy', s.approved_by,
    'authorName', s.author_name, 'createdAt', s.created_at, 'updatedAt', s.updated_at,
    'writtenBy', s.written_by, 'mine', s.created_by = (select auth.uid()),
    'previous', (
      select v.content from public.script_versions v
      where v.script_id = s.id and v.version < s.version
      order by v.version desc limit 1
    ),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'line', n.line, 'hook', n.hook, 'fromClient', n.from_client,
        'authorName', n.author_name, 'body', n.body, 'version', n.version, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.script_notes n where n.script_id = s.id
    ), '[]'::jsonb)
  )
$$;

-- ---------- the team's rules ----------
-- As before, plus: on a script the client wrote, the team approves it or asks for changes; and if the team edits
-- the words, the script becomes Gecko's version and goes back to the client.
create or replace function public.scripts_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed boolean;
  hooks integer;
begin
  if current_user <> 'authenticated' then
    new.updated_at := now();
    return new;
  end if;
  if new.concept_id is not null and not exists (
    select 1 from public.concepts c
    where c.id = new.concept_id and c.workspace_id = new.workspace_id and c.client_id = new.client_id
  ) then
    raise exception 'invalid_script';
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'review') then raise exception 'client_only'; end if;
    new.written_by := 'gecko';
    new.version := 1;
    new.hook := null;
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
    new.created_by := (select auth.uid());
    new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.client_id := old.client_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  changed := public.script_content(new) is distinct from public.script_content(old);

  -- The client wrote this version: Gecko decides on it, as long as Gecko didn't also change the words.
  if old.written_by = 'client' and not changed and new.status is distinct from old.status
     and new.status in ('approved', 'changes') then
    if old.status not in ('review', 'changes') then raise exception 'script_changed'; end if;
    new.written_by := 'client';
    new.author_name := old.author_name;
    new.version := old.version;
    if new.status = 'approved' then
      hooks := jsonb_array_length(old.hooks);
      new.hook := case when hooks = 0 then null when new.hook is not null and new.hook between 0 and hooks - 1 then new.hook else 0 end;
      new.approved_version := old.version;
      new.approved_at := now();
      new.approved_by := coalesce(public.my_member_name(new.workspace_id), 'Gecko');
    else
      new.hook := null;
      new.approved_version := null;
      new.approved_at := null;
      new.approved_by := null;
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.status is distinct from old.status and new.status in ('approved', 'changes') then
    raise exception 'client_only';
  end if;
  new.hook := old.hook;
  new.approved_version := old.approved_version;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  if changed then
    new.version := old.version + 1;
    if old.written_by = 'client' then
      -- Gecko's rewrite of the client's script: now it's Gecko's version, and the client approves it.
      new.written_by := 'gecko';
      new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
      if new.status <> 'draft' then new.status := 'review'; end if;
    else
      new.written_by := old.written_by;
      new.author_name := old.author_name;
    end if;
    -- A changed script goes back to the client: the old approval no longer covers it.
    if old.status in ('approved', 'changes') and new.status = old.status then new.status := 'review'; end if;
  else
    new.version := old.version;
    new.written_by := old.written_by;
    new.author_name := old.author_name;
  end if;
  if new.status <> 'approved' then
    new.hook := null;
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;

-- ---------- the client writes ----------

-- Write a new script or treatment, or edit one of the client's own that Gecko hasn't approved yet.
-- Owners and approvers write; everyone else comments.
create function public.client_write_script(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_title text, p_seconds integer, p_goal text,
  p_hooks jsonb, p_beats jsonb, p_cta text, p_treatment jsonb
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
      values (p_workspace_id, p_client_id, trim(coalesce(p_title, '')), 'other', coalesce(p_seconds, 30),
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
    if not found or s.written_by <> 'client' or s.status not in ('review', 'changes') then
      raise exception 'script_locked';
    end if;
    next_content := jsonb_build_object(
      'title', trim(coalesce(p_title, '')), 'style', s.style, 'seconds', coalesce(p_seconds, 30),
      'goal', trim(coalesce(p_goal, '')), 'hooks', coalesce(p_hooks, '[]'), 'beats', coalesce(p_beats, '[]'),
      'cta', trim(coalesce(p_cta, '')), 'treatment', coalesce(p_treatment, '{}'));
    if next_content is distinct from public.script_content(s) then
      update public.scripts set title = next_content->>'title', seconds = (next_content->>'seconds')::integer,
        goal = next_content->>'goal', hooks = next_content->'hooks', beats = next_content->'beats',
        cta = next_content->>'cta', treatment = next_content->'treatment',
        version = s.version + 1, status = 'review', author_name = who
      where id = s.id returning * into s;
    end if;
  exception when check_violation then
    raise exception 'invalid_script';
  end;
  return public.script_to_json(s);
end
$$;

-- The client never approves their own writing: Gecko does. Comments stay open to everyone.
create or replace function public.client_script_note(
  p_workspace_id uuid, p_client_id text, p_script_id uuid, p_kind text, p_body text, p_version integer,
  p_line text, p_hook integer
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
  hooks integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('comment', 'approve', 'changes') or p_body is null or length(p_body) > 4000
     or (p_kind in ('comment', 'changes') and length(trim(p_body)) = 0)
     or (p_line is not null and p_line !~ '^(hook-[0-2]|beat-([0-9]|[1-3][0-9])|goal|cta)$')
     or (p_line is not null and p_kind = 'approve') then
    raise exception 'invalid_note';
  end if;
  select * into s from public.scripts
  where id = p_script_id and workspace_id = p_workspace_id and client_id = p_client_id and status <> 'draft'
  for update;
  if not found then raise exception 'invalid_note'; end if;
  if p_kind <> 'comment' and s.written_by = 'client' then raise exception 'gecko_approves'; end if;
  if p_kind <> 'comment' and (s.status not in ('review', 'changes') or s.version is distinct from p_version) then
    raise exception 'script_changed';
  end if;
  hooks := jsonb_array_length(s.hooks);
  if p_kind = 'approve' then
    if hooks > 1 and (p_hook is null or p_hook < 0 or p_hook >= hooks) then raise exception 'hook_required'; end if;
    if hooks <= 1 then p_hook := case when hooks = 1 then 0 else null end; end if;
  else
    p_hook := null;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.notes.' || acc.id::text, 0));
  if (select count(*) from public.script_notes n
      where n.workspace_id = p_workspace_id and n.client_id = p_client_id and n.from_client
        and n.created_at > now() - interval '1 hour') >= 120 then
    raise exception 'feedback_rate_limited';
  end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  insert into public.script_notes(workspace_id, client_id, script_id, kind, line, hook, from_client, author_user, author_name, body, version)
  values (p_workspace_id, p_client_id, s.id, p_kind, p_line, p_hook, true, (select auth.uid()), who, trim(p_body), s.version);
  if p_kind = 'approve' then
    update public.scripts set status = 'approved', hook = p_hook, approved_version = s.version, approved_at = now(), approved_by = who
    where id = s.id returning * into s;
  elsif p_kind = 'changes' then
    update public.scripts set status = 'changes', hook = null, approved_version = null, approved_at = null, approved_by = null
    where id = s.id returning * into s;
  end if;
  return public.script_to_json(s);
end
$$;

revoke all on function public.treatment_ok(jsonb), public.client_write_script(uuid, text, uuid, text, integer, text, jsonb, jsonb, text, jsonb)
  from public, anon;
grant execute on function public.treatment_ok(jsonb) to authenticated;
grant execute on function public.client_write_script(uuid, text, uuid, text, integer, text, jsonb, jsonb, text, jsonb)
  to authenticated;
revoke all on function public.client_script_note(uuid, text, uuid, text, text, integer, text, integer) from public, anon;
grant execute on function public.client_script_note(uuid, text, uuid, text, text, integer, text, integer) to authenticated;
revoke all on function public.script_to_json(public.scripts) from public, anon, authenticated;
