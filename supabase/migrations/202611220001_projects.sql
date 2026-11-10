-- Projects under clients (Gecko World V1, phase 2a).
-- A client holds the brand and the relationship; a project holds its own ideas, scripts, shoot days, reels
-- and invoices. Every client gets one project now, holding everything they have today, so nobody sees a
-- difference until a second project exists.
--
-- The projects table comes from the first app: its rows keep their free-form data (costs, payouts) untouched
-- and are marked archived, since nothing in the current app reads them.
--
-- New rows with no project go to the client's current project (the newest active one), so every screen that
-- doesn't know about projects yet keeps working.

-- ---------- projects get real columns ----------

alter table public.projects
  add column name text not null default '' check (length(name) <= 120),
  add column kind text not null default 'performance' check (kind in ('performance', 'cinematic')),
  add column status text not null default 'active' check (status in ('active', 'done', 'archived')),
  add column position integer not null default 0 check (position between 0 and 100000),
  add column created_by uuid references auth.users(id) on delete set null;

-- The first app's projects: keep them, named from their data, out of the way.
update public.projects
set name = left(trim(coalesce(nullif(data->>'name', ''), nullif(data->>'title', ''), 'Earlier project')), 120),
    status = 'archived';

-- One project per client, holding everything the client has today.
insert into public.projects (workspace_id, id, client_id, data, name, kind, status, position)
select c.workspace_id, left('p_' || c.id, 64), c.id, '{}'::jsonb,
  left(coalesce(nullif(trim(cp.campaign), ''), c.brand || ': first project'), 120),
  coalesce(cp.template, 'performance'),
  'active', 1
from public.clients c
left join public.client_portals cp on cp.workspace_id = c.workspace_id and cp.client_id = c.id
on conflict (workspace_id, id) do update set status = 'active', name = excluded.name, kind = excluded.kind;

-- ---------- the work belongs to a project ----------

alter table public.concepts add column project_id text;
alter table public.scripts add column project_id text;
alter table public.shoot_days add column project_id text;
alter table public.cuts add column project_id text;
alter table public.invoices add column project_id text;

alter table public.concepts add constraint concepts_project_fk
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id);
alter table public.scripts add constraint scripts_project_fk
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id);
alter table public.shoot_days add constraint shoot_days_project_fk
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id);
alter table public.cuts add constraint cuts_project_fk
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id);
alter table public.invoices add constraint invoices_project_fk
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id);

create index concepts_project on public.concepts(workspace_id, project_id);
create index scripts_project on public.scripts(workspace_id, project_id);
create index shoot_days_project on public.shoot_days(workspace_id, project_id);
create index cuts_project on public.cuts(workspace_id, project_id);
create index invoices_project on public.invoices(workspace_id, project_id);

-- Fill the existing rows. Their own triggers are paused for this one update: the guards are for people,
-- and nothing should look edited ("new since your last visit" reads updated_at).
alter table public.concepts disable trigger user;
alter table public.scripts disable trigger user;
alter table public.shoot_days disable trigger user;
alter table public.cuts disable trigger user;
alter table public.invoices disable trigger user;

update public.concepts t set project_id = left('p_' || t.client_id, 64) where t.project_id is null;
update public.scripts t set project_id = left('p_' || t.client_id, 64) where t.project_id is null;
update public.shoot_days t set project_id = left('p_' || t.client_id, 64) where t.project_id is null;
update public.cuts t set project_id = left('p_' || t.client_id, 64) where t.project_id is null;
update public.invoices t set project_id = left('p_' || t.client_id, 64) where t.project_id is null;

alter table public.concepts enable trigger user;
alter table public.scripts enable trigger user;
alter table public.shoot_days enable trigger user;
alter table public.cuts enable trigger user;
alter table public.invoices enable trigger user;

-- New rows land in a project of the same client: the one given, or the client's current project.
create function public.fill_project_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is null then
    select p.id into new.project_id from public.projects p
    where p.workspace_id = new.workspace_id and p.client_id = new.client_id and p.status = 'active'
    order by p.position desc, p.created_at desc
    limit 1;
  elsif not exists (select 1 from public.projects p where p.workspace_id = new.workspace_id
                    and p.id = new.project_id and p.client_id = new.client_id) then
    raise exception 'project_not_found';
  end if;
  return new;
