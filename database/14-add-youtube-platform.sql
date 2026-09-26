-- Content Desk: 14-add-youtube-platform.sql
-- Run this script in the Supabase SQL Editor to enable YouTube channel support across the system.
begin;

-- 1. Drop existing platform check constraint on destinations and add youtube & other
do $$
declare r record;
begin
  for r in
    select conname from pg_catalog.pg_constraint
    where conrelid = 'public.destinations'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%platform%'
      and pg_get_constraintdef(oid) not like '%destination_type%'
  loop
    execute format('alter table public.destinations drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.destinations add constraint destinations_platform_check
  check (platform in ('facebook','instagram','tiktok','linkedin','x','youtube','other'));

-- 2. Drop existing destination_type check constraint on destinations and allow channel
do $$
declare r record;
begin
  for r in
    select conname from pg_catalog.pg_constraint
    where conrelid = 'public.destinations'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%destination_type%'
      and pg_get_constraintdef(oid) not like '%platform%'
  loop
    execute format('alter table public.destinations drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.destinations add constraint destinations_destination_type_check
  check (destination_type in ('page','profile','group','channel'));

-- 3. Update public.content_variants platform check
do $$
declare r record;
begin
  for r in
    select conname from pg_catalog.pg_constraint
    where conrelid = 'public.content_variants'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%platform%'
  loop
    execute format('alter table public.content_variants drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.content_variants add constraint content_variants_platform_check
  check (platform in ('facebook','instagram','tiktok','linkedin','x','youtube','other'));

-- 4. Update public.posts platform check
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.posts'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%platform%'
  loop
    execute format('alter table public.posts drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.posts add constraint posts_platform_check
  check (platform in ('facebook','instagram','tiktok','linkedin','x','youtube','other'));

-- 5. Update public.audience_leads platform check (if table exists)
do $$
declare r record;
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'audience_leads') then
    for r in
      select conname from pg_catalog.pg_constraint
      where conrelid = 'public.audience_leads'::regclass and contype = 'c'
        and pg_get_constraintdef(oid) like '%platform%'
    loop
      execute format('alter table public.audience_leads drop constraint %I', r.conname);
    end loop;

    execute 'alter table public.audience_leads add constraint audience_leads_platform_check check (platform in (''linkedin'', ''instagram'', ''x'', ''facebook'', ''youtube'', ''other''))';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
