begin;
alter table public.profiles drop constraint profiles_username_check;
alter table public.profiles add constraint profiles_username_check check(
 char_length(username) between 3 and 64 and username=btrim(username)
 and username !~ '[[:cntrl:]]'
 and username !~ U&'[\200B\202A-\202E\2066-\2069\FEFF]'
 and username !~ '^[[:space:]]*$');
alter table public.profiles drop constraint profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check(char_length(bio)<=4000);
create function rbc_private.normalize_profile_name() returns trigger language plpgsql set search_path='' as $$ begin
 new.username:=normalize(btrim(new.username),NFC);return new;end $$;
create trigger normalize_profile_name before insert or update of username on public.profiles for each row execute function rbc_private.normalize_profile_name();
notify pgrst,'reload schema';
commit;
