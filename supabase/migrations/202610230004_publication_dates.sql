begin;
drop function public.rbc_explore(text,boolean,integer);
create function public.rbc_explore(p_query text default '',p_mine boolean default false,p_offset integer default 0)
returns table(id uuid,title text,description text,tags text[],owner_id uuid,updated_at timestamptz,created_at timestamptz,read_public boolean,copy_public boolean,edit_public boolean,profiles jsonb,views bigint,likes bigint)
language sql stable security invoker set search_path='' as $$ select p.id,p.title,p.description,p.tags,p.owner_id,p.updated_at,p.created_at,p.read_public,p.copy_public,p.edit_public,jsonb_build_object('username',u.username,'avatar_path',u.avatar_path),coalesce(s.views,0),public.rbc_like_count(p.id)
from public.publications p join public.profiles u on u.id=p.owner_id left join public.publication_stats s on s.publication_id=p.id
where ((p_mine and p.owner_id=auth.uid()) or (not p_mine and p.discoverable and p.read_public)) and (length(trim(p_query))=0 or p.title ilike '%'||left(trim(p_query),120)||'%' or u.username ilike '%'||left(ltrim(trim(p_query),'@'),120)||'%' or array_to_string(p.tags,' ') ilike '%'||left(trim(p_query),120)||'%') order by p.updated_at desc limit 20 offset greatest(0,least(10000,p_offset));$$;
revoke all on function public.rbc_explore(text,boolean,integer) from public;
grant execute on function public.rbc_explore(text,boolean,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
