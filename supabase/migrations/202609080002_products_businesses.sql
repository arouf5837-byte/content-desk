-- Content Desk: products/services and unlimited businesses.
-- Run once in Supabase SQL Editor. Existing content and files are preserved.
begin;
alter table public.businesses drop constraint if exists businesses_owner_id_kind_key;
alter table public.businesses add column if not exists archived_at timestamptz;

create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 name text not null check(length(trim(name)) between 1 and 200),
 kind text not null default 'product' check(kind in ('product','service')),
 description text,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,business_id),
 unique(business_id,name)
);
alter table public.products enable row level security;
drop policy if exists business_owner on public.products;
create policy business_owner on public.products for all to authenticated
 using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())))
 with check(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
revoke all on public.products from public,anon,authenticated;
grant select,insert,update,delete on public.products to authenticated;
create index if not exists products_business_idx on public.products(business_id);
drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products for each row execute function public.content_hub_set_updated_at();

alter table public.contents add column if not exists product_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.contents'::regclass and conname='contents_product_business_fk') then
 alter table public.contents add constraint contents_product_business_fk
 foreign key(product_id,business_id) references public.products(id,business_id);
 end if;
end $$;
create index if not exists contents_product_idx on public.contents(product_id,business_id);
-- Convert existing product/service labels to real linked records.
insert into public.products(business_id,name,kind)
select distinct c.business_id,left(trim(c.offer_name),200),case when b.kind='agency' then 'service' else 'product' end
from public.contents c join public.businesses b on b.id=c.business_id
where nullif(trim(c.offer_name),'') is not null
on conflict(business_id,name) do nothing;
update public.contents c set product_id=p.id from public.products p
where c.product_id is null and c.business_id=p.business_id and left(trim(c.offer_name),200)=p.name;

-- If credential storage exists, prevent future automation on archived businesses.
do $migration$
begin
if to_regprocedure('public.read_social_credentials_for_automation(uuid,uuid)') is not null then
execute $definition$
create or replace function public.read_social_credentials_for_automation(p_destination_id uuid,p_owner_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare result jsonb;
begin
 if (select auth.role()) is distinct from 'service_role' then
 raise exception using errcode='42501',message='Server access required'; end if;
 if not exists(select 1 from public.destinations d join public.businesses b on b.id=d.business_id
 where d.id=p_destination_id and b.owner_id=p_owner_id and d.active and b.archived_at is null) then
 raise exception using errcode='42501',message='Active account not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'key',c.credential_key,'value',v.decrypted_secret,'expires_at',c.expires_at,'scopes',c.scopes,
 'expired',coalesce(c.expires_at<=now(),false))),'[]'::jsonb)
 into result from content_hub_private.social_credentials c
 join vault.decrypted_secrets v on v.id=c.vault_secret_id where c.destination_id=p_destination_id;
 return result;
end $body$;
$definition$;
end if;
end $migration$;
notify pgrst,'reload schema';
commit;

