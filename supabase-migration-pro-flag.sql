-- Pro flag (S6-001). Safe to re-run.
--
-- Beta: default true, so every existing and new user is Pro.
-- To revoke one user:   update profiles set is_pro = false where id = '<user id>';
-- When payments go live: alter table profiles alter column is_pro set default false;

alter table profiles add column if not exists is_pro boolean not null default true;

-- The app upserts profile rows with the user's own token, so RLS alone would
-- let a user set is_pro on themselves. Ignore any change to it that comes from
-- the client roles; the SQL editor (postgres) and service role (Stripe webhook)
-- can still change it.
create or replace function protect_is_pro()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_pro := true; -- beta default; change alongside the column default
    elsif new.is_pro is distinct from old.is_pro then
      new.is_pro := old.is_pro;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_pro on profiles;
create trigger protect_is_pro
  before insert or update on profiles
  for each row execute function protect_is_pro();
