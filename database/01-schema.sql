-- Business Content Hub | 01 | Run ONCE in a new/empty Supabase project.
-- Transactional: an error rolls back this whole script. No existing tables are dropped.
begin;

create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 name text not null check (length(trim(name)) > 0),
 kind text not null check (kind in ('ecom','agency')),
 timezone text not null default 'Asia/Dhaka',
 brand_notes text,
 created_at timestamptz not null default now(),
 unique(owner_id,kind)
);

create table public.destinations (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 name text not null,
 platform text not null check (platform in ('facebook','instagram','tiktok','linkedin','x')),
 destination_type text not null check (destination_type in ('page','profile','group')),
 url text check (url is null or url ~ '^https?://'),
 audience_notes text,
 posting_rules text,
 approval_required boolean not null default false,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(id,business_id,platform),
 check (destination_type <> 'group' or platform = 'facebook'),
 check (destination_type <> 'group' or url is not null)
);

create table public.contents (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 title text not null check (length(trim(title)) > 0),
 topic text,
 offer_name text, -- Product/service/offer label; no inventory or CRM needed.
 objective text,
 format text not null default 'text' check (format in ('text','image','carousel','video')),
 brief text,
 script text,
 tags text[] not null default '{}',
 source text not null default 'manual' check (source in ('manual','ai','mixed')),
 ai_notes text,
 status text not null default 'idea' check (status in ('idea','draft','review','ready','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,business_id)
);

create table public.content_variants (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 content_id uuid not null,
 platform text not null check (platform in ('facebook','instagram','tiktok','linkedin','x')),
 label text not null default 'Version 1',
 body text not null default '',
 hashtags text[] not null default '{}',
 cta text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,business_id,platform),
 foreign key(content_id,business_id) references public.contents(id,business_id)
);

create table public.assets (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 content_id uuid not null,
 bucket_id text not null default 'content-media' check (bucket_id = 'content-media'),
 storage_path text not null unique,
 file_name text not null,
 media_type text not null check (media_type in ('image','video','audio','document')),
 role text not null default 'final' check (role in ('original','draft','final','thumbnail')),
 mime_type text,
 size_bytes bigint check (size_bytes >= 0),
 created_at timestamptz not null default now(),
 foreign key(content_id,business_id) references public.contents(id,business_id),
 check (split_part(storage_path,'/',1) = business_id::text),
 check (split_part(storage_path,'/',2) = content_id::text)
);

create table public.posts (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 variant_id uuid not null,
 destination_id uuid not null,
 platform text not null check (platform in ('facebook','instagram','tiktok','linkedin','x')),
 status text not null default 'planned' check (status in
 ('planned','scheduled','pending_approval','published','failed','rejected','cancelled')),
 scheduled_at timestamptz,
 submitted_at timestamptz,
 published_at timestamptz,
 post_url text check (post_url is null or post_url ~ '^https?://'),
 external_post_id text,
 final_body text, -- Copy actual text here at publication; later draft edits do not change it.
 media_paths text[] not null default '{}', -- Exact stored file paths used in this post.
 distribution text not null default 'organic' check (distribution in ('organic','paid','mixed')),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,business_id),
 foreign key(variant_id,business_id,platform) references public.content_variants(id,business_id,platform),
 foreign key(destination_id,business_id,platform) references public.destinations(id,business_id,platform),
 check (status <> 'scheduled' or scheduled_at is not null),
 check (status <> 'published' or (published_at is not null and post_url is not null and final_body is not null))
);

create table public.post_metrics (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 post_id uuid not null,
 measured_at timestamptz not null default now(),
 source text not null default 'manual' check (source in ('manual','api')),
 reach bigint check (reach >= 0),
 impressions bigint check (impressions >= 0),
 views bigint check (views >= 0),
 likes bigint check (likes >= 0),
 comments bigint check (comments >= 0),
 shares bigint check (shares >= 0),
 saves bigint check (saves >= 0),
 clicks bigint check (clicks >= 0),
 inquiries bigint check (inquiries >= 0),
 qualified_leads bigint check (qualified_leads >= 0),
 booked_calls bigint check (booked_calls >= 0),
 orders bigint check (orders >= 0),
 revenue numeric(14,2) check (revenue >= 0),
 spend numeric(14,2) check (spend >= 0),
 currency text not null default 'BDT' check (currency ~ '^[A-Z]{3}$'),
 attribution_notes text,
 notes text,
 unique(post_id,measured_at),
 foreign key(post_id,business_id) references public.posts(id,business_id)
);
comment on table public.post_metrics is
 'Cumulative totals as of measured_at. Keep unavailable values NULL. Do not sum snapshots of the same post.';

create index destinations_business_idx on public.destinations(business_id);
create index contents_business_status_idx on public.contents(business_id,status);
create index variants_content_idx on public.content_variants(content_id,business_id);
create index variants_business_idx on public.content_variants(business_id);
create index assets_content_idx on public.assets(content_id,business_id);
create index assets_business_idx on public.assets(business_id);
create index posts_calendar_idx on public.posts(business_id,status,scheduled_at);
create index posts_destination_idx on public.posts(destination_id,business_id,platform);
create index posts_variant_idx on public.posts(variant_id,business_id,platform);
create index metrics_business_idx on public.post_metrics(business_id);
create index metrics_latest_idx on public.post_metrics(post_id,measured_at desc);

create function public.content_hub_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
 foreach t in array array['contents','content_variants','posts'] loop
 execute format('create trigger set_updated_at before update on public.%I for each row execute function public.content_hub_set_updated_at()',t);
 end loop;
end $$;

alter table public.businesses enable row level security;
create policy business_owner on public.businesses for all to authenticated
 using(owner_id = (select auth.uid()))
 with check(owner_id = (select auth.uid()));

do $$
declare t text;
begin
 foreach t in array array['destinations','contents','content_variants','assets','posts','post_metrics'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format(
 'create policy business_owner on public.%I for all to authenticated
 using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
 with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))',t);
 end loop;
 foreach t in array array['businesses','destinations','contents','content_variants','assets','posts','post_metrics'] loop
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select, insert, update, delete on public.%I to authenticated',t);
 end loop;
end $$;

-- Private bucket is created in the Dashboard in Step 4.
-- File path: BUSINESS_UUID/CONTENT_UUID/unique-file-name.jpg
create policy content_hub_media_owner on storage.objects
 for all to authenticated
 using (
 bucket_id = 'content-media' and exists (
 select 1 from public.businesses b
 where b.id::text = (storage.foldername(name))[1]
 and b.owner_id = (select auth.uid())
 ))
 with check (
 bucket_id = 'content-media' and exists (
 select 1 from public.businesses b
 where b.id::text = (storage.foldername(name))[1]
 and b.owner_id = (select auth.uid())
 ));

commit;

