-- Read-only diagnostics. No schema, data or permissions are changed.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
and table_name in ('businesses','products','destinations','destination_products')
order by table_name, ordinal_position;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.destinations'::regclass,'public.products'::regclass,'public.destination_products'::regclass);

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'destination_products';

select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'destination_products';
