-- Pages and documents (Heni, 24 Nov 2026: "a new page with functions like Notion, but clearer" and "a document
-- builder with Gecko branding: briefs, proposals, messages, lists"). One table: a page is a title, an icon and a
-- list of blocks (text, headings, to-dos, lists, quotes, callouts, dividers). A page made from a template keeps
-- the template's name, so documents print with the right Gecko layout. Optionally about a client.
-- Team only: everyone reads and writes, the founder and producers delete (to the trash).

create table public.studio_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default '' check (length(title) <= 200),
  icon text not null default '' check (length(icon) <= 16),
  kind text not null default 'page' check (kind in ('page', 'doc')),
  template text not null default '' check (length(template) <= 40),
  blocks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 2000 and pg_column_size(blocks) <= 1000000),
  client_id text,
  pinned boolean not null default false,
  created_by uuid default auth.uid(),
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index studio_pages_recent on public.studio_pages(workspace_id, updated_at desc);

create trigger studio_pages_touch before update on public.studio_pages
  for each row execute function public.touch_updated_at();
create trigger studio_pages_to_trash before delete on public.studio_pages
  for each row execute function public.to_trash();

alter table public.studio_pages enable row level security;
revoke all on public.studio_pages from anon, authenticated;
grant select, insert, update, delete on public.studio_pages to authenticated;

create policy studio_pages_read on public.studio_pages for select to authenticated
  using (public.member_role(workspace_id) is not null);
create policy studio_pages_insert on public.studio_pages for insert to authenticated
  with check (public.member_role(workspace_id) is not null);
create policy studio_pages_update on public.studio_pages for update to authenticated
  using (public.member_role(workspace_id) is not null)
  with check (public.member_role(workspace_id) is not null);
create policy studio_pages_delete on public.studio_pages for delete to authenticated
  using (coalesce(public.member_role(workspace_id), '') in ('founder', 'sales'));
