-- =====================================================================
--  KAPITAL — Supabase verilənlər bazası sxemi
--  İstifadə: Supabase Dashboard → SQL Editor → New query → hamısını
--  yapışdırın → Run. Təkrar işə salmaq təhlükəsizdir (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PROFİLLƏR (hər auth istifadəçisi üçün avtomatik yaranır)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'istifadəçi'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sxemdən əvvəl qeydiyyatdan keçmiş istifadəçilər üçün profil yarat
insert into public.profiles (id, display_name)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(u.email, 'istifadəçi'), '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 1B) KATEQORİYALAR (hər istifadəçi öz kateqoriyalarını idarə edir)
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type       text not null check (type in ('income', 'expense', 'saving')),
  name       text not null check (char_length(trim(name)) between 1 and 40),
  emoji      text not null default '🧾',
  color      text not null default '#5BE3C0',
  sort_order integer not null default 0,
  monthly_limit numeric(14, 2),
  created_at timestamptz not null default now(),
  unique (user_id, type, name)
);
create index if not exists categories_user_idx on public.categories (user_id, type, sort_order);

alter table public.categories enable row level security;

drop policy if exists categories_owner on public.categories;
create policy categories_owner on public.categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.categories to authenticated;

-- Yeni istifadəçi qeydiyyatdan keçəndə başlanğıc kateqoriyalar avtomatik yaradılır
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, type, name, emoji, color, sort_order) values
    (new.id, 'income', 'Maaş', '💼', '#5BE3C0', 1),
    (new.id, 'income', 'Biznes', '📈', '#9DB0FF', 2),
    (new.id, 'income', 'Bonus', '🎁', '#F6C667', 3),
    (new.id, 'income', 'Digər', '✨', '#7CD6FF', 9),
    (new.id, 'expense', 'Qida', '🍽️', '#FF8FA3', 1),
    (new.id, 'expense', 'Nəqliyyat', '🚕', '#F6C667', 2),
    (new.id, 'expense', 'Kommunal', '💡', '#9DB0FF', 3),
    (new.id, 'expense', 'Alış-veriş', '🛍️', '#C9A2FF', 4),
    (new.id, 'expense', 'Sağlamlıq', '💊', '#7CD6FF', 5),
    (new.id, 'expense', 'Əyləncə', '🎬', '#FF8FA3', 6),
    (new.id, 'expense', 'Digər', '🧾', '#93A1BB', 9),
    (new.id, 'saving', 'Ümumi', '🐷', '#9DB0FF', 1),
    (new.id, 'saving', 'Təcili ehtiyat', '🛟', '#5BE3C0', 2),
    (new.id, 'saving', 'Səyahət', '✈️', '#7CD6FF', 3),
    (new.id, 'saving', 'Digər', '🪙', '#F6C667', 9)
  on conflict (user_id, type, name) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_categories on auth.users;
create trigger on_auth_user_categories
  after insert on auth.users
  for each row execute function public.seed_default_categories();

-- Sxemdən əvvəl qeydiyyatdan keçmiş istifadəçilər üçün də başlanğıc kateqoriyalar yarat
insert into public.categories (user_id, type, name, emoji, color, sort_order)
select u.id, v.type, v.name, v.emoji, v.color, v.sort_order
from auth.users u
cross join (values
  ('income','Maaş','💼','#5BE3C0',1), ('income','Biznes','📈','#9DB0FF',2), ('income','Bonus','🎁','#F6C667',3), ('income','Digər','✨','#7CD6FF',9),
  ('expense','Qida','🍽️','#FF8FA3',1), ('expense','Nəqliyyat','🚕','#F6C667',2), ('expense','Kommunal','💡','#9DB0FF',3),
  ('expense','Alış-veriş','🛍️','#C9A2FF',4), ('expense','Sağlamlıq','💊','#7CD6FF',5), ('expense','Əyləncə','🎬','#FF8FA3',6), ('expense','Digər','🧾','#93A1BB',9),
  ('saving','Ümumi','🐷','#9DB0FF',1), ('saving','Təcili ehtiyat','🛟','#5BE3C0',2), ('saving','Səyahət','✈️','#7CD6FF',3), ('saving','Digər','🪙','#F6C667',9)
) as v(type, name, emoji, color, sort_order)
on conflict (user_id, type, name) do nothing;

