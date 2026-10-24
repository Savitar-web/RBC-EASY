begin;
insert into auth.users(id,email,raw_user_meta_data) values ('11111111-aaaa-4000-8000-111111111111','owner-test@example.invalid','{"username":"rbc_owner_test"}'),('22222222-aaaa-4000-8000-222222222222','reader-test@example.invalid','{"username":"rbc_reader_test"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-aaaa-4000-8000-111111111111',true);
do $$ declare p public.publications;v jsonb;begin
p:=public.rbc_save_publication(null,'Prueba social','',array[]::text[],'{"nodes":[{"id":"one","name":"Hoja","type":"file","parentId":null,"content":"[BC]Rol de prueba","order":0}],"images":[]}',true,false,false,true,0);
perform set_config('rbc.test.id',p.id::text,true);
v:=public.rbc_role_stats(p.id,'aaaaaaaa-aaaa-4000-8000-aaaaaaaaaaaa');v:=public.rbc_role_stats(p.id,'aaaaaaaa-aaaa-4000-8000-aaaaaaaaaaaa');if (v->>'views')::int<>1 then raise exception 'Duplicate view count';end if;
perform public.rbc_toggle_like(p.id);if public.rbc_like_count(p.id)<>1 then raise exception 'Like count failed';end if;
perform set_config('rbc.test.comment',public.rbc_add_comment(p.id,'Comentario del autor',null)::text,true);
end $$;
select set_config('request.jwt.claim.sub','22222222-aaaa-4000-8000-222222222222',true);
do $$declare pid uuid:=current_setting('rbc.test.id')::uuid;begin
perform public.rbc_add_comment(pid,'Respuesta del lector',current_setting('rbc.test.comment')::uuid);
perform public.rbc_toggle_like(pid);if public.rbc_like_count(pid)<>2 then raise exception 'Total likes incorrect';end if;
begin perform public.rbc_delete_comment(current_setting('rbc.test.comment')::uuid);raise exception 'Reader deleted owner comment';exception when others then if sqlerrm='Reader deleted owner comment' then raise;end if;end;
begin perform public.rbc_delete_publication(pid);raise exception 'Non-owner deleted role';exception when others then if sqlerrm='Non-owner deleted role' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-aaaa-4000-8000-111111111111',true);
select public.rbc_comments_enabled(current_setting('rbc.test.id')::uuid,false);
select set_config('request.jwt.claim.sub','22222222-aaaa-4000-8000-222222222222',true);
do $$begin begin perform public.rbc_add_comment(current_setting('rbc.test.id')::uuid,'No autorizado',null);raise exception 'Closed comments accepted new comment';exception when others then if sqlerrm='Closed comments accepted new comment' then raise;end if;end;end $$;
reset role;
rollback;
select 'PASS: view deduplication, aggregate likes, comments/replies, author moderation and deletion isolation; all fixtures rolled back' as result;
