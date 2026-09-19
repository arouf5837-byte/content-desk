-- Content Desk: groups can be assigned to products/services, plus useful content fields.
-- Run this whole file once in Supabase SQL Editor.
begin;

do $$ begin
  alter table public.destinations add constraint destinations_id_business_unique unique (id, business_id);
exception when duplicate_object then null;
end $$;

create table if not exists public.destination_products (
  destination_id uuid not null,
  business_id uuid not null,
  product_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (destination_id, product_id),
  foreign key (destination_id, business_id) references public.destinations(id, business_id) on delete cascade,
  foreign key (product_id, business_id) references public.products(id, business_id) on delete cascade
);

create index if not exists destination_products_business_idx on public.destination_products(business_id);
create index if not exists destination_products_product_idx on public.destination_products(product_id);
alter table public.destination_products enable row level security;
revoke all on public.destination_products from public, anon, authenticated;
grant select, insert, update, delete on public.destination_products to authenticated;

drop policy if exists destination_products_owner_all on public.destination_products;
create policy destination_products_owner_all on public.destination_products
for all to authenticated
using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

alter table public.contents
  add column if not exists content_pillar text,
  add column if not exists target_audience text,
  add column if not exists hook text,
  add column if not exists cta text;

alter table public.contents drop constraint if exists contents_format_check;
alter table public.contents add constraint contents_format_check
  check (format in ('text','image','carousel','video','reel','story'));

notify pgrst, 'reload schema';
commit;
