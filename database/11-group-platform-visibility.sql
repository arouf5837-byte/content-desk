-- Run the complete script in a NEW Supabase SQL Editor query.
-- Preserves group records, product links, credentials and access policies.
begin;
alter table public.destinations
  add column if not exists visibility text not null default 'unknown';
alter table public.destinations drop constraint if exists destinations_visibility_check;
alter table public.destinations add constraint destinations_visibility_check
  check (visibility in ('public','private','unknown'));

-- Replace only checks restricting groups to Facebook. Keep URL/other checks.
do $migration$
declare item record;
begin
  for item in
    select conname from pg_catalog.pg_constraint
    where conrelid = 'public.destinations'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%destination_type%'
      and pg_get_constraintdef(oid) like '%platform%'
      and pg_get_constraintdef(oid) like '%facebook%'
  loop
    execute format('alter table public.destinations drop constraint %I', item.conname);
  end loop;
end;
$migration$;

alter table public.destinations add constraint destinations_group_platform_check
  check (destination_type <> 'group' or platform in ('facebook','linkedin'));
notify pgrst, 'reload schema';
commit;
