-- The edit board (Heni, 24 Nov 2026): who edits each reel and by when. One row per cut, team only. The cut's own
-- status (draft → review → changes → approved → delivered) stays where it is; this only adds the editor and the due
-- date.

create table public.edit_assignments (
  cut_id uuid primary key references public.cuts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  editor text not null default '' check (length(editor) <= 120),
  due_on date,
  updated_at timestamptz not null default now()
);

create trigger edit_assignments_touch before update on public.edit_assignments
  for each row execute function public.touch_updated_at();

alter table public.edit_assignments enable row level security;
revoke all on public.edit_assignments from anon, authenticated;
grant select, insert, update, delete on public.edit_assignments to authenticated;

create policy edit_assignments_read on public.edit_assignments for select to authenticated
  using (public.member_role(workspace_id) is not null);
create policy edit_assignments_write on public.edit_assignments for insert to authenticated
  with check (public.member_role(workspace_id) is not null
    and exists (select 1 from public.cuts c where c.id = cut_id and c.workspace_id = edit_assignments.workspace_id));
create policy edit_assignments_update on public.edit_assignments for update to authenticated
  using (public.member_role(workspace_id) is not null)
  with check (public.member_role(workspace_id) is not null);
create policy edit_assignments_delete on public.edit_assignments for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales'));
