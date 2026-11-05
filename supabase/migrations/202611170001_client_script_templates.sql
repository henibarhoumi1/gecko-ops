-- The client writes scripts the same way the team does: Hook → Lead → Body → CTA, from a template.
-- client_write_script gets an optional template (p_style). Left out, it works as before.

drop function public.client_write_script(uuid, text, uuid, text, integer, text, jsonb, jsonb, text, jsonb);

create function public.client_write_script(
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
    if not found or s.written_by <> 'client' or s.status not in ('review', 'changes') then
      raise exception 'script_locked';
    end if;
    next_content := jsonb_build_object(
      'title', trim(coalesce(p_title, '')), 'style', coalesce(p_style, s.style), 'seconds', coalesce(p_seconds, 30),
      'goal', trim(coalesce(p_goal, '')), 'hooks', coalesce(p_hooks, '[]'), 'beats', coalesce(p_beats, '[]'),
      'cta', trim(coalesce(p_cta, '')), 'treatment', coalesce(p_treatment, '{}'));
    if next_content is distinct from public.script_content(s) then
      update public.scripts set title = next_content->>'title', style = next_content->>'style', seconds = (next_content->>'seconds')::integer,
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

revoke all on function public.client_write_script(uuid, text, uuid, text, integer, text, jsonb, jsonb, text, jsonb, text)
  from public, anon;
grant execute on function public.client_write_script(uuid, text, uuid, text, integer, text, jsonb, jsonb, text, jsonb, text)
  to authenticated;
