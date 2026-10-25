begin;
create table rbc_private.birth_dates (
 user_id uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
 birth_date date not null, created_at timestamptz not null default now()
);
alter table rbc_private.birth_dates enable row level security;
revoke all on rbc_private.birth_dates from public,anon,authenticated;
create function rbc_private.is_adult() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from rbc_private.birth_dates b where b.user_id=auth.uid() and b.birth_date+interval '18 years'<=current_date)
$$;
create function public.rbc_age_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recorded',exists(select 1 from rbc_private.birth_dates where user_id=auth.uid()),'adult',rbc_private.is_adult())
$$;
create function public.rbc_set_birth_date(p_birth_date date) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Inicia sesión para guardar la fecha privada';end if;
 if p_birth_date is null or p_birth_date>current_date or p_birth_date<current_date-interval '130 years' then raise exception 'Fecha de nacimiento no válida';end if;
 if exists(select 1 from rbc_private.birth_dates where user_id=auth.uid()) then raise exception 'La fecha privada ya está registrada y no puede cambiarse desde la app';end if;
 insert into rbc_private.birth_dates(user_id,birth_date) values(auth.uid(),p_birth_date);
end $$;
-- Capture the private date before Auth stores user_metadata or issues a JWT.
create function rbc_private.capture_birth_date() returns trigger language plpgsql security definer set search_path='' as $$ declare d date;begin
 if coalesce(new.raw_user_meta_data->>'birth_date','')<>'' then
  if (new.raw_user_meta_data->>'birth_date')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha de nacimiento no válida';end if;
  d:=(new.raw_user_meta_data->>'birth_date')::date;
  if d>current_date or d<current_date-interval '130 years' then raise exception 'Fecha de nacimiento no válida';end if;
  insert into rbc_private.birth_dates(user_id,birth_date) values(new.id,d);
 end if;
 new.raw_user_meta_data:=coalesce(new.raw_user_meta_data,'{}'::jsonb)-'birth_date';return new;
end $$;
create trigger rbc_private_birth_before_signup before insert on auth.users for each row execute function rbc_private.capture_birth_date();
create table rbc_private.art_designs (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 100),
 art text not null check(length(art) between 1 and 200000),adult_only boolean not null default false,
 columns_count integer not null,rows_count integer not null,enabled boolean not null default true,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table rbc_private.art_designs enable row level security;
revoke all on rbc_private.art_designs from public,anon,authenticated;
create index art_designs_catalog on rbc_private.art_designs(adult_only,updated_at desc) where enabled;
create function public.rbc_art_catalog(p_query text default '',p_offset integer default 0,p_restricted boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from (
 select d.id,d.name,d.art,d.adult_only,d.columns_count,d.rows_count,d.updated_at from rbc_private.art_designs d
 where d.enabled and d.adult_only=p_restricted and (not d.adult_only or rbc_private.is_adult()) and d.name ilike '%'||left(trim(p_query),100)||'%'
 order by d.updated_at desc,d.id limit 24 offset greatest(0,least(p_offset,12000))) a
$$;
create function public.rbc_admin_art_list(p_query text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
 return (select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from (select d.* from rbc_private.art_designs d where (not d.adult_only or rbc_private.is_adult()) and d.name ilike '%'||left(trim(p_query),100)||'%' order by d.updated_at desc,d.id limit 24 offset greatest(0,least(p_offset,12000))) a);
end $$;
create function public.rbc_admin_art_save(p_name text,p_art text,p_adult_only boolean default false,p_id uuid default null,p_enabled boolean default true) returns uuid language plpgsql security definer set search_path='' as $$ declare cols integer;rows integer;target uuid;clean text;begin
 if not public.rbc_is_admin() then raise exception 'Acceso exclusivo de administración';end if;
 if p_adult_only and not rbc_private.is_adult() then raise exception 'Registra tu fecha privada en Cuenta antes de gestionar contenido +18';end if;
 clean:=replace(replace(p_art,chr(13)||chr(10),chr(10)),chr(13),chr(10));
 if p_name is null or length(trim(p_name)) not between 1 and 100 or clean is null or length(clean) not between 1 and 200000 or btrim(clean,E' \n\t'||chr(10240))='' then raise exception 'Indica un nombre y un diseño válido de hasta 200000 caracteres';end if;
 select max(length(replace(t,chr(9),'    '))),count(*)::integer into cols,rows from unnest(string_to_array(clean,chr(10))) t;
 if cols>1000 or rows>2000 then raise exception 'El diseño admite hasta 1000 columnas y 2000 filas';end if;
 if p_id is null then
  insert into rbc_private.art_designs(name,art,adult_only,columns_count,rows_count,created_by,enabled) values(trim(p_name),clean,p_adult_only,cols,rows,auth.uid(),p_enabled) returning id into target;
 else
  if exists(select 1 from rbc_private.art_designs where id=p_id and adult_only) and not rbc_private.is_adult() then raise exception 'Acceso +18 requerido';end if;
  update rbc_private.art_designs set name=trim(p_name),art=clean,adult_only=p_adult_only,columns_count=cols,rows_count=rows,enabled=p_enabled,updated_at=now() where id=p_id returning id into target;
  if target is null then raise exception 'El diseño ya no está disponible';end if;
 end if;
 insert into rbc_private.moderation_log(admin_id,action,target_id,reason) values(auth.uid(),'art_save',target,case when p_adult_only then '+18' else 'general' end);
 return target;
end $$;
revoke all on function rbc_private.is_adult(),rbc_private.capture_birth_date() from public,anon,authenticated;
revoke all on function public.rbc_age_status(),public.rbc_set_birth_date(date),public.rbc_admin_art_list(text,integer),public.rbc_admin_art_save(text,text,boolean,uuid,boolean) from public,anon;
grant execute on function public.rbc_age_status(),public.rbc_set_birth_date(date),public.rbc_admin_art_list(text,integer),public.rbc_admin_art_save(text,text,boolean,uuid,boolean) to authenticated;
revoke all on function public.rbc_art_catalog(text,integer,boolean) from public;
grant execute on function public.rbc_art_catalog(text,integer,boolean) to anon,authenticated;
notify pgrst,'reload schema';
commit;