-- ---------------------------------------------------------------------
-- 2) ŞƏXSİ ƏMƏLİYYATLAR (gəlir / xərc / yığım)
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('income', 'expense', 'saving')),
  amount      numeric(14, 2) not null check (amount > 0),
  category    text not null default 'Digər',
  note        text not null default '',
  occurred_on date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, occurred_on desc);

-- ---------------------------------------------------------------------
-- 2B) TƏKRARLANAN ƏMƏLİYYATLAR (məs. hər ay kirayə, maaş)
-- ---------------------------------------------------------------------
create table if not exists public.recurring (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type         text not null check (type in ('income', 'expense', 'saving')),
  amount       numeric(14, 2) not null check (amount > 0),
  category     text not null default 'Digər',
  note         text not null default '',
  day_of_month smallint not null check (day_of_month between 1 and 28),
  active       boolean not null default true,
  last_run     text, -- son avtomatik yaradılan ay, 'YYYY-MM' formatında
  created_at   timestamptz not null default now()
);
create index if not exists recurring_user_idx on public.recurring (user_id);

alter table public.recurring enable row level security;

drop policy if exists recurring_owner on public.recurring;
create policy recurring_owner on public.recurring for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.recurring to authenticated;

-- ---------------------------------------------------------------------
-- 3) QRUPLAR
-- ---------------------------------------------------------------------
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 80),
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  currency    text not null default 'AZN',
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

create table if not exists public.group_goals (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 80),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  deadline      date,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (id, group_id)
);
create index if not exists group_goals_group_idx on public.group_goals (group_id);

-- Qrup daxilindəki hər əlavə/çıxarış (məbləğ + işarəli). Tarixçə də buradan gəlir.
create table if not exists public.group_contributions (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null,
  goal_id    uuid not null,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  amount     numeric(14, 2) not null check (amount <> 0),
  note       text not null default '',
  created_at timestamptz not null default now(),
  -- məqsəd mütləq həmin qrupa aid olmalıdır
  foreign key (goal_id, group_id) references public.group_goals (id, group_id) on delete cascade
);
create index if not exists group_contrib_group_idx on public.group_contributions (group_id, created_at desc);
create index if not exists group_contrib_goal_idx on public.group_contributions (goal_id);

-- İstifadəçi bir məqsəddən yalnız özünün əlavə etdiyi məbləği çıxara bilər.
create or replace function public.check_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mine numeric;
begin
  if tg_op = 'INSERT' then
    if new.amount < 0 then
      select coalesce(sum(amount), 0) into mine
      from public.group_contributions
      where goal_id = new.goal_id and user_id = new.user_id;
      if mine + new.amount < 0 then
        raise exception 'Çıxarmaq istədiyiniz məbləğ bu məqsədə əlavə etdiyiniz məbləğdən çoxdur.';
      end if;
    end if;
    return new;
  end if;

  -- DELETE: cascade (qrup/məqsəd silinməsi) zamanı yoxlama aparılmır
  if pg_trigger_depth() > 1 then
    return old;
  end if;
  if old.amount > 0 then
    select coalesce(sum(amount), 0) into mine
    from public.group_contributions
    where goal_id = old.goal_id and user_id = old.user_id and id <> old.id;
    if mine < 0 then
      raise exception 'Bu əlavəni silmək olmaz: sonrakı çıxarışlar var.';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists group_contrib_check on public.group_contributions;
create trigger group_contrib_check
  before insert or delete on public.group_contributions
  for each row execute function public.check_contribution();

