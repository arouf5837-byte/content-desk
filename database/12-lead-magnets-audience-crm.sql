-- 12-lead-magnets-audience-crm.sql
-- Non-destructive migration for Lead Magnets, Audience Leads, and Lead Interactions CRM
-- Run once on Supabase to upgrade Content Desk into a Personal Brand & Audience Growth Hub.

begin;

-- 1. Create public.lead_magnets
create table if not exists public.lead_magnets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  slug text not null check (length(trim(slug)) > 0),
  description text,
  type text not null default 'pdf' check (type in (
    'pdf', 'github_repo', 'google_doc', 'notion_doc',
    'checklist', 'prompt_pack', 'template', 'video_demo', 'other'
  )),
  resource_url text check (resource_url is null or resource_url ~ '^https?://'),
  cta_keyword text not null check (length(trim(cta_keyword)) > 0),
  target_audience text,
  funnel_stage text not null default 'awareness' check (funnel_stage in (
    'awareness', 'interest', 'consideration', 'conversion'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'active', 'paused', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id, slug),
  unique(business_id, cta_keyword)
);

-- 2. Add additions to public.contents
alter table public.contents
  add column if not exists comment_prompt text,
  add column if not exists cta_keyword text,
  add column if not exists growth_goal text,
  add column if not exists lead_magnet_id uuid references public.lead_magnets(id) on delete set null;

-- 3. Create public.audience_leads
create table if not exists public.audience_leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  handle text,
  platform text not null default 'linkedin' check (platform in (
    'linkedin', 'instagram', 'x', 'facebook', 'other'
  )),
  profile_url text check (profile_url is null or profile_url ~ '^https?://'),
  email text,
  phone text,
  lead_status text not null default 'new' check (lead_status in (
    'new', 'contacted', 'qualified', 'unqualified', 'converted', 'archived'
  )),
  potential_client boolean not null default false,
  source_post_id uuid references public.posts(id) on delete set null,
  lead_magnet_id uuid references public.lead_magnets(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Create public.lead_interactions
create table if not exists public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid not null references public.audience_leads(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  lead_magnet_id uuid references public.lead_magnets(id) on delete set null,
  channel text not null default 'comment' check (channel in (
    'comment', 'dm', 'email', 'call', 'other'
  )),
  interaction_type text not null default 'keyword_comment' check (interaction_type in (
    'keyword_comment', 'inquiry', 'dm_sent', 'resource_sent', 'call_booked', 'feedback', 'other'
  )),
  keyword_used text,
  resource_sent boolean not null default false,
  resource_sent_at timestamptz,
  follow_up_status text not null default 'needed' check (follow_up_status in (
    'none', 'needed', 'in_progress', 'completed', 'closed'
  )),
  follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Add columns to public.post_metrics
alter table public.post_metrics
  add column if not exists profile_visits bigint check (profile_visits is null or profile_visits >= 0),
  add column if not exists new_followers bigint check (new_followers is null or new_followers >= 0),
  add column if not exists dm_count bigint check (dm_count is null or dm_count >= 0),
  add column if not exists keyword_comments bigint check (keyword_comments is null or keyword_comments >= 0),
  add column if not exists resource_requests bigint check (resource_requests is null or resource_requests >= 0);

-- 6. Create Indexes
create index if not exists lead_magnets_business_idx on public.lead_magnets(business_id);
create index if not exists lead_magnets_status_idx on public.lead_magnets(business_id, status);
create index if not exists lead_magnets_keyword_idx on public.lead_magnets(business_id, cta_keyword);
create index if not exists contents_lead_magnet_idx on public.contents(lead_magnet_id);

create index if not exists audience_leads_business_idx on public.audience_leads(business_id);
create index if not exists audience_leads_status_idx on public.audience_leads(business_id, lead_status);
create index if not exists audience_leads_platform_idx on public.audience_leads(business_id, platform);
create index if not exists audience_leads_magnet_idx on public.audience_leads(lead_magnet_id);
create index if not exists audience_leads_post_idx on public.audience_leads(source_post_id);

create index if not exists lead_interactions_business_idx on public.lead_interactions(business_id);
create index if not exists lead_interactions_lead_idx on public.lead_interactions(lead_id);
create index if not exists lead_interactions_post_idx on public.lead_interactions(post_id);
create index if not exists lead_interactions_magnet_idx on public.lead_interactions(lead_magnet_id);
create index if not exists lead_interactions_follow_up_idx on public.lead_interactions(business_id, follow_up_status);

-- 7. Enable RLS and Configure Policies
alter table public.lead_magnets enable row level security;
alter table public.audience_leads enable row level security;
alter table public.lead_interactions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lead_magnets', 'audience_leads', 'lead_interactions'] loop
    execute format('drop policy if exists business_owner on public.%I', t);
    execute format(
      'create policy business_owner on public.%I for all to authenticated
       using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
       with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))',
      t
    );
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- 8. Add updated_at Triggers
do $$
declare t text;
begin
  foreach t in array array['lead_magnets', 'audience_leads', 'lead_interactions'] loop
    if exists (select 1 from pg_proc where proname = 'content_hub_set_updated_at') then
      execute format('drop trigger if exists set_updated_at on public.%I', t);
      execute format(
        'create trigger set_updated_at before update on public.%I for each row execute function public.content_hub_set_updated_at()',
        t
      );
    end if;
  end loop;
end $$;

commit;

-- 9. Notify PostgREST to reload schema
notify pgrst, 'reload schema';
