-- Content Desk: 13-reset-ai-automation.sql
-- Run this script in the Supabase SQL Editor if you wish to reset directly in the database.
-- 1. Deletes all lead interactions, audience leads, lead magnets, post metrics, posts, assets, variants, and contents.
-- 2. Sets the active business to 'AI Automation' (Digital Service).
-- 3. Sets the product to 'Personal Branding' (Digital Service).
-- 4. Archives all other businesses and products.

begin;

-- Step 1: Wipe all content, posts, lead magnets, and CRM records in cascade-safe order
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'lead_interactions') then
    execute 'delete from public.lead_interactions';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'audience_leads') then
    execute 'delete from public.audience_leads';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'post_metrics') then
    execute 'delete from public.post_metrics';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'posts') then
    execute 'delete from public.posts';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'assets') then
    execute 'delete from public.assets';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'content_variants') then
    execute 'delete from public.content_variants';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'contents') then
    execute 'delete from public.contents';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'lead_magnets') then
    execute 'delete from public.lead_magnets';
  end if;
end $$;

-- Step 2: Configure primary business as 'AI Automation'
-- If a business exists, update the first one; otherwise insert a new one.
do $$
declare
  v_owner_id uuid;
  v_biz_id uuid;
begin
  select owner_id into v_owner_id from public.businesses limit 1;
  if v_owner_id is null then
    select id into v_owner_id from auth.users order by created_at asc limit 1;
  end if;

  if v_owner_id is not null then
    -- Find or create AI Automation business
    select id into v_biz_id from public.businesses where name = 'AI Automation' limit 1;
    if v_biz_id is null then
      select id into v_biz_id from public.businesses where archived_at is null order by created_at asc limit 1;
      if v_biz_id is not null then
        update public.businesses
        set name = 'AI Automation', kind = 'agency', brand_notes = 'AI Automation & Personal Branding Content Hub', archived_at = null
        where id = v_biz_id;
      else
        insert into public.businesses (owner_id, name, kind, brand_notes)
        values (v_owner_id, 'AI Automation', 'agency', 'AI Automation & Personal Branding Content Hub')
        returning id into v_biz_id;
      end if;
    else
      update public.businesses set archived_at = null where id = v_biz_id;
    end if;

    -- Archive any other businesses
    update public.businesses
    set archived_at = now()
    where id <> v_biz_id;

    -- Ensure 'Personal Branding' product exists under AI Automation
    insert into public.products (business_id, name, kind, description)
    values (v_biz_id, 'Personal Branding', 'service', 'AI Automation Agency & Thought Leadership Personal Branding')
    on conflict (business_id, name) do update set archived_at = null, kind = 'service';

    -- Archive other products for this business
    update public.products
    set archived_at = now()
    where business_id = v_biz_id and name <> 'Personal Branding';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
