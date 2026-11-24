-- Studio media (Heni, 24 Nov 2026: "anything that needs a photo: drop it or paste it in the right place"). One bucket
-- for the pictures the team adds outside a client's board: talent, location, creator and gear photos, and images in
-- pages and documents. Files sit under the workspace's folder with a random name. Anyone on the team can add one;
-- reading is public by link (like an Instagram photo pasted today), so the same picture shows in the app, the client
-- portal and a shared document. Images only, 5 MB at most.
create function public.media_upload_ok(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ws text := split_part(coalesce(p_name, ''), '/', 1);
begin
  if ws !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  -- workspace/<random>.<ext>: two parts, a safe file name, an image extension.
  if p_name !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp|gif)$' then return false; end if;
  return public.is_workspace_member(ws::uuid);
end
$$;

revoke all on function public.media_upload_ok(text) from public, anon;
grant execute on function public.media_upload_ok(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    on conflict (id) do nothing;
    execute $p$create policy media_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and public.media_upload_ok(name))$p$;
    execute $p$create policy media_delete on storage.objects for delete to authenticated
      using (bucket_id = 'media' and public.media_upload_ok(name))$p$;
  end if;
end
$$;
