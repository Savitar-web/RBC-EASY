begin;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists rbc_private;
revoke all on schema rbc_private from public,anon,authenticated;

create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 username text not null check(username ~ '^[A-Za-z0-9_]{3,24}$'),
 bio text not null default '' check(length(bio)<=300), avatar_path text,
 created_at timestamptz not null default now()
);
create unique index profiles_username_unique on public.profiles(lower(username));
create table public.publications (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 title text not null check(length(title) between 1 and 120), description text not null default '' check(length(description)<=600),
 tags text[] not null default '{}' check(cardinality(tags)<=8),
 body jsonb not null default '{"nodes":[],"images":[]}',
 read_public boolean not null default false, copy_public boolean not null default false, edit_public boolean not null default false,
 discoverable boolean not null default false, revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not(copy_public or edit_public) or read_public), check(not discoverable or read_public)
);
create index publication_explore on public.publications(updated_at desc) where discoverable and read_public;
create table rbc_private.codes(publication_id uuid references public.publications on delete cascade, scope text check(scope in ('read','copy','edit')), hash text not null, primary key(publication_id,scope));
create table public.publication_grants(publication_id uuid references public.publications on delete cascade,user_id uuid references auth.users on delete cascade,scope text check(scope in ('read','copy','edit')),code_hash text,created_at timestamptz default now(),primary key(publication_id,user_id,scope));
create table public.access_requests(id uuid primary key default gen_random_uuid(),publication_id uuid references public.publications on delete cascade,user_id uuid references public.profiles on delete cascade,scope text check(scope in ('read','copy','edit')),status text not null default 'pending' check(status in ('pending','approved','denied')),created_at timestamptz default now(),unique(publication_id,user_id,scope));
create table public.publication_versions(publication_id uuid references public.publications on delete cascade,revision integer,body jsonb not null,editor_id uuid references auth.users on delete set null,created_at timestamptz default now(),primary key(publication_id,revision));
create table rbc_private.attempts(user_id uuid primary key references auth.users on delete cascade,started timestamptz not null,count integer not null);

create function public.rbc_access(p_id uuid,p_scope text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.publications p where p.id=p_id and (
 p.owner_id=auth.uid() or
 case p_scope when 'read' then p.read_public when 'copy' then p.copy_public when 'edit' then p.edit_public and auth.uid() is not null else false end or
 exists(select 1 from public.publication_grants g where g.publication_id=p.id and g.user_id=auth.uid() and (g.scope=p_scope or p_scope='read') and (g.code_hash is null or exists(select 1 from rbc_private.codes c where c.publication_id=g.publication_id and c.scope=g.scope and c.hash=g.code_hash)))))
$$;
create function public.rbc_profile_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,username) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'username',''),'lector_'||substr(replace(new.id::text,'-',''),1,12)));
 return new;
end $$;
create trigger rbc_new_account after insert on auth.users for each row execute function public.rbc_profile_created();

alter table public.profiles enable row level security;
alter table public.publications enable row level security;
alter table public.publication_grants enable row level security;
alter table public.access_requests enable row level security;
alter table public.publication_versions enable row level security;
create policy profiles_read on public.profiles for select using(true);
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and (avatar_path is null or avatar_path like auth.uid()::text||'/%'));
create policy publications_read on public.publications for select using(public.rbc_access(id,'read'));
create policy grants_read on public.publication_grants for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.publications p where p.id=publication_id and p.owner_id=auth.uid()));
create policy requests_read on public.access_requests for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.publications p where p.id=publication_id and p.owner_id=auth.uid()));
create policy versions_read on public.publication_versions for select to authenticated using(exists(select 1 from public.publications p where p.id=publication_id and p.owner_id=auth.uid()));
grant usage on schema public to anon,authenticated;
grant select on public.profiles,public.publications to anon,authenticated;
grant update(username,bio,avatar_path) on public.profiles to authenticated;
grant select on public.access_requests,public.publication_grants,public.publication_versions to authenticated;

