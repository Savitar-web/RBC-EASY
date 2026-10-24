begin;
do $$ declare a uuid;blocked boolean:=false;ok boolean;n integer;begin
select user_id into a from rbc_private.administrators limit 1;
if a is null then raise exception 'Missing administrator';end if;
if has_table_privilege('anon','rbc_private.admin_access_events','select') or has_table_privilege('authenticated','rbc_private.admin_access_events','select') or has_function_privilege('anon','public.rbc_admin_access_events(text,integer)','execute') or has_function_privilege('authenticated','public.rbc_record_admin_denial(uuid,text,text,text,text,text,text,text)','execute') then raise exception 'Excessive privileges';end if;
perform set_config('request.jwt.claim.role','service_role',true);
for n in 1..13 loop
ok:=public.rbc_record_admin_denial(null,null,null,'192.0.2.123','TEST',null,null,'Transactional verification');
if ok<>(n<=12) then raise exception 'Rate limit failure';end if;
end loop;
if (select count(*) from rbc_private.admin_access_events where ip='192.0.2.123')<>1 then raise exception 'Deduplication failure';end if;
perform set_config('request.jwt.claim.role','authenticated',true);
perform set_config('request.jwt.claim.sub','',true);
begin perform public.rbc_admin_access_events('',0);exception when raise_exception then if SQLERRM='Acceso restringido' then blocked:=true;else raise;end if;end;
if not blocked then raise exception 'Guest could read audit';end if;
perform set_config('request.jwt.claim.sub',a::text,true);
if not exists(select 1 from public.rbc_admin_access_events('192.0.2.123',0) where attempts=13 and email is null) then raise exception 'Admin view failed';end if;
if not exists(select 1 from cron.job where jobname='rbc-admin-audit-retention' and active) then raise exception 'Retention job inactive';end if;
end $$;
rollback;
select 'PASS: permisos, administrador exclusivo, deduplicacion, limite de solicitudes y limpieza programada; pruebas revertidas.' as verificacion;
