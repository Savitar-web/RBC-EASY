begin;
do $$ declare target uuid; begin
select id into target from auth.users where lower(email)='savitarxeno@gmail.com' and email_confirmed_at is not null;
if target is null then raise exception 'La cuenta no existe o no ha confirmado su correo';end if;
insert into rbc_private.administrators(user_id) values(target) on conflict do nothing;
end $$;
select p.username,'Administrador de moderación activado' as resultado from rbc_private.administrators a join public.profiles p on p.id=a.user_id;
commit;
