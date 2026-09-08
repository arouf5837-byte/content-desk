-- Content Desk: encrypted social credentials.
-- Run once in Supabase SQL Editor, after 01-schema.sql. No real tokens belong in this file.
begin;
create extension if not exists supabase_vault cascade;
create schema if not exists content_hub_private;
revoke all on schema content_hub_private from public, anon, authenticated, service_role;
-- Secrets must never be directly exposed to browser roles.
revoke usage on schema vault from public, anon, authenticated;

create table content_hub_private.social_credentials (
 id uuid primary key default gen_random_uuid(),
 destination_id uuid not null references public.destinations(id),
 credential_key text not null check(credential_key ~ '^[a-z][a-z0-9_]{0,63}$'),
 label text not null check(length(label) between 1 and 100),
 vault_secret_id uuid not null unique,
 expires_at timestamptz,
 scopes text[] not null default '{}',
 updated_at timestamptz not null default now(),
 unique(destination_id,credential_key)
);
alter table content_hub_private.social_credentials enable row level security;
revoke all on content_hub_private.social_credentials from public,anon,authenticated,service_role;

create function public.list_social_credentials(p_destination_id uuid)
returns table(id uuid,credential_key text,label text,expires_at timestamptz,scopes text[],updated_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(
 select 1 from public.destinations d join public.businesses b on b.id=d.business_id
 where d.id=p_destination_id and b.owner_id=auth.uid()
 ) then raise exception using errcode='42501',message='Account access denied'; end if;
 return query select c.id,c.credential_key,c.label,c.expires_at,c.scopes,c.updated_at
 from content_hub_private.social_credentials c where c.destination_id=p_destination_id
 order by c.credential_key;
end $$;

create function public.save_social_credential(
 p_destination_id uuid,p_credential_key text,p_label text,p_value text,
 p_expires_at timestamptz default null,p_scopes text[] default '{}')
returns uuid language plpgsql security definer set search_path='' as $$
declare existing_id uuid; secret_id uuid; result_id uuid;
begin
 if auth.uid() is null or not exists(
 select 1 from public.destinations d join public.businesses b on b.id=d.business_id
 where d.id=p_destination_id and b.owner_id=auth.uid()
 ) then raise exception using errcode='42501',message='Account access denied'; end if;
 if p_credential_key is null or p_credential_key !~ '^[a-z][a-z0-9_]{0,63}$'
 or p_label is null or length(trim(p_label)) not between 1 and 100
 or (p_value is not null and length(p_value)>65536)
 or coalesce(cardinality(p_scopes),0)>100 then
 raise exception using errcode='22023',message='Invalid credential details'; end if;
 -- Serialize updates to the same destination/key. Never put a value in a lock key or error.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_destination_id::text||':'||p_credential_key,0));
 select c.id,c.vault_secret_id into existing_id,secret_id
 from content_hub_private.social_credentials c
 where c.destination_id=p_destination_id and c.credential_key=p_credential_key;
 if existing_id is null then
 if p_value is null or length(trim(p_value))=0 then
 raise exception using errcode='22023',message='A value is required'; end if;
 select vault.create_secret(p_value,'content-desk:'||p_destination_id::text||':'||p_credential_key,'Content Desk account credential') into secret_id;
 insert into content_hub_private.social_credentials(destination_id,credential_key,label,vault_secret_id,expires_at,scopes)
 values(p_destination_id,p_credential_key,trim(p_label),secret_id,p_expires_at,coalesce(p_scopes,'{}'))
 returning id into result_id;
 else
 -- NULL keeps the saved value, allowing expiry/scopes-only updates.
 if p_value is not null then
 if length(trim(p_value))=0 then raise exception using errcode='22023',message='A value cannot be empty'; end if;
 perform vault.update_secret(secret_id,p_value);
 end if;
 update content_hub_private.social_credentials c
 set label=trim(p_label),expires_at=p_expires_at,scopes=coalesce(p_scopes,'{}'),updated_at=now()
 where c.id=existing_id;
 result_id:=existing_id;
 end if;
 return result_id;
end $$;

create function public.remove_social_credential(p_credential_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare secret_id uuid; dest uuid; key_name text;
begin
 select c.destination_id,c.credential_key into dest,key_name
 from content_hub_private.social_credentials c join public.destinations d on d.id=c.destination_id
 join public.businesses b on b.id=d.business_id where c.id=p_credential_id and b.owner_id=auth.uid();
 if auth.uid() is null or dest is null then raise exception using errcode='42501',message='Account access denied'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(dest::text||':'||key_name,0));
 delete from content_hub_private.social_credentials c where c.id=p_credential_id returning c.vault_secret_id into secret_id;
 if secret_id is not null then delete from vault.secrets where id=secret_id; end if;
end $$;

-- Future automation calls this server-side only. Never use a service-role key in a browser.
create function public.read_social_credentials_for_automation(p_destination_id uuid,p_owner_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if (select auth.role()) is distinct from 'service_role' then
 raise exception using errcode='42501',message='Server access required'; end if;
 if not exists(select 1 from public.destinations d join public.businesses b on b.id=d.business_id
 where d.id=p_destination_id and b.owner_id=p_owner_id and d.active) then
 raise exception using errcode='42501',message='Active account not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'key',c.credential_key,'value',v.decrypted_secret,'expires_at',c.expires_at,'scopes',c.scopes,
 'expired',coalesce(c.expires_at<=now(),false))),'[]'::jsonb)
 into result from content_hub_private.social_credentials c
 join vault.decrypted_secrets v on v.id=c.vault_secret_id where c.destination_id=p_destination_id;
 return result;
end $$;

revoke all on function public.list_social_credentials(uuid) from public,anon,authenticated,service_role;
revoke all on function public.save_social_credential(uuid,text,text,text,timestamptz,text[]) from public,anon,authenticated,service_role;
revoke all on function public.remove_social_credential(uuid) from public,anon,authenticated,service_role;
revoke all on function public.read_social_credentials_for_automation(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_social_credentials(uuid) to authenticated;
grant execute on function public.save_social_credential(uuid,text,text,text,timestamptz,text[]) to authenticated;
grant execute on function public.remove_social_credential(uuid) to authenticated;
grant execute on function public.read_social_credentials_for_automation(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;

