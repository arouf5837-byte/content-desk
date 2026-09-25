-- Content Desk: 12-reset-ai-automation.sql
-- Run this script in the Supabase SQL Editor if you wish to reset directly in the database.
-- 1. Deletes all post metrics, posts, assets, variants, and contents.
-- 2. Sets the active business to 'AI Automation' (Digital Service).
-- 3. Sets the product to 'Personal Branding' (Digital Service).
-- 4. Archives all other businesses and products.

begin;

-- Step 1: Wipe all content and post records in cascade-safe order
delete from public.post_metrics;
delete from public.posts;
delete from public.assets;
delete from public.content_variants;
delete from public.contents;

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
