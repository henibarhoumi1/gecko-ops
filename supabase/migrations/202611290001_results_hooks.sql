-- Numbers back to hooks (Gecko World V1, phase 8).
--
-- A post that went live can say which script it came from and which of its hooks it opened with. Then
-- the results tell the writers which hooks worked for this client, and the script editor offers them
-- first. Both sides can set it on the posts they may edit (the team on all, the client on what they added).
-- Additive only: two columns on posts, and the results read gains the scripts to pick from.

alter table public.posts add column script_id uuid references public.scripts(id) on delete set null;
alter table public.posts add column hook_index integer check (hook_index between 0 and 2);
alter table public.posts add constraint posts_hook_needs_script check (hook_index is null or script_id is not null);

create or replace function public.post_to_json(p public.posts, p_money boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'cutId', p.cut_id, 'title', p.title, 'platform', p.platform, 'paid', p.paid, 'link', p.link,
    'liveOn', p.live_on, 'press', p.press, 'fromClient', p.from_client, 'authorName', p.author_name,
    'scriptId', p.script_id, 'hookIndex', p.hook_index,
    'createdAt', p.created_at, 'updatedAt', p.updated_at,
    'numbers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', n.day,
        'metrics', case when p_money then n.metrics else n.metrics - 'spend' - 'revenue' end,
        'shots', to_jsonb(n.shots), 'note', n.note, 'enteredBy', n.entered_by, 'enteredAt', n.entered_at,
        'updatedAt', n.updated_at
      ) order by n.day)
      from public.post_numbers n where n.post_id = p.id
    ), '[]'::jsonb)
  )
$$;

create or replace function public.get_results(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, false);
  team boolean := (actor->>'team')::boolean;
  money boolean := team or actor->>'role' in ('owner', 'finance');
begin
  return jsonb_build_object(
    'team', team,
    'seesMoney', money,
    'canAdd', team or actor->>'role' <> 'viewer',
    'posts', coalesce((
      select jsonb_agg(public.post_to_json(p, money) order by p.live_on desc, p.created_at desc)
      from public.posts p where p.workspace_id = p_workspace_id and p.client_id = p_client_id
    ), '[]'::jsonb),
    'reads', coalesce((
      select jsonb_agg(public.monthly_read_to_json(r) order by r.month desc)
      from public.monthly_reads r
      where r.workspace_id = p_workspace_id and r.client_id = p_client_id and (team or r.status = 'published')
    ), '[]'::jsonb),
    -- Cuts the client approved, to pick from when adding a post.
    'cuts', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title) order by c.position, c.created_at)
      from public.cuts c
      where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.status = 'approved'
    ), '[]'::jsonb),
    -- Scripts a post can come from, with their hooks. The client never sees the team's drafts.
    'scripts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'style', s.style, 'hook', s.hook,
        'hooks', coalesce((
          select jsonb_agg(coalesce(nullif(trim(h->>'hear'), ''), nullif(trim(h->>'text'), ''), trim(coalesce(h->>'see', ''))) order by i)
          from jsonb_array_elements(s.hooks) with ordinality as x(h, i)
        ), '[]'::jsonb)
      ) order by s.updated_at desc)
      from public.scripts s
      where s.workspace_id = p_workspace_id and s.client_id = p_client_id
        and (team or s.status <> 'draft' or s.written_by = 'client')
    ), '[]'::jsonb)
  );
end
$$;

-- Which script and hook a post opened with. Null script clears both.
create function public.set_post_script(
  p_workspace_id uuid, p_client_id text, p_post_id uuid, p_script_id uuid, p_hook integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.results_actor(p_workspace_id, p_client_id, true);
  team boolean := (actor->>'team')::boolean;
  n integer;
begin
  if p_script_id is not null then
    select jsonb_array_length(s.hooks) into n from public.scripts s
    where s.id = p_script_id and s.workspace_id = p_workspace_id and s.client_id = p_client_id
      and (team or s.status <> 'draft' or s.written_by = 'client');
    if n is null then raise exception 'script_not_found'; end if;
    if p_hook is not null and (p_hook < 0 or p_hook >= n) then raise exception 'invalid_post'; end if;
  end if;
  update public.posts set
    script_id = p_script_id,
    hook_index = case when p_script_id is null then null else p_hook end,
    updated_at = now()
  where id = p_post_id and workspace_id = p_workspace_id and client_id = p_client_id and (team or from_client);
  if not found then raise exception 'post_not_found'; end if;
end
$$;

revoke all on function public.set_post_script(uuid, text, uuid, uuid, integer) from public, anon;
grant execute on function public.set_post_script(uuid, text, uuid, uuid, integer) to authenticated;