-- ---------------------------------------------------------------------
-- 4) YARDIMÇI FUNKSİYALAR (RLS-də sonsuz rekursiyanın qarşısını alır)
-- ---------------------------------------------------------------------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.shares_group_with(uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

-- ---------------------------------------------------------------------
-- 5) RPC: qrup yaratmaq və qrupa qoşulmaq
-- ---------------------------------------------------------------------
create or replace function public.create_group(
  p_name      text,
  p_goal_name text default null,
  p_target    numeric default null,
  p_deadline  date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Giriş tələb olunur.';
  end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Qrupun adı boş ola bilməz.';
  end if;

  insert into public.groups (name, created_by) values (trim(p_name), auth.uid()) returning id into gid;
  insert into public.group_members (group_id, user_id, role) values (gid, auth.uid(), 'owner');

  if p_target is not null and p_target > 0 then
    insert into public.group_goals (group_id, name, target_amount, deadline, created_by)
    values (gid, coalesce(nullif(trim(p_goal_name), ''), trim(p_name)), p_target, p_deadline, auth.uid());
  end if;

  return gid;
end;
$$;

create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Giriş tələb olunur.';
  end if;
  select id into gid from public.groups where invite_code = upper(trim(p_code));
  if gid is null then
    raise exception 'Bu kodla qrup tapılmadı.';
  end if;
  insert into public.group_members (group_id, user_id, role) values (gid, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
  return gid;
end;
$$;

-- ---------------------------------------------------------------------
-- 6) ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.transactions        enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.group_goals         enable row level security;
alter table public.group_contributions enable row level security;

-- profiles: özününkü + eyni qrupdakı üzvlərin adı; yalnız özünü dəyişə bilər
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- transactions: yalnız sahibi
drop policy if exists transactions_owner on public.transactions;
create policy transactions_owner on public.transactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- groups: yalnız üzvlər görür; yalnız sahibi dəyişir/silir (yaratmaq RPC ilədir)
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id));

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (public.is_group_owner(id)) with check (public.is_group_owner(id));

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated
  using (public.is_group_owner(id));

-- group_members: üzvlər siyahını görür; üzv özü çıxa bilər (sahib çıxa bilməz)
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_members_leave on public.group_members;
create policy group_members_leave on public.group_members for delete to authenticated
  using (user_id = auth.uid() and role <> 'owner');

-- group_goals: üzvlər görür və yaradır; sahibi və ya yaradan dəyişir/silir
drop policy if exists group_goals_select on public.group_goals;
create policy group_goals_select on public.group_goals for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_goals_insert on public.group_goals;
create policy group_goals_insert on public.group_goals for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists group_goals_update on public.group_goals;
create policy group_goals_update on public.group_goals for update to authenticated
  using (public.is_group_owner(group_id) or created_by = auth.uid())
  with check (public.is_group_owner(group_id) or created_by = auth.uid());

drop policy if exists group_goals_delete on public.group_goals;
create policy group_goals_delete on public.group_goals for delete to authenticated
  using (public.is_group_owner(group_id) or created_by = auth.uid());

-- group_contributions: üzvlər görür; yalnız öz adına əlavə edir; yalnız özününkünü silir
drop policy if exists group_contrib_select on public.group_contributions;
create policy group_contrib_select on public.group_contributions for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_contrib_insert on public.group_contributions;
create policy group_contrib_insert on public.group_contributions for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists group_contrib_delete on public.group_contributions;
create policy group_contrib_delete on public.group_contributions for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7) İCAZƏLƏR
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, update, delete on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_goals to authenticated;
grant select, insert, delete on public.group_contributions to authenticated;

revoke execute on function public.create_group(text, text, numeric, date) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.is_group_owner(uuid) from public, anon;
revoke execute on function public.shares_group_with(uuid) from public, anon;
grant execute on function public.create_group(text, text, numeric, date) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8) REAL-TIME (dəyişikliklər bütün qrup üzvlərinə anında çatır)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'groups', 'group_members', 'group_goals', 'group_contributions', 'categories', 'recurring']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end;
$$;
