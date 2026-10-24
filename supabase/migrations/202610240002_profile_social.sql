begin;
create table public.profile_comments(
 id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.profiles on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,parent_id uuid references public.profile_comments on delete cascade,
 body text not null check(length(body)<=4000),deleted boolean not null default false,created_at timestamptz not null default now());
create index profile_comments_page on public.profile_comments(profile_id,created_at);
create index profile_comments_author on public.profile_comments(user_id,created_at desc);
create table public.profile_stats(profile_id uuid primary key references public.profiles on delete cascade,views bigint not null default 0);
create table rbc_private.profile_views(profile_id uuid references public.profiles on delete cascade,visitor text not null,day date not null default current_date,primary key(profile_id,visitor,day));
alter table public.profile_comments enable row level security;
alter table public.profile_stats enable row level security;
alter table rbc_private.profile_views enable row level security;
revoke all on public.profile_comments,public.profile_stats from public,anon,authenticated;
revoke all on rbc_private.profile_views from public,anon,authenticated;
create policy profile_comments_read on public.profile_comments for select to anon,authenticated using(true);
create policy profile_stats_read on public.profile_stats for select to anon,authenticated using(true);
grant select on public.profile_comments,public.profile_stats to anon,authenticated;
create trigger profile_comments_ban before insert on public.profile_comments for each row execute function rbc_private.check_publishing();
create function public.rbc_profile_stats(p_id uuid,p_visitor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$ declare added integer;v bigint;begin
 if not exists(select 1 from public.profiles where id=p_id) then raise exception 'El perfil no existe';end if;
 insert into public.profile_stats(profile_id) values(p_id) on conflict do nothing;
 if p_visitor is not null and auth.uid() is distinct from p_id then
 insert into rbc_private.profile_views(profile_id,visitor) values(p_id,encode(extensions.digest(coalesce(auth.uid()::text,p_visitor::text),'sha256'),'hex')) on conflict do nothing;
 get diagnostics added=row_count;if added=1 then update public.profile_stats set views=views+1 where profile_id=p_id;end if;end if;
 select views into v from public.profile_stats where profile_id=p_id;return jsonb_build_object('views',v);end $$;
create function public.rbc_add_profile_comment(p_id uuid,p_body text,p_parent uuid default null) returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid;begin
 if auth.uid() is null then raise exception 'Inicia sesión para comentar';end if;
 if length(trim(p_body)) not between 1 and 4000 then raise exception 'Escribe entre 1 y 4000 caracteres';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.profile_comments where user_id=auth.uid() and created_at>now()-interval '5 seconds') or (select count(*) from public.profile_comments where user_id=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Espera un momento antes de volver a comentar';end if;
 if p_parent is not null and not exists(select 1 from public.profile_comments where id=p_parent and profile_id=p_id and parent_id is null and not deleted) then raise exception 'No se puede responder a este comentario';end if;
 insert into public.profile_comments(profile_id,user_id,parent_id,body) values(p_id,auth.uid(),p_parent,trim(p_body)) returning id into result;return result;end $$;
create function public.rbc_delete_profile_comment(p_comment uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 update public.profile_comments set body='',deleted=true where id=p_comment and (user_id=auth.uid() or profile_id=auth.uid() or public.rbc_is_admin());
 if not found then raise exception 'Sin permiso para eliminar el comentario';end if;end $$;
revoke all on function public.rbc_profile_stats(uuid,uuid),public.rbc_add_profile_comment(uuid,text,uuid),public.rbc_delete_profile_comment(uuid) from public,anon,authenticated;
grant execute on function public.rbc_profile_stats(uuid,uuid) to anon,authenticated;
grant execute on function public.rbc_add_profile_comment(uuid,text,uuid),public.rbc_delete_profile_comment(uuid) to authenticated;
create function public.rbc_admin_profile_comments(p_query text default '',p_offset integer default 0) returns table(id uuid,label text,username text,created_at timestamptz) language plpgsql stable security definer set search_path='' as $$ begin
 if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
 return query select c.id,c.body,u.username,c.created_at from public.profile_comments c join public.profiles u on u.id=c.user_id where not c.deleted and (c.body ilike '%'||left(trim(p_query),120)||'%' or u.username ilike '%'||left(trim(p_query),120)||'%') order by c.created_at desc limit 40 offset greatest(0,least(p_offset,10000));end $$;
create function public.rbc_admin_delete_profile_comment(p_comment uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
 if length(trim(p_reason)) not between 1 and 500 then raise exception 'Indica el motivo de moderación';end if;
 update public.profile_comments set body='',deleted=true where id=p_comment;if not found then raise exception 'El comentario no existe';end if;
 insert into rbc_private.moderation_log(admin_id,action,target_id,reason) values(auth.uid(),'remove_profile_comment',p_comment,trim(p_reason));end $$;
revoke all on function public.rbc_admin_profile_comments(text,integer),public.rbc_admin_delete_profile_comment(uuid,text) from public,anon,authenticated;
grant execute on function public.rbc_admin_profile_comments(text,integer),public.rbc_admin_delete_profile_comment(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