create function rbc_private.validate_body(p_body jsonb) returns void language plpgsql set search_path='' as $$
declare n jsonb; img jsonb;
begin
 if p_body is null or jsonb_typeof(p_body->'nodes') is distinct from 'array' or jsonb_typeof(p_body->'images') is distinct from 'array' then raise exception 'Documento inválido'; end if;
 if octet_length(p_body::text)>1500000 or jsonb_array_length(p_body->'nodes')>150 or jsonb_array_length(p_body->'images')>8 then raise exception 'Publicación demasiado grande (150 hojas, 8 imágenes, 1,5 MB de texto)'; end if;
 for n in select value from jsonb_array_elements(p_body->'nodes') loop
 if jsonb_typeof(n->'name') is distinct from 'string' or length(n->>'name')>160 or coalesce(n->>'type','') not in ('file','folder') or jsonb_typeof(n->'id') is distinct from 'string' then raise exception 'Hoja inválida'; end if;
 if n ? 'content' and jsonb_typeof(n->'content') is distinct from 'string' then raise exception 'Texto inválido'; end if;
 end loop;
 for img in select value from jsonb_array_elements(p_body->'images') loop
 if jsonb_typeof(img->'path') is distinct from 'string' or length(img->>'path')>200 or length(coalesce(img->>'alt',''))>300 then raise exception 'Imagen inválida'; end if;
 end loop;
end $$;

create function public.rbc_save_publication(p_id uuid,p_title text,p_description text,p_tags text[],p_body jsonb,p_read boolean,p_copy boolean,p_edit boolean,p_discover boolean,p_revision integer default 0) returns public.publications language plpgsql security definer set search_path='' as $$
declare p public.publications; result public.publications;
begin
 if auth.uid() is null then raise exception 'Inicia sesión'; end if;
 perform rbc_private.validate_body(p_body);
 if p_id is null then
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.publications where owner_id=auth.uid())>=40 then raise exception 'Límite de 40 publicaciones por cuenta'; end if;
 insert into public.publications(owner_id,title,description,tags,body,read_public,copy_public,edit_public,discoverable) values(auth.uid(),trim(p_title),p_description,p_tags,p_body,p_read,p_copy,p_edit,p_discover) returning * into result;
 else
 select * into p from public.publications where id=p_id for update;
 if p.id is null or p.owner_id<>auth.uid() then raise exception 'Sólo el propietario puede cambiar esta publicación'; end if;
 if p.revision<>p_revision then raise exception 'La publicación cambió. Recarga antes de guardar'; end if;
 insert into public.publication_versions values(p.id,p.revision,p.body,auth.uid(),now());
 update public.publications set title=trim(p_title),description=p_description,tags=p_tags,body=p_body,read_public=p_read,copy_public=p_copy,edit_public=p_edit,discoverable=p_discover,revision=revision+1,updated_at=now() where id=p_id returning * into result;
 end if;
 if exists(select 1 from jsonb_array_elements(p_body->'images') i where i->>'path' not like auth.uid()::text||'/'||result.id::text||'/%') then raise exception 'La imagen no pertenece a esta publicación'; end if;
 return result;
end $$;

create function public.rbc_edit_publication(p_id uuid,p_body jsonb,p_revision integer) returns public.publications language plpgsql security definer set search_path='' as $$
declare p public.publications; result public.publications;
begin
 if auth.uid() is null or not public.rbc_access(p_id,'edit') then raise exception 'No tienes permiso de edición'; end if;
 perform rbc_private.validate_body(p_body);
 select * into p from public.publications where id=p_id for update;
 if p.revision<>p_revision then raise exception 'Otra persona guardó cambios. Recarga para evitar sobrescribirlos'; end if;
 if p_body->'images' is distinct from p.body->'images' then raise exception 'Sólo el propietario puede cambiar imágenes'; end if;
 insert into public.publication_versions values(p.id,p.revision,p.body,auth.uid(),now());
 update public.publications set body=p_body,revision=revision+1,updated_at=now() where id=p_id returning * into result;
 return result;
end $$;

