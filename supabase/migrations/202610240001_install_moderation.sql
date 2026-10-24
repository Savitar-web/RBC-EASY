begin;
create table rbc_private.administrators(user_id uuid primary key references auth.users on delete cascade);
create table rbc_private.bans(user_id uuid primary key references auth.users on delete cascade,reason text not null check(length(reason) between 1 and 500),admin_id uuid not null references auth.users,created_at timestamptz not null default now());
create table rbc_private.moderation_log(id bigint generated always as identity primary key,admin_id uuid not null,action text not null,target_id uuid not null,reason text,created_at timestamptz not null default now());
alter table rbc_private.administrators enable row level security;
alter table rbc_private.bans enable row level security;
alter table rbc_private.moderation_log enable row level security;
revoke all on rbc_private.administrators,rbc_private.bans,rbc_private.moderation_log from public,anon,authenticated;
create function public.rbc_is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from rbc_private.administrators where user_id=auth.uid()) $$;
create function public.rbc_moderation_status() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('admin',public.rbc_is_admin(),'banned',exists(select 1 from rbc_private.bans where user_id=auth.uid()),'reason',(select reason from rbc_private.bans where user_id=auth.uid())) $$;
create function rbc_private.check_publishing() returns trigger language plpgsql security definer set search_path='' as $$ begin
if exists(select 1 from rbc_private.bans where user_id=auth.uid()) then raise exception 'Tu cuenta tiene suspendida la publicación y los comentarios. Tus documentos locales siguen disponibles.';end if;
return new;end $$;
create trigger publications_ban before insert or update on public.publications for each row execute function rbc_private.check_publishing();
create trigger comments_ban before insert on public.publication_comments for each row execute function rbc_private.check_publishing();
-- Uploads are blocked too: a suspended owner cannot fill storage through old drafts.
create policy publication_not_banned on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'publication-images' or not exists(select 1 from public.rbc_moderation_status() s where (s->>'banned')::boolean));
create function public.rbc_admin_users(p_query text default '',p_offset integer default 0) returns table(id uuid,username text,banned boolean,reason text) language plpgsql stable security definer set search_path='' as $$ begin
if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
return query select p.id,p.username,b.user_id is not null,b.reason from public.profiles p left join rbc_private.bans b on b.user_id=p.id where p.username ilike '%'||left(trim(p_query),120)||'%' order by p.username limit 40 offset greatest(0,least(p_offset,10000));end $$;
create function public.rbc_admin_ban(p_user uuid,p_banned boolean,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$ begin
if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
if p_user=auth.uid() or exists(select 1 from rbc_private.administrators where user_id=p_user) then raise exception 'No se puede suspender una cuenta administradora';end if;
if p_banned then insert into rbc_private.bans(user_id,reason,admin_id) values(p_user,left(trim(p_reason),500),auth.uid()) on conflict(user_id) do update set reason=excluded.reason,admin_id=auth.uid(),created_at=now();else delete from rbc_private.bans where user_id=p_user;end if;
insert into rbc_private.moderation_log(admin_id,action,target_id,reason) values(auth.uid(),case when p_banned then 'ban' else 'unban' end,p_user,left(p_reason,500));end $$;
create function public.rbc_admin_content(p_kind text,p_query text default '',p_offset integer default 0) returns table(id uuid,label text,username text,created_at timestamptz) language plpgsql stable security definer set search_path='' as $$ begin
if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
if p_kind='roles' then return query select p.id,p.title,u.username,p.created_at from public.publications p join public.profiles u on u.id=p.owner_id where p.title ilike '%'||left(trim(p_query),120)||'%' or u.username ilike '%'||left(trim(p_query),120)||'%' order by p.created_at desc limit 40 offset greatest(0,least(p_offset,10000));
elsif p_kind='comments' then return query select c.id,c.body,u.username,c.created_at from public.publication_comments c join public.profiles u on u.id=c.user_id where not c.deleted and (c.body ilike '%'||left(trim(p_query),120)||'%' or u.username ilike '%'||left(trim(p_query),120)||'%') order by c.created_at desc limit 40 offset greatest(0,least(p_offset,10000));else raise exception 'Categoría no válida';end if;end $$;
create function public.rbc_admin_remove(p_kind text,p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$ declare prefix text;begin
if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
if length(trim(p_reason))<1 or length(p_reason)>500 then raise exception 'Indica el motivo de moderación';end if;
if p_kind='roles' then
select owner_id::text||'/'||id::text||'/' into prefix from public.publications where id=p_id;
if prefix is null then raise exception 'La publicación ya no existe';end if;
-- Storage files are removed by the authenticated Storage API before the row is deleted.
delete from public.publications where id=p_id;
elsif p_kind='comments' then update public.publication_comments set body='',deleted=true where id=p_id;if not found then raise exception 'El comentario ya no existe';end if;
else raise exception 'Categoría no válida';end if;
insert into rbc_private.moderation_log(admin_id,action,target_id,reason) values(auth.uid(),'remove_'||p_kind,p_id,p_reason);end $$;
create policy admin_image_remove on storage.objects for delete to authenticated using(bucket_id='publication-images' and public.rbc_is_admin());
create function public.rbc_admin_images(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$ begin if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;return coalesce((select jsonb_agg(name) from storage.objects where bucket_id='publication-images' and split_part(name,'/',2)=p_id::text),'[]'::jsonb);end $$;
create policy admin_image_list on storage.objects for select to authenticated using(bucket_id='publication-images' and public.rbc_is_admin());
create or replace function public.rbc_accept_terms(p_version text) returns void language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null or p_version not in ('2026-10-23','2026-10-24') then raise exception 'Aceptación no válida';end if;insert into public.terms_acceptances(user_id,version) values(auth.uid(),p_version) on conflict(user_id) do update set version=excluded.version,accepted_at=now();end $$;
create or replace function rbc_private.registration_terms() returns trigger language plpgsql security definer set search_path='' as $$ begin if new.raw_user_meta_data->>'terms_version'='2026-10-24' then insert into public.terms_acceptances(user_id,version) values(new.id,'2026-10-24') on conflict do nothing;end if;return new;end $$;
revoke all on function public.rbc_is_admin(),public.rbc_moderation_status(),public.rbc_admin_users(text,integer),public.rbc_admin_ban(uuid,boolean,text),public.rbc_admin_content(text,text,integer),public.rbc_admin_remove(text,uuid,text),public.rbc_admin_images(uuid) from public,anon;
grant execute on function public.rbc_is_admin(),public.rbc_moderation_status(),public.rbc_admin_users(text,integer),public.rbc_admin_ban(uuid,boolean,text),public.rbc_admin_content(text,text,integer),public.rbc_admin_remove(text,uuid,text),public.rbc_admin_images(uuid) to authenticated;
revoke all on function rbc_private.check_publishing() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