end
$$;

revoke all on function public.fill_project_id() from public, anon, authenticated;

create trigger concepts_project before insert or update of project_id on public.concepts
  for each row execute function public.fill_project_id();
create trigger scripts_project before insert or update of project_id on public.scripts
  for each row execute function public.fill_project_id();
create trigger shoot_days_project before insert or update of project_id on public.shoot_days
  for each row execute function public.fill_project_id();
create trigger cuts_project before insert or update of project_id on public.cuts
  for each row execute function public.fill_project_id();
create trigger invoices_project before insert or update of project_id on public.invoices
  for each row execute function public.fill_project_id();

-- ---------- reading and saving projects ----------

-- The projects of a client, for the team with access and for the client's own people.
create function public.get_projects(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  team boolean;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  team := coalesce(current_setting('gecko.preview', true), '') = ''
    and public.member_role(p_workspace_id) is not null
    and public.has_client_access(p_workspace_id, p_client_id);
  if not team and (public.my_client_account(p_workspace_id, p_client_id)).id is null then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'canManage', team and public.member_role(p_workspace_id) in ('founder', 'sales'),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'kind', p.kind, 'status', p.status, 'position', p.position,
        'createdAt', p.created_at,
        'ideas', (select count(*) from public.concepts x where x.workspace_id = p.workspace_id and x.project_id = p.id),
        'scripts', (select count(*) from public.scripts x where x.workspace_id = p.workspace_id and x.project_id = p.id),
        'approved', (select count(*) from public.scripts x where x.workspace_id = p.workspace_id
                     and x.project_id = p.id and x.approved_version is not null),
        'shootDays', (select count(*) from public.shoot_days x where x.workspace_id = p.workspace_id
                      and x.project_id = p.id and x.removed_at is null),
        'nextShoot', (select min(x.day) from public.shoot_days x where x.workspace_id = p.workspace_id
                      and x.project_id = p.id and x.removed_at is null and x.day >= current_date),
        'reels', (select count(*) from public.cuts x where x.workspace_id = p.workspace_id and x.project_id = p.id)
      ) order by (p.status = 'archived'), p.position desc, p.created_at desc)
      from public.projects p
      where p.workspace_id = p_workspace_id and p.client_id = p_client_id
        and (team or p.status <> 'archived')
    ), '[]'::jsonb)
  );
end
$$;

-- Founder and producers start, rename and close projects. A new project becomes the client's current one.
create function public.save_project(p_workspace_id uuid, p_client_id text, p_project jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_name text := left(trim(coalesce(p_project->>'name', '')), 120);
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then
    raise exception 'forbidden';
  end if;
  if p_project is null or jsonb_typeof(p_project) <> 'object' or length(v_name) = 0 then
    raise exception 'invalid_project';
  end if;
  begin
    if p_project->>'id' is null then
      v_id := 'p' || left(replace(gen_random_uuid()::text, '-', ''), 15);
      insert into public.projects (workspace_id, id, client_id, data, name, kind, status, position, created_by)
      values (p_workspace_id, v_id, p_client_id, '{}'::jsonb, v_name,
        coalesce(p_project->>'kind', 'performance'), 'active',
        coalesce((select max(p.position) + 1 from public.projects p
                  where p.workspace_id = p_workspace_id and p.client_id = p_client_id), 1),
        (select auth.uid()));
    else
      update public.projects set
        name = v_name,
        kind = coalesce(p_project->>'kind', kind),
        status = coalesce(p_project->>'status', status),
        updated_at = now()
      where workspace_id = p_workspace_id and client_id = p_client_id and id = p_project->>'id'
      returning id into v_id;
      if v_id is null then raise exception 'project_not_found'; end if;
    end if;
  exception when check_violation then
    raise exception 'invalid_project';
  end;
  return v_id;
end
$$;

revoke all on function public.get_projects(uuid, text), public.save_project(uuid, text, jsonb) from public, anon;
grant execute on function public.get_projects(uuid, text), public.save_project(uuid, text, jsonb) to authenticated;
