begin;
create function public.rbc_explore(p_query text default '',p_mine boolean default false,p_offset integer default 0)
returns table(id uuid,title text,description text,tags text[],owner_id uuid,updated_at timestamptz,read_public boolean,copy_public boolean,edit_public boolean,profiles jsonb)
language sql stable security invoker set search_path='' as $$
 select p.id,p.title,p.description,p.tags,p.owner_id,p.updated_at,p.read_public,p.copy_public,p.edit_public,jsonb_build_object('username',u.username)
 from public.publications p join public.profiles u on u.id=p.owner_id
 where ((p_mine and p.owner_id=auth.uid()) or (not p_mine and p.discoverable and p.read_public))
 and (length(trim(p_query))=0 or p.title ilike '%'||left(trim(p_query),120)||'%' or u.username ilike '%'||left(ltrim(trim(p_query),'@'),120)||'%' or array_to_string(p.tags,' ') ilike '%'||left(trim(p_query),120)||'%')
 order by p.updated_at desc limit 20 offset greatest(0,least(10000,p_offset));
$$;
revoke all on function public.rbc_explore(text,boolean,integer) from public;
grant execute on function public.rbc_explore(text,boolean,integer) to anon,authenticated;
create function rbc_private.trim_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.publication_versions where publication_id=new.publication_id and revision not in(select revision from public.publication_versions where publication_id=new.publication_id order by revision desc limit 10);
 return new;
end $$;
create trigger trim_publication_history after insert on public.publication_versions for each row execute function rbc_private.trim_history();
revoke all on function rbc_private.trim_history() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
