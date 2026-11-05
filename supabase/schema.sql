-- =====================================================================
--  PLATAFORMA DE CURSOS — Esquema de base de datos para Supabase
--  Cómo usarlo: Supabase > SQL Editor > New query > pega todo > Run
-- =====================================================================

-- ---------- TABLAS ----------------------------------------------------

create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  avatar_url text,
  role       text not null default 'student' check (role in ('student', 'admin')),
  status     text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  plan_id    uuid references public.plans (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  cover_url   text,
  position    int  not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.plan_courses (
  plan_id   uuid not null references public.plans (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  primary key (plan_id, course_id)
);

create table if not exists public.modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  title      text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules (id) on delete cascade,
  title        text not null,
  description  text,
  video_url    text,
  resources    text,          -- una línea por recurso:  Nombre | https://link
  duration_min int,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  category   text not null default 'General',
  title      text not null,
  body       text not null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create index if not exists modules_course_idx  on public.modules (course_id);
create index if not exists lessons_module_idx  on public.lessons (module_id);
create index if not exists comments_post_idx   on public.comments (post_id);
create index if not exists posts_created_idx   on public.posts (created_at desc);

-- ---------- FUNCIONES DE APOYO ---------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and (status = 'active' or role = 'admin')
  );
$$;

create or replace function public.has_course_access(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1
    from profiles p
    join plan_courses pc on pc.plan_id = p.plan_id
    join courses c       on c.id = pc.course_id
    where p.id = auth.uid() and p.status = 'active'
      and pc.course_id = cid and c.published
  );
$$;

create or replace function public.lesson_course(lid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select m.course_id from lessons l join modules m on m.id = l.module_id where l.id = lid;
$$;

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo un admin puede fijar publicaciones
create or replace function public.guard_post_pin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.pinned := false;
    else new.pinned := old.pinned; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_guard_pin on public.posts;
create trigger posts_guard_pin
  before insert or update on public.posts
  for each row execute function public.guard_post_pin();

-- ---------- FUNCIONES DEL PANEL ADMIN --------------------------------

-- Lista de usuarios con correo y teléfono (solo admin)
create or replace function public.admin_list_users()
returns table (
  id uuid, full_name text, email text, phone text, role text,
  status text, plan_id uuid, created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query
    select p.id, p.full_name, u.email::text, (u.raw_user_meta_data ->> 'phone')::text,
           p.role, p.status, p.plan_id, p.created_at, u.last_sign_in_at
    from profiles p join auth.users u on u.id = p.id
    order by (p.status = 'pending') desc, p.created_at desc;
end;
$$;

-- Cambiar estado, plan o rol de un usuario (solo admin)
create or replace function public.admin_update_user(
  uid uuid, new_status text, new_plan uuid, new_role text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if uid = auth.uid() and new_role <> 'admin' then
    raise exception 'No puedes quitarte el rol de admin a ti mismo';
  end if;
  update profiles
     set status = new_status, plan_id = new_plan, role = new_role
   where id = uid;
end;
$$;

-- Las funciones de admin solo las puede llamar alguien con sesión iniciada
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_update_user(uuid, text, uuid, text) from public, anon;
grant  execute on function public.admin_list_users() to authenticated;
grant  execute on function public.admin_update_user(uuid, text, uuid, text) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_post_pin() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_active() from public, anon;
revoke execute on function public.has_course_access(uuid) from public, anon;
revoke execute on function public.lesson_course(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active() to authenticated;
grant execute on function public.has_course_access(uuid) to authenticated;
grant execute on function public.lesson_course(uuid) to authenticated;

-- ---------- PERMISOS DE COLUMNAS -------------------------------------
-- Los usuarios solo pueden editar su nombre y foto (no su rol, estado ni plan)
revoke update on public.profiles from authenticated, anon;
grant  update (full_name, avatar_url) on public.profiles to authenticated;

-- ---------- SEGURIDAD POR FILAS (RLS) --------------------------------

alter table public.plans           enable row level security;
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.plan_courses    enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.posts           enable row level security;
alter table public.comments        enable row level security;
alter table public.post_likes      enable row level security;

-- Borra políticas anteriores para poder volver a correr este archivo
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- PERFILES: uno ve el suyo; los alumnos activos ven nombre/foto del resto (comunidad)
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_active());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- PLANES
create policy plans_select on public.plans for select to authenticated
  using (public.is_admin() or id = (select plan_id from profiles where id = auth.uid()));
create policy plans_admin on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy plan_courses_select on public.plan_courses for select to authenticated
  using (public.is_admin() or plan_id = (select plan_id from profiles where id = auth.uid()));
create policy plan_courses_admin on public.plan_courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- CURSOS: los alumnos activos ven el catálogo publicado (los que no tienen aparecen bloqueados)
create policy courses_select on public.courses for select to authenticated
  using (public.is_admin() or (published and public.is_active()));
create policy courses_admin on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- MÓDULOS y LECCIONES: solo si el curso está en tu plan
create policy modules_select on public.modules for select to authenticated
  using (public.has_course_access(course_id));
create policy modules_admin on public.modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy lessons_select on public.lessons for select to authenticated
  using (public.has_course_access(public.lesson_course(id)));
create policy lessons_admin on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- PROGRESO: cada uno el suyo
create policy progress_select on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy progress_insert on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.has_course_access(public.lesson_course(lesson_id)));
create policy progress_delete on public.lesson_progress for delete to authenticated
  using (user_id = auth.uid());

-- COMUNIDAD: solo alumnos activos
create policy posts_select on public.posts for select to authenticated
  using (public.is_active());
create policy posts_insert on public.posts for insert to authenticated
  with check (public.is_active() and author_id = auth.uid());
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy comments_select on public.comments for select to authenticated
  using (public.is_active());
create policy comments_insert on public.comments for insert to authenticated
  with check (public.is_active() and author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy likes_select on public.post_likes for select to authenticated
  using (public.is_active());
create policy likes_insert on public.post_likes for insert to authenticated
  with check (public.is_active() and user_id = auth.uid());
create policy likes_delete on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

-- =====================================================================
--  DESPUÉS DE REGISTRARTE en la plataforma, conviértete en admin
--  corriendo esto (cambia el correo por el tuyo):
--
--  update public.profiles set role = 'admin', status = 'active'
--  where id = (select id from auth.users where email = 'tu@correo.com');
-- =====================================================================
