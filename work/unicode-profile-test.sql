begin;
do $$ declare person uuid;blocked boolean:=false;begin
select id into person from public.profiles limit 1;
if person is null then raise exception 'No profile to test';end if;
update public.profiles set username='  [B]𝓟𝓻𝓾𝓮𝓫𝓪 🦋  ',bio='[C][B]Presentación'||E'\n'||repeat('Español ñ 🌸 ',40) where id=person;
if not exists(select 1 from public.profiles where id=person and username='[B]𝓟𝓻𝓾𝓮𝓫𝓪 🦋' and char_length(bio)>300) then raise exception 'Unicode normalization or biography limit failed';end if;
begin update public.profiles set username=E'bad\nname' where id=person;exception when check_violation then blocked:=true;end;
if not blocked then raise exception 'Control character accepted';end if;
blocked:=false;begin update public.profiles set username=U&'bad\202Ename' where id=person;exception when check_violation then blocked:=true;end;
if not blocked then raise exception 'Bidi control accepted';end if;
end $$;
rollback;
select 'PASS: nombres Unicode, emojis, prefijos, normalizacion, biografia extensa y rechazo de controles. Datos de prueba revertidos.' as verificacion;
