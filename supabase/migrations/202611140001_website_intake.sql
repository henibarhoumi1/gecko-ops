-- Website intake: the public site (gecko-site) saves every brief and contact form as a lead in the Pipeline,
-- and counts visits and brief steps, so nothing a visitor sends lives only in WhatsApp.
--
-- Both functions are open to anonymous visitors, so they take only what they need and are capped:
--   submit_website_lead  a new lead (stage prospect, channel Website) in Gecko's workspace. A hidden "website"
--                        field that only bots fill is dropped. At most 20 a minute and 200 a day across the site,
--                        and the same phone or email within 10 minutes updates nothing new.
--   count_site_event     adds one to today's count for a known kind of event. No visitor data is kept: only
--                        the day, the kind, the language and the count. Capped at 50,000 per kind per day.
-- get_site_stats returns the counts and website leads to the founder and producers (Alerts screen).

create table public.site_events (
  day date not null default current_date,
  kind text not null check (kind in ('view', 'brief_start', 'brief_done', 'contact_done', 'wa_click')),
  lang text not null default '' check (lang in ('', 'en', 'fr')),
  count integer not null default 0 check (count >= 0),
  primary key (day, kind, lang)
);
alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;

-- The workspace the website belongs to: the first one created (Gecko's own).
create function public.website_workspace()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id from public.workspaces w order by w.created_at, w.id limit 1
$$;
revoke all on function public.website_workspace() from public, anon, authenticated;

create function public.count_site_event(p_kind text, p_lang text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lang text := case when p_lang in ('en', 'fr') then p_lang else '' end;
begin
  if p_kind is null or p_kind not in ('view', 'brief_start', 'brief_done', 'contact_done', 'wa_click') then return; end if;
  insert into public.site_events as e (day, kind, lang, count) values (current_date, p_kind, v_lang, 1)
  on conflict (day, kind, lang) do update set count = e.count + 1 where e.count < 50000;
exception when others then
  return;
end
$$;

create function public.submit_website_lead(p_data jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ws uuid := public.website_workspace();
  d jsonb := coalesce(p_data, '{}'::jsonb);
  v_name text := left(trim(coalesce(d->>'name', '')), 120);
  v_brand text := left(trim(coalesce(nullif(d->>'brand', ''), d->>'name', '')), 160);
  v_email text := left(trim(coalesce(d->>'email', '')), 160);
  v_phone text := left(regexp_replace(coalesce(d->>'phone', ''), '[^0-9+ ]', '', 'g'), 60);
  v_kind text := case when d->>'kind' in ('brief', 'contact', 'lead') then d->>'kind' else 'lead' end;
  v_answers jsonb := case when jsonb_typeof(d->'answers') = 'object' then d->'answers' else '{}'::jsonb end;
  new_id text := 'web-' || replace(gen_random_uuid()::text, '-', '');
begin
  if ws is null or jsonb_typeof(d) <> 'object' then return null; end if;
  if coalesce(d->>'website', '') <> '' then return null; end if; -- the hidden field only bots fill
  if length(d::text) > 8000 then return null; end if;
  if v_brand = '' or (v_email = '' and length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8) then
    raise exception 'invalid_lead';
  end if;
  if (select count(*) from public.leads l where l.channel = 'Website' and l.created_at > now() - interval '1 minute') >= 20
     or (select count(*) from public.leads l where l.channel = 'Website' and l.created_at > now() - interval '1 day') >= 200 then
    raise exception 'too_many_leads';
  end if;
  if exists (select 1 from public.leads l
             where l.workspace_id = ws and l.channel = 'Website' and l.created_at > now() - interval '10 minutes'
               and ((v_phone <> '' and l.whatsapp = v_phone) or (v_email <> '' and l.contact = v_email))) then
    return 'duplicate';
  end if;

  insert into public.leads (workspace_id, id, brand, stage, channel, contact, whatsapp, phone, sector, pack,
                            next_step, next_date, extra)
  values (ws, new_id, v_brand, 'prospect', 'Website', nullif(v_email, ''), nullif(v_phone, ''), nullif(v_phone, ''),
          nullif(left(coalesce(v_answers->>'who', ''), 120), ''), nullif(left(coalesce(d->>'plan', ''), 60), ''),
          case v_kind when 'brief' then 'Reply to the website brief' else 'Reply to the website message' end,
          current_date,
          jsonb_build_object('source', 'website', 'form', v_kind, 'person', v_name,
                             'lang', left(coalesce(d->>'lang', ''), 5), 'page', left(coalesce(d->>'page', ''), 200),
                             'message', left(coalesce(d->>'message', ''), 2000), 'answers', v_answers));
  return new_id;
end
$$;

create function public.get_site_stats(p_workspace_id uuid, p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since date := current_date - (least(greatest(coalesce(p_days, 7), 1), 90) - 1);
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'totals', coalesce((select jsonb_object_agg(kind, n) from (
      select kind, sum(count)::int as n from public.site_events where day >= since group by kind) t), '{}'::jsonb),
    'leads', case when p_workspace_id = public.website_workspace() then coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'at', l.created_at, 'brand', l.brand,
               'form', l.extra->>'form', 'stage', l.stage) order by l.created_at desc)
      from public.leads l
      where l.workspace_id = p_workspace_id and l.channel = 'Website' and l.created_at::date >= since), '[]'::jsonb)
      else '[]'::jsonb end
  );
end
$$;

revoke all on function public.count_site_event(text, text) from public;
revoke all on function public.submit_website_lead(jsonb) from public;
revoke all on function public.get_site_stats(uuid, integer) from public, anon;
grant execute on function public.count_site_event(text, text) to anon, authenticated;
grant execute on function public.submit_website_lead(jsonb) to anon, authenticated;
grant execute on function public.get_site_stats(uuid, integer) to authenticated;
