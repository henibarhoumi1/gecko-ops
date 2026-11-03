-- Extra stand-ins used only when building the expected schema for the snapshot comparison, on top of
-- supabase/tests/local/supabase_stub.sql. They make a plain PostgreSQL look enough like Supabase that the
-- comparison with the live database is like for like:
--   * a minimal storage schema, so the migrations' storage buckets and policies are created (they are
--     skipped when storage.buckets doesn't exist, as in the pgTAP test database)
--   * Supabase's default grants on the public schema, so new tables and functions get the same grants as
--     they do in a Supabase project before the migrations revoke them. The live default grants are
--     recorded as facts in the snapshot, to confirm this matches.

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table storage.objects enable row level security;

create function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
