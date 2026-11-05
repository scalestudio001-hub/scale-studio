-- =====================================================================
--  SOPORTE, EVENTOS, PREGUNTAS EN CLASES, AVISOS, MENSAJES, CERTIFICADOS
-- =====================================================================

-- ---------- AVISOS PERSONALES (campana) ------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notif_select on public.notifications;
drop policy if exists notif_update on public.notifications;
drop policy if exists notif_delete on public.notifications;
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

create or replace function public.push_notification(p_user uuid, p_actor uuid, p_type text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  insert into notifications (user_id, actor_id, type, title, body, link)
  values (p_user, p_actor, p_type, left(p_title, 200), left(p_body, 300), p_link);
end;
$$;
revoke execute on function public.push_notification(uuid, uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.actor_name(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Alguien') from profiles where id = uid;
$$;
revoke execute on function public.actor_name(uuid) from public, anon, authenticated;

-- Comentario en tu publicación
create or replace function public.trg_comment_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare p posts;
begin
  select * into p from posts where id = new.post_id;
  perform push_notification(p.author_id, new.author_id, 'comment', actor_name(new.author_id) || ' comentó tu publicación', left(new.body, 140), '/comunidad/' || new.post_id);
  return new;
end; $$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.trg_comment_notify();

-- Me gusta en tu publicación
create or replace function public.trg_like_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare p posts;
begin
  select * into p from posts where id = new.post_id;
  perform push_notification(p.author_id, new.user_id, 'like', 'A ' || actor_name(new.user_id) || ' le gustó tu publicación', p.title, '/comunidad/' || new.post_id);
  return new;
end; $$;
drop trigger if exists likes_notify on public.post_likes;
create trigger likes_notify after insert on public.post_likes for each row execute function public.trg_like_notify();

-- ---------- PREGUNTAS EN CADA CLASE ----------------------------------
create table if not exists public.lesson_comments (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  parent_id  uuid references public.lesson_comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists lesson_comments_lesson_idx on public.lesson_comments (lesson_id, created_at);
alter table public.lesson_comments enable row level security;
drop policy if exists lc_select on public.lesson_comments;
drop policy if exists lc_insert on public.lesson_comments;
drop policy if exists lc_delete on public.lesson_comments;
create policy lc_select on public.lesson_comments for select to authenticated
  using (public.has_course_access(public.lesson_course(lesson_id)));
create policy lc_insert on public.lesson_comments for insert to authenticated
  with check (author_id = auth.uid() and public.has_course_access(public.lesson_course(lesson_id)));
create policy lc_delete on public.lesson_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create or replace function public.trg_lesson_comment_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare l lessons; cid uuid; parent_author uuid; link text;
begin
  select * into l from lessons where id = new.lesson_id;
  cid := lesson_course(new.lesson_id);
  link := '/cursos/' || cid || '/' || new.lesson_id || '#preguntas';
  if new.parent_id is not null then
    select author_id into parent_author from lesson_comments where id = new.parent_id;
    perform push_notification(parent_author, new.author_id, 'lesson_reply', actor_name(new.author_id) || ' respondió tu pregunta', l.title, link);
  end if;
  -- avisar al equipo cuando un alumno pregunta
  if not exists (select 1 from profiles where id = new.author_id and role = 'admin') then
    perform push_notification(p.id, new.author_id, 'lesson_question', actor_name(new.author_id) || ' preguntó en «' || l.title || '»', left(new.body, 140), link)
    from profiles p where p.role = 'admin';
  end if;
  return new;
end; $$;
drop trigger if exists lesson_comments_notify on public.lesson_comments;
create trigger lesson_comments_notify after insert on public.lesson_comments for each row execute function public.trg_lesson_comment_notify();

-- ---------- SOPORTE ---------------------------------------------------
create table if not exists public.support_topics (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  description text,
  emoji       text default '💬',
  contact_name text,
  whatsapp    text,           -- número con código país, ej: 56912345678
  position    int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  topic_id    uuid references public.support_topics (id) on delete set null,
  subject     text not null check (char_length(subject) between 1 and 140),
  message     text not null check (char_length(message) between 1 and 3000),
  status      text not null default 'abierto' check (status in ('abierto','en_proceso','resuelto')),
  admin_reply text,
  replied_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
alter table public.support_topics enable row level security;
alter table public.support_tickets enable row level security;
drop policy if exists st_select on public.support_topics;
drop policy if exists st_admin on public.support_topics;
drop policy if exists tk_select on public.support_tickets;
drop policy if exists tk_insert on public.support_tickets;
drop policy if exists tk_admin on public.support_tickets;
create policy st_select on public.support_topics for select to authenticated using (true);
create policy st_admin on public.support_topics for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tk_select on public.support_tickets for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy tk_insert on public.support_tickets for insert to authenticated with check (user_id = auth.uid());
create policy tk_admin on public.support_tickets for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.trg_ticket_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform push_notification(p.id, new.user_id, 'ticket_new', 'Nuevo ticket de ' || actor_name(new.user_id), new.subject, '/admin/soporte')
    from profiles p where p.role = 'admin';
  elsif new.admin_reply is distinct from old.admin_reply and new.admin_reply is not null then
    perform push_notification(new.user_id, new.replied_by, 'ticket_reply', 'Respondieron tu solicitud de soporte', new.subject, '/soporte');
  elsif new.status = 'resuelto' and old.status <> 'resuelto' then
    perform push_notification(new.user_id, new.replied_by, 'ticket_done', 'Tu solicitud fue marcada como resuelta ✅', new.subject, '/soporte');
  end if;
  return new;
end; $$;
drop trigger if exists tickets_notify on public.support_tickets;
create trigger tickets_notify after insert or update on public.support_tickets for each row execute function public.trg_ticket_notify();

-- ---------- EVENTOS ---------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 140),
  description text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null check (ends_at > starts_at),
  location_url text,
  cover_url   text,
  plan_id     uuid references public.plans (id) on delete cascade, -- null = todos
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists events_starts_idx on public.events (starts_at);
create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
drop policy if exists ev_select on public.events;
drop policy if exists ev_admin on public.events;
drop policy if exists rsvp_select on public.event_rsvps;
drop policy if exists rsvp_insert on public.event_rsvps;
drop policy if exists rsvp_delete on public.event_rsvps;
create policy ev_select on public.events for select to authenticated
  using (public.is_admin() or (public.is_active() and (plan_id is null or plan_id = (select plan_id from profiles where id = auth.uid()))));
create policy ev_admin on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy rsvp_select on public.event_rsvps for select to authenticated using (public.is_active());
create policy rsvp_insert on public.event_rsvps for insert to authenticated with check (user_id = auth.uid() and public.is_active());
create policy rsvp_delete on public.event_rsvps for delete to authenticated using (user_id = auth.uid());

create or replace function public.trg_event_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform push_notification(p.id, new.created_by, 'event', '📆 Nuevo evento: ' || new.title,
                 to_char(new.starts_at at time zone 'America/Santiago', 'DD/MM HH24:MI') || ' hrs', '/eventos')
  from profiles p
  where (p.status = 'active' or p.role = 'admin') and (new.plan_id is null or p.plan_id = new.plan_id or p.role = 'admin');
  return new;
end; $$;
drop trigger if exists events_notify on public.events;
create trigger events_notify after insert on public.events for each row execute function public.trg_event_notify();

-- ---------- AVISOS DE REUNIONES ---------------------------------------
create or replace function public.trg_meeting_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare when_txt text;
begin
  when_txt := to_char(new.starts_at at time zone 'America/Santiago', 'DD/MM HH24:MI') || ' hrs';
  if tg_op = 'INSERT' then
    perform push_notification(new.coach_id, new.student_id, 'meeting', '📅 ' || actor_name(new.student_id) || ' agendó una reunión contigo', when_txt, '/reuniones/agenda');
  elsif new.status = 'cancelada' and old.status <> 'cancelada' then
    if new.cancelled_by = new.student_id then
      perform push_notification(new.coach_id, new.student_id, 'meeting_cancel', actor_name(new.student_id) || ' canceló su reunión', when_txt, '/reuniones/agenda');
    else
      perform push_notification(new.student_id, new.cancelled_by, 'meeting_cancel', 'Se canceló tu reunión del ' || when_txt, 'Puedes agendar un nuevo horario', '/reuniones');
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists meetings_notify on public.meetings;
create trigger meetings_notify after insert or update on public.meetings for each row execute function public.trg_meeting_notify();

-- ---------- MENSAJES DIRECTOS ----------------------------------------
create table if not exists public.dm_threads (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles (id) on delete cascade,
  user_b          uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create table if not exists public.dm_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.dm_threads (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 3000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_thread_idx on public.dm_messages (thread_id, created_at);
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

create or replace function public.in_thread(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from dm_threads where id = tid and auth.uid() in (user_a, user_b));
$$;
revoke execute on function public.in_thread(uuid) from public, anon;
grant execute on function public.in_thread(uuid) to authenticated;

drop policy if exists dmt_select on public.dm_threads;
drop policy if exists dmm_select on public.dm_messages;
drop policy if exists dmm_insert on public.dm_messages;
drop policy if exists dmm_update on public.dm_messages;
create policy dmt_select on public.dm_threads for select to authenticated using (auth.uid() in (user_a, user_b));
create policy dmm_select on public.dm_messages for select to authenticated using (public.in_thread(thread_id));
create policy dmm_insert on public.dm_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.in_thread(thread_id) and public.is_active());
create policy dmm_update on public.dm_messages for update to authenticated
  using (public.in_thread(thread_id) and sender_id <> auth.uid()) with check (public.in_thread(thread_id));

create or replace function public.open_dm(other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; tid uuid;
begin
  if not public.is_active() then raise exception 'Tu cuenta no está activa'; end if;
  if other = auth.uid() then raise exception 'No puedes escribirte a ti mismo'; end if;
  if not exists (select 1 from profiles where id = other and (status = 'active' or role = 'admin')) then
    raise exception 'Esa persona no está disponible';
  end if;
  a := least(auth.uid(), other); b := greatest(auth.uid(), other);
  insert into dm_threads (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into tid from dm_threads where user_a = a and user_b = b;
  return tid;
end; $$;
revoke execute on function public.open_dm(uuid) from public, anon;
grant execute on function public.open_dm(uuid) to authenticated;

create or replace function public.trg_dm_after() returns trigger language plpgsql security definer set search_path = public as $$
declare t dm_threads; other uuid;
begin
  update dm_threads set last_message_at = new.created_at where id = new.thread_id returning * into t;
  other := case when t.user_a = new.sender_id then t.user_b else t.user_a end;
  -- un solo aviso sin leer por conversación
  if not exists (select 1 from notifications where user_id = other and type = 'dm' and link = '/mensajes/' || new.thread_id and read_at is null) then
    perform push_notification(other, new.sender_id, 'dm', '✉️ ' || actor_name(new.sender_id) || ' te envió un mensaje', left(new.body, 140), '/mensajes/' || new.thread_id);
  end if;
  return new;
end; $$;
drop trigger if exists dm_after on public.dm_messages;
create trigger dm_after after insert on public.dm_messages for each row execute function public.trg_dm_after();

-- ---------- CERTIFICADOS ---------------------------------------------
create table if not exists public.certificates (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  code      text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);
alter table public.certificates enable row level security;
drop policy if exists cert_select on public.certificates;
create policy cert_select on public.certificates for select to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.issue_certificate(cid uuid)
returns text language plpgsql security definer set search_path = public as $$
declare total int; done int; c text;
begin
  if not public.has_course_access(cid) then raise exception 'No tienes acceso a este curso'; end if;
  select count(*) into total from lessons l join modules m on m.id = l.module_id where m.course_id = cid;
  select count(*) into done from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
    where m.course_id = cid and lp.user_id = auth.uid();
  if total = 0 or done < total then raise exception 'Aún no completas todas las clases del curso'; end if;
  insert into certificates (user_id, course_id) values (auth.uid(), cid) on conflict (user_id, course_id) do nothing;
  select code into c from certificates where user_id = auth.uid() and course_id = cid;
  return c;
end; $$;
revoke execute on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.issue_certificate(uuid) to authenticated;

-- ---------- TIEMPO REAL ----------------------------------------------
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.dm_messages;
alter publication supabase_realtime add table public.lesson_comments;

-- Temas de soporte de ejemplo (edítalos en Administración → Soporte)
insert into public.support_topics (label, description, emoji, position)
select * from (values
  ('Dudas de las clases', 'Algo de un curso o una clase no te quedó claro', '📚', 1),
  ('Problemas con mi cuenta', 'Acceso, clave, plan o datos de tu perfil', '🔐', 2),
  ('Pagos', 'Consultas sobre pagos o tu plan', '💳', 3),
  ('Otro', 'Cualquier otra consulta', '💬', 4)
) v(label, description, emoji, position)
where not exists (select 1 from public.support_topics);