create function public.rbc_rotate_code(p_id uuid,p_scope text) returns text language plpgsql security definer set search_path='' as $$
declare token text; digest text;
begin
 if p_scope not in ('read','copy','edit') or not exists(select 1 from public.publications where id=p_id and owner_id=auth.uid()) then raise exception 'No autorizado'; end if;
 token:=encode(extensions.gen_random_bytes(18),'hex'); digest:=encode(extensions.digest(token,'sha256'),'hex');
 insert into rbc_private.codes values(p_id,p_scope,digest) on conflict(publication_id,scope) do update set hash=excluded.hash;
 delete from public.publication_grants where publication_id=p_id and scope=p_scope and code_hash is not null;
 return p_id::text||'.'||p_scope||'.'||token;
end $$;

create function public.rbc_redeem_code(p_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid; permission text; token text; digest text; tries integer;
begin
 if auth.uid() is null then raise exception 'Inicia sesión para usar un código'; end if;
 insert into rbc_private.attempts values(auth.uid(),now(),1) on conflict(user_id) do update set count=case when rbc_private.attempts.started<now()-interval '10 minutes' then 1 else rbc_private.attempts.count+1 end,started=case when rbc_private.attempts.started<now()-interval '10 minutes' then now() else rbc_private.attempts.started end returning count into tries;
 if tries>20 then return jsonb_build_object('error','Demasiados intentos. Espera diez minutos'); end if;
 if p_code !~ '^[a-f0-9-]{36}\.(read|copy|edit)\.[a-f0-9]{36}$' then return jsonb_build_object('error','Código inválido o revocado'); end if;
 begin pid:=split_part(p_code,'.',1)::uuid; exception when invalid_text_representation then return jsonb_build_object('error','Código inválido'); end;
 permission:=split_part(p_code,'.',2); token:=split_part(p_code,'.',3); digest:=encode(extensions.digest(token,'sha256'),'hex');
 if not exists(select 1 from rbc_private.codes where publication_id=pid and scope=permission and hash=digest) then return jsonb_build_object('error','Código inválido o revocado'); end if;
 insert into public.publication_grants(publication_id,user_id,scope,code_hash) values(pid,auth.uid(),permission,digest) on conflict(publication_id,user_id,scope) do update set code_hash=case when public.publication_grants.code_hash is null then null else excluded.code_hash end;
 return jsonb_build_object('id',pid,'scope',permission);
end $$;

create function public.rbc_request_access(p_id uuid,p_scope text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_scope not in ('read','copy','edit') then raise exception 'Inicia sesión'; end if;
 if not exists(select 1 from public.publications where id=p_id) then raise exception 'Publicación no disponible'; end if;
 if (select count(*) from public.access_requests where user_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Límite diario de solicitudes alcanzado'; end if;
 insert into public.access_requests(publication_id,user_id,scope) values(p_id,auth.uid(),p_scope) on conflict(publication_id,user_id,scope) do nothing;
end $$;
create function public.rbc_resolve_request(p_request uuid,p_allow boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.access_requests;
begin
 select * into r from public.access_requests where id=p_request for update;
 if not exists(select 1 from public.publications where id=r.publication_id and owner_id=auth.uid()) then raise exception 'No autorizado'; end if;
 update public.access_requests set status=case when p_allow then 'approved' else 'denied' end where id=p_request;
 if p_allow then insert into public.publication_grants(publication_id,user_id,scope) values(r.publication_id,r.user_id,r.scope) on conflict(publication_id,user_id,scope) do update set code_hash=null; end if;
end $$;
create function public.rbc_revoke_access(p_id uuid,p_user uuid,p_scope text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.publications where id=p_id and owner_id=auth.uid()) then raise exception 'No autorizado'; end if;
 delete from public.publication_grants where publication_id=p_id and user_id=p_user and scope=p_scope;
 update public.access_requests set status='denied' where publication_id=p_id and user_id=p_user and scope=p_scope;
end $$;

create function public.rbc_restore_version(p_id uuid,p_revision integer,p_current integer) returns void language plpgsql security definer set search_path='' as $$
declare p public.publications; old_body jsonb;
begin
 select * into p from public.publications where id=p_id for update;
 if p.owner_id is distinct from auth.uid() or auth.uid() is null then raise exception 'No autorizado'; end if;
 if p.revision<>p_current then raise exception 'Recarga para obtener la versión actual'; end if;
 select body into old_body from public.publication_versions where publication_id=p_id and revision=p_revision;
 if old_body is null then raise exception 'Versión no disponible'; end if;
 insert into public.publication_versions values(p.id,p.revision,p.body,auth.uid(),now());
 update public.publications set body=old_body,revision=revision+1,updated_at=now() where id=p_id;
end $$;

create function public.rbc_can_upload(p_name text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare pid uuid;
begin
 if auth.uid() is null or split_part(p_name,'/',1)<>auth.uid()::text or p_name !~ '\.webp$' then return false; end if;
 begin pid:=split_part(p_name,'/',2)::uuid; exception when invalid_text_representation then return false; end;
 return exists(select 1 from public.publications where id=pid and owner_id=auth.uid()) and (select count(*) from storage.objects where bucket_id='publication-images' and name like auth.uid()::text||'/%')<320;
end $$;
create function public.rbc_can_view_image(p_name text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare pid uuid;
begin
 begin pid:=split_part(p_name,'/',2)::uuid; exception when invalid_text_representation then return false; end;
 return public.rbc_access(pid,'read') and exists(select 1 from public.publications p where p.id=pid and (p.owner_id=auth.uid() or exists(select 1 from jsonb_array_elements(p.body->'images') i where i->>'path'=p_name)));
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('avatars','avatars',false,153600,array['image/webp']),('publication-images','publication-images',false,716800,array['image/webp']);
create policy avatar_read on storage.objects for select using(bucket_id='avatars');
create policy avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and name=auth.uid()::text||'/avatar.webp');
create policy avatar_update on storage.objects for update to authenticated using(bucket_id='avatars' and name=auth.uid()::text||'/avatar.webp') with check(bucket_id='avatars' and name=auth.uid()::text||'/avatar.webp');
create policy publication_image_read on storage.objects for select using(bucket_id='publication-images' and public.rbc_can_view_image(name));
create policy publication_image_insert on storage.objects for insert to authenticated with check(bucket_id='publication-images' and public.rbc_can_upload(name));
create policy publication_image_delete on storage.objects for delete to authenticated using(bucket_id='publication-images' and split_part(name,'/',1)=auth.uid()::text);

-- Explicit RPC grants; new tables are not automatically exposed in this project.
revoke execute on all functions in schema rbc_private from public,anon,authenticated;
revoke execute on function public.rbc_profile_created() from public,anon,authenticated;
revoke execute on function public.rbc_save_publication(uuid,text,text,text[],jsonb,boolean,boolean,boolean,boolean,integer),public.rbc_edit_publication(uuid,jsonb,integer),public.rbc_rotate_code(uuid,text),public.rbc_redeem_code(text),public.rbc_request_access(uuid,text),public.rbc_resolve_request(uuid,boolean),public.rbc_revoke_access(uuid,uuid,text),public.rbc_restore_version(uuid,integer,integer) from public,anon;
grant execute on function public.rbc_save_publication(uuid,text,text,text[],jsonb,boolean,boolean,boolean,boolean,integer),public.rbc_edit_publication(uuid,jsonb,integer),public.rbc_rotate_code(uuid,text),public.rbc_redeem_code(text),public.rbc_request_access(uuid,text),public.rbc_resolve_request(uuid,boolean),public.rbc_revoke_access(uuid,uuid,text),public.rbc_restore_version(uuid,integer,integer) to authenticated;
grant execute on function public.rbc_access(uuid,text),public.rbc_can_view_image(text),public.rbc_can_upload(text) to anon,authenticated;
create policy publication_owner_delete on public.publications for delete to authenticated using(owner_id=auth.uid());
grant delete on public.publications to authenticated;
notify pgrst,'reload schema';
commit;
