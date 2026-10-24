begin;
create table rbc_private.admin_access_events(
 id uuid primary key default gen_random_uuid(),window_start timestamptz not null default date_trunc('minute',now()),
 identity text not null,user_id uuid,username text,email text,ip text,country text,region text,city text,device text,
 first_at timestamptz not null default now(),last_at timestamptz not null default now(),attempts integer not null default 1,
 unique(identity,window_start));
create index admin_access_retention on rbc_private.admin_access_events(last_at desc);
alter table rbc_private.admin_access_events enable row level security;
revoke all on rbc_private.admin_access_events from public,anon,authenticated;
create function public.rbc_record_admin_denial(p_user uuid,p_username text,p_email text,p_ip text,p_country text,p_region text,p_city text,p_device text) returns boolean language plpgsql security definer set search_path='' as $$ declare identity_key text;counted integer;begin
if coalesce(auth.role(),'')<>'service_role' then raise exception 'Registro exclusivo del servidor';end if;
identity_key:=encode(extensions.digest(coalesce(p_ip,'unknown')||':'||coalesce(p_user::text,'anonymous'),'sha256'),'hex');
perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(identity_key,0));
delete from rbc_private.admin_access_events where last_at<now()-interval '30 days';
if (select count(*) from rbc_private.admin_access_events where window_start>now()-interval '1 hour')>=5000 and not exists(select 1 from rbc_private.admin_access_events where identity=identity_key and window_start=date_trunc('minute',now())) then return false;end if;
insert into rbc_private.admin_access_events(identity,user_id,username,email,ip,country,region,city,device)
values(identity_key,p_user,left(p_username,80),left(p_email,254),left(p_ip,64),left(p_country,80),left(p_region,120),left(p_city,120),left(p_device,400))
on conflict(identity,window_start) do update set attempts=rbc_private.admin_access_events.attempts+1,last_at=now() returning attempts into counted;
return counted<=12;end $$;
revoke all on function public.rbc_record_admin_denial(uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.rbc_record_admin_denial(uuid,text,text,text,text,text,text,text) to service_role;
create function public.rbc_admin_access_events(p_query text default '',p_offset integer default 0) returns table(id uuid,user_id uuid,username text,email text,ip text,country text,region text,city text,device text,first_at timestamptz,last_at timestamptz,attempts integer) language plpgsql stable security definer set search_path='' as $$ begin
if not public.rbc_is_admin() then raise exception 'Acceso restringido';end if;
return query select e.id,e.user_id,e.username,e.email,e.ip,e.country,e.region,e.city,e.device,e.first_at,e.last_at,e.attempts from rbc_private.admin_access_events e where e.last_at>=now()-interval '30 days' and (length(trim(p_query))=0 or coalesce(e.username,'') ilike '%'||left(trim(p_query),120)||'%' or coalesce(e.email,'') ilike '%'||left(trim(p_query),120)||'%' or coalesce(e.ip,'') ilike '%'||left(trim(p_query),120)||'%') order by e.last_at desc limit 40 offset greatest(0,least(10000,p_offset));end $$;
revoke all on function public.rbc_admin_access_events(text,integer) from public,anon;
grant execute on function public.rbc_admin_access_events(text,integer) to authenticated;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('rbc-admin-audit-retention','0 * * * *',$job$delete from rbc_private.admin_access_events where last_at<now()-interval '30 days'$job$);
notify pgrst,'reload schema';
commit;
