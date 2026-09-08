-- 04 | Run after 03. Tests are rolled back; no permanent changes.
begin;
-- Set an existing owner's identity, then switch to the normal app-user role.
select set_config('request.jwt.claim.sub',
 (select owner_id::text from public.businesses where kind='ecom' limit 1),true);
set local role authenticated;
do $$
declare b uuid; c uuid; other_b uuid;
begin
 if (select count(*) from public.businesses) <> 2 then
 raise exception 'Owner access failed: expected 2 businesses.'; end if;
 select id into b from public.businesses where kind='ecom';
 select id into other_b from public.businesses where kind='agency';
 insert into public.contents(business_id,title) values(b,'temporary-access-test') returning id into c;
 update public.contents set status='draft' where id=c;
 if not exists(select 1 from public.contents where id=c and status='draft') then
 raise exception 'Owner update failed.'; end if;
 begin
 insert into public.content_variants(business_id,content_id,platform) values(other_b,c,'facebook');
 raise exception 'FAIL: cross-business content link was accepted.';
 exception when foreign_key_violation then null;
 end;
 delete from public.contents where id=c;
end $$;
reset role;
-- A different signed-in user must see no business data and cannot inject content.
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-ffffffffffff',true);
set local role authenticated;
do $$
declare t text; n bigint;
begin
 foreach t in array array['businesses','destinations','contents','content_variants','assets','posts','post_metrics'] loop
 execute format('select count(*) from public.%I',t) into n;
 if n <> 0 then raise exception 'RLS failed on %',t; end if;
 end loop;
 begin
 insert into public.contents(business_id,title)
 values('ffffffff-ffff-4fff-8fff-ffffffffffff','unauthorized');
 raise exception 'FAIL: unauthorized insert was accepted.';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;

select 'PASS: owner CRUD, business isolation, and stranger access checks' as result;
select id,public from storage.buckets where id='content-media';
-- Second result must show content-media / false.

