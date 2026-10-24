begin;
insert into auth.users(id,email,raw_user_meta_data) values
('11111111-aaaa-4000-8000-111111111111','rbc-test-owner@example.invalid','{"username":"rbc_test_owner"}'),
('22222222-aaaa-4000-8000-222222222222','rbc-test-reader@example.invalid','{"username":"rbc_test_reader"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-aaaa-4000-8000-111111111111',true);
do $$ declare p public.publications; begin
p:=public.rbc_save_publication(null,'Prueba privada','',array[]::text[],'{"nodes":[{"id":"one","name":"Prueba","type":"file","parentId":null,"content":"Texto privado","order":0}],"images":[]}',false,false,false,false,0);
perform set_config('rbc.test.id',p.id::text,true);
perform set_config('rbc.test.code',public.rbc_rotate_code(p.id,'read'),true);
if not public.rbc_access(p.id,'edit') then raise exception 'Owner access failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-aaaa-4000-8000-222222222222',true);
do $$ declare pid uuid:=current_setting('rbc.test.id')::uuid; result jsonb; begin
if exists(select 1 from public.publications where id=pid) then raise exception 'PRIVATE READ LEAK';end if;
result:=public.rbc_redeem_code(current_setting('rbc.test.code'));
if result ? 'error' then raise exception 'Redeem failed: %',result;end if;
if not public.rbc_access(pid,'read') then raise exception 'Read code failed';end if;
if public.rbc_access(pid,'copy') or public.rbc_access(pid,'edit') then raise exception 'SCOPE ESCALATION';end if;
begin perform public.rbc_edit_publication(pid,'{"nodes":[],"images":[]}',1);raise exception 'EDIT LEAK';exception when others then if sqlerrm='EDIT LEAK' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-aaaa-4000-8000-111111111111',true);
select public.rbc_rotate_code(current_setting('rbc.test.id')::uuid,'read') is not null as rotation_ok;
select set_config('request.jwt.claim.sub','22222222-aaaa-4000-8000-222222222222',true);
do $$ begin if public.rbc_access(current_setting('rbc.test.id')::uuid,'read') then raise exception 'REVOKED CODE STILL WORKS';end if;end $$;
reset role;
rollback;
select 'PASS: private RLS, owner, read code, copy/edit isolation and revocation; test data rolled back' as result;
