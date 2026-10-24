begin;
alter table public.publications add column comments_enabled boolean not null default true;
create table public.publication_stats(publication_id uuid primary key references public.publications on delete cascade,views bigint not null default 0);
create table public.publication_likes(publication_id uuid references public.publications on delete cascade,user_id uuid references auth.users on delete cascade,created_at timestamptz not null default now(),primary key(publication_id,user_id));
create table public.publication_comments(id uuid primary key default gen_random_uuid(),publication_id uuid not null references public.publications on delete cascade,user_id uuid not null references public.profiles on delete cascade,parent_id uuid references public.publication_comments on delete cascade,body text not null check(length(body)<=4000),deleted boolean not null default false,created_at timestamptz not null default now());
create index publication_comments_page on public.publication_comments(publication_id,created_at);
create table rbc_private.publication_views(publication_id uuid references public.publications on delete cascade,visitor text,day date default current_date,primary key(publication_id,visitor,day));
create table public.terms_acceptances(user_id uuid primary key references auth.users on delete cascade,version text not null,accepted_at timestamptz not null default now());
alter table public.publication_stats enable row level security;
alter table public.publication_likes enable row level security;
alter table public.publication_comments enable row level security;
alter table public.terms_acceptances enable row level security;
alter table rbc_private.publication_views enable row level security;
revoke all on public.publication_stats,public.publication_likes,public.publication_comments,public.terms_acceptances from anon,authenticated;
create policy stats_read on public.publication_stats for select to anon,authenticated using(public.rbc_access(publication_id,'read'));
create policy likes_own on public.publication_likes for select to authenticated using(user_id=auth.uid() and public.rbc_access(publication_id,'read'));
create policy comments_read on public.publication_comments for select to anon,authenticated using(public.rbc_access(publication_id,'read'));
create policy terms_own on public.terms_acceptances for select to authenticated using(user_id=auth.uid());
grant select on public.publication_stats,public.publication_comments to anon,authenticated;
grant select on public.publication_likes,public.terms_acceptances to authenticated;
create function public.rbc_accept_terms(p_version text) returns void language plpgsql security definer set search_path='' as $$ begin
if auth.uid() is null or p_version<>'2026-10-23' then raise exception 'Aceptación no válida';end if;
insert into public.terms_acceptances(user_id,version) values(auth.uid(),p_version) on conflict(user_id) do update set version=excluded.version,accepted_at=now();end $$;
create function rbc_private.registration_terms() returns trigger language plpgsql security definer set search_path='' as $$ begin
if new.raw_user_meta_data->>'terms_version'='2026-10-23' then insert into public.terms_acceptances(user_id,version) values(new.id,'2026-10-23') on conflict do nothing;end if;return new;end $$;
create trigger registration_terms after insert on auth.users for each row execute function rbc_private.registration_terms();
create function public.rbc_role_stats(p_id uuid,p_visitor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$ declare added integer; v bigint; l bigint;begin
if not public.rbc_access(p_id,'read') then raise exception 'Sin permiso de lectura';end if;
insert into public.publication_stats(publication_id) values(p_id) on conflict do nothing;
if p_visitor is not null then
insert into rbc_private.publication_views(publication_id,visitor) values(p_id,encode(extensions.digest(coalesce(auth.uid()::text,p_visitor::text),'sha256'),'hex')) on conflict do nothing;
get diagnostics added=row_count;
if added=1 then update public.publication_stats set views=views+1 where publication_id=p_id;end if;
end if;
select views into v from public.publication_stats where publication_id=p_id;
select count(*) into l from public.publication_likes where publication_id=p_id;
return jsonb_build_object('views',v,'likes',l,'liked',exists(select 1 from public.publication_likes where publication_id=p_id and user_id=auth.uid()));end $$;
create function public.rbc_toggle_like(p_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
if auth.uid() is null or not public.rbc_access(p_id,'read') then raise exception 'Inicia sesión y abre un rol al que tengas acceso';end if;
perform pg_advisory_xact_lock(hashtext(p_id::text||auth.uid()::text));
if exists(select 1 from public.publication_likes where publication_id=p_id and user_id=auth.uid()) then delete from public.publication_likes where publication_id=p_id and user_id=auth.uid();else insert into public.publication_likes(publication_id,user_id) values(p_id,auth.uid());end if;end $$;
create function public.rbc_add_comment(p_id uuid,p_body text,p_parent uuid default null) returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid;begin
if auth.uid() is null or not public.rbc_access(p_id,'read') then raise exception 'Inicia sesión para comentar';end if;
perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
if not exists(select 1 from public.publications where id=p_id and comments_enabled) then raise exception 'El autor deshabilitó los comentarios';end if;
if length(trim(p_body))<1 or length(p_body)>4000 then raise exception 'Escribe entre 1 y 4000 caracteres';end if;
if (select count(*) from public.publication_comments where user_id=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Espera antes de enviar más comentarios';end if;
if p_parent is not null and not exists(select 1 from public.publication_comments where id=p_parent and publication_id=p_id and not deleted and parent_id is null) then raise exception 'Responde a un comentario principal de este rol';end if;
insert into public.publication_comments(publication_id,user_id,parent_id,body) values(p_id,auth.uid(),p_parent,trim(p_body)) returning id into result;return result;end $$;
create function public.rbc_delete_comment(p_comment uuid) returns void language plpgsql security definer set search_path='' as $$ begin
if auth.uid() is null then raise exception 'Inicia sesión';end if;
update public.publication_comments c set body='',deleted=true where c.id=p_comment and (c.user_id=auth.uid() or exists(select 1 from public.publications p where p.id=c.publication_id and p.owner_id=auth.uid()));
if not found then raise exception 'No puedes eliminar este comentario';end if;end $$;
create function public.rbc_comments_enabled(p_id uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$ begin
update public.publications set comments_enabled=p_enabled where id=p_id and owner_id=auth.uid();if not found then raise exception 'Sólo el autor puede cambiar los comentarios';end if;end $$;
create function public.rbc_delete_publication(p_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
if not exists(select 1 from public.publications where id=p_id and owner_id=auth.uid()) then raise exception 'Sólo el autor puede retirar este rol';end if;
delete from public.publications where id=p_id;end $$;
revoke all on function public.rbc_accept_terms(text),public.rbc_toggle_like(uuid),public.rbc_add_comment(uuid,text,uuid),public.rbc_delete_comment(uuid),public.rbc_comments_enabled(uuid,boolean),public.rbc_delete_publication(uuid) from public,anon;
grant execute on function public.rbc_accept_terms(text),public.rbc_toggle_like(uuid),public.rbc_add_comment(uuid,text,uuid),public.rbc_delete_comment(uuid),public.rbc_comments_enabled(uuid,boolean),public.rbc_delete_publication(uuid) to authenticated;
revoke all on function public.rbc_role_stats(uuid,uuid) from public;
grant execute on function public.rbc_role_stats(uuid,uuid) to anon,authenticated;
revoke all on function rbc_private.registration_terms() from public,anon,authenticated;
drop function public.rbc_explore(text,boolean,integer);
create function public.rbc_explore(p_query text default '',p_mine boolean default false,p_offset integer default 0)
returns table(id uuid,title text,description text,tags text[],owner_id uuid,updated_at timestamptz,read_public boolean,copy_public boolean,edit_public boolean,profiles jsonb,views bigint,likes bigint)
language sql stable security invoker set search_path='' as $$
select p.id,p.title,p.description,p.tags,p.owner_id,p.updated_at,p.read_public,p.copy_public,p.edit_public,jsonb_build_object('username',u.username,'avatar_path',u.avatar_path),coalesce(s.views,0),(select count(*) from public.publication_likes k where k.publication_id=p.id)
from public.publications p join public.profiles u on u.id=p.owner_id left join public.publication_stats s on s.publication_id=p.id
where ((p_mine and p.owner_id=auth.uid()) or (not p_mine and p.discoverable and p.read_public))
and (length(trim(p_query))=0 or p.title ilike '%'||left(trim(p_query),120)||'%' or u.username ilike '%'||left(ltrim(trim(p_query),'@'),120)||'%' or array_to_string(p.tags,' ') ilike '%'||left(trim(p_query),120)||'%')
order by p.updated_at desc limit 20 offset greatest(0,least(10000,p_offset));$$;
-- Aggregate likes through a guarded helper; individual likers stay private.
create function public.rbc_like_count(p_id uuid) returns bigint language sql stable security definer set search_path='' as $$ select case when public.rbc_access(p_id,'read') then (select count(*) from public.publication_likes where publication_id=p_id) else 0 end $$;
revoke all on function public.rbc_like_count(uuid) from public;
grant execute on function public.rbc_like_count(uuid) to anon,authenticated;
create or replace function public.rbc_explore(p_query text default '',p_mine boolean default false,p_offset integer default 0)
returns table(id uuid,title text,description text,tags text[],owner_id uuid,updated_at timestamptz,read_public boolean,copy_public boolean,edit_public boolean,profiles jsonb,views bigint,likes bigint)
language sql stable security invoker set search_path='' as $$ select p.id,p.title,p.description,p.tags,p.owner_id,p.updated_at,p.read_public,p.copy_public,p.edit_public,jsonb_build_object('username',u.username,'avatar_path',u.avatar_path),coalesce(s.views,0),public.rbc_like_count(p.id)
from public.publications p join public.profiles u on u.id=p.owner_id left join public.publication_stats s on s.publication_id=p.id
where ((p_mine and p.owner_id=auth.uid()) or (not p_mine and p.discoverable and p.read_public)) and (length(trim(p_query))=0 or p.title ilike '%'||left(trim(p_query),120)||'%' or u.username ilike '%'||left(ltrim(trim(p_query),'@'),120)||'%' or array_to_string(p.tags,' ') ilike '%'||left(trim(p_query),120)||'%') order by p.updated_at desc limit 20 offset greatest(0,least(10000,p_offset));$$;
revoke all on function public.rbc_explore(text,boolean,integer) from public;
grant execute on function public.rbc_explore(text,boolean,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
