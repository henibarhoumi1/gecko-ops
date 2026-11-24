-- Share a page or Gecko document by link (Heni, 24 Nov 2026). Same pattern as the crew links for shoot days:
-- the raw token is shown once to the team and only its sha-256 is stored; a link can be revoked; it reads the page
-- as it is now (edits show up), never the team's other data. A link made "to accept" (quotes, proposals) lets the
-- reader accept it once with their name; the page then shows who accepted and when.

create table public.page_links (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.studio_pages(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  can_accept boolean not null default false,
  accepted_at timestamptz,
  accepted_name text check (accepted_name is null or length(trim(accepted_name)) between 1 and 120),
  views integer not null default 0,
  last_viewed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index page_links_page on public.page_links(page_id);

alter table public.page_links enable row level security;
revoke all on public.page_links from public, anon, authenticated;

-- A new link for a page. Any team member who can read the page. Returns the raw token, once.
create function public.create_page_link(p_page_id uuid, p_can_accept boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pg public.studio_pages;
  raw_token text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into pg from public.studio_pages where id = p_page_id;
  if pg.id is null or public.member_role(pg.workspace_id) is null then raise exception 'page_not_found'; end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.page_links(page_id, workspace_id, token_hash, can_accept, created_by)
  values (pg.id, pg.workspace_id, extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    coalesce(p_can_accept, false), (select auth.uid()));
  return raw_token;
end
$$;

-- The page's live links, with views and acceptance, for the team.
create function public.get_page_links(p_page_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pg public.studio_pages;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into pg from public.studio_pages where id = p_page_id;
  if pg.id is null or public.member_role(pg.workspace_id) is null then raise exception 'page_not_found'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id, 'canAccept', l.can_accept, 'acceptedAt', l.accepted_at, 'acceptedName', l.accepted_name,
      'views', l.views, 'lastViewedAt', l.last_viewed_at, 'createdAt', l.created_at) order by l.created_at)
    from public.page_links l where l.page_id = p_page_id and l.revoked_at is null
  ), '[]'::jsonb);
end
$$;

create function public.revoke_page_link(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  update public.page_links l set revoked_at = now()
  where l.id = p_id and l.revoked_at is null and public.member_role(l.workspace_id) is not null;
  if not found then raise exception 'link_not_found'; end if;
end
$$;

-- The link behind a token, while it is valid.
create function public.page_link_for(p_token text)
returns public.page_links
language sql
stable
set search_path = ''
as $$
  select l.* from public.page_links l
  where p_token ~ '^[0-9a-f]{64}$'
    and l.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
$$;
revoke all on function public.page_link_for(text) from public, anon, authenticated;

-- What the reader sees: the page itself (title, kind, template, blocks), the client's name, and acceptance.
-- Counts the view.
create function public.get_page_by_link(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.page_links := public.page_link_for(p_token);
  pg public.studio_pages;
begin
  if l.id is null then raise exception 'link_expired'; end if;
  select * into pg from public.studio_pages where id = l.page_id;
  update public.page_links set views = views + 1, last_viewed_at = now() where id = l.id;
  return jsonb_build_object(
    'title', pg.title,
    'kind', pg.kind,
    'template', pg.template,
    'blocks', pg.blocks,
    'updatedAt', pg.updated_at,
    'brand', (select c.brand from public.clients c where c.workspace_id = pg.workspace_id and c.id = pg.client_id),
    'canAccept', l.can_accept,
    'acceptedAt', l.accepted_at,
    'acceptedName', l.accepted_name
  );
end
$$;

-- The reader accepts (once), with their name.
create function public.accept_page_by_link(p_token text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.page_links := public.page_link_for(p_token);
begin
  if l.id is null then raise exception 'link_expired'; end if;
  if not l.can_accept then raise exception 'not_acceptable'; end if;
  if l.accepted_at is not null then raise exception 'already_accepted'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 120 then raise exception 'name_required'; end if;
  update public.page_links set accepted_at = now(), accepted_name = trim(p_name) where id = l.id;
  return jsonb_build_object('acceptedAt', now(), 'acceptedName', trim(p_name));
end
$$;

revoke all on function public.create_page_link(uuid, boolean), public.get_page_links(uuid),
  public.revoke_page_link(uuid) from public, anon;
grant execute on function public.create_page_link(uuid, boolean), public.get_page_links(uuid),
  public.revoke_page_link(uuid) to authenticated;
-- The only two functions open without an account; both check the token first.
revoke all on function public.get_page_by_link(text), public.accept_page_by_link(text, text) from public;
grant execute on function public.get_page_by_link(text), public.accept_page_by_link(text, text)
  to anon, authenticated;
