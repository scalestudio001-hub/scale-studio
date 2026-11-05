"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive, requireAdmin } from "@/lib/auth";
import { str } from "@/lib/utils";
import { chileToUtc } from "@/lib/time";

type S = { error?: string; ok?: string } | undefined;

const cleanUrl = (raw: string) => (!raw ? null : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

// =====================================================================
// SOPORTE
// =====================================================================
export async function createTicket(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireActive();
  const subject = str(fd, "subject");
  const message = str(fd, "message");
  if (!subject || !message) return { error: "Escribe el asunto y tu mensaje." };
  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    topic_id: str(fd, "topic_id") || null,
    subject: subject.slice(0, 140),
    message: message.slice(0, 3000),
  });
  if (error) return { error: error.message };
  revalidatePath("/soporte");
  revalidatePath("/admin/soporte");
  return { ok: "¡Recibimos tu solicitud! Te avisaremos en la campana 🔔 cuando el equipo responda." };
}

export async function answerTicket(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireAdmin();
  const status = str(fd, "status");
  if (!["abierto", "en_proceso", "resuelto"].includes(status)) return { error: "Estado no válido" };
  const reply = str(fd, "admin_reply");
  const { error } = await supabase
    .from("support_tickets")
    .update({ status, admin_reply: reply || null, replied_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", str(fd, "id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/soporte");
  revalidatePath("/soporte");
  return { ok: "Guardado ✅" };
}

export async function saveTopic(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const label = str(fd, "label");
  if (!label) return { error: "El tema necesita un nombre." };
  const row = {
    label,
    description: str(fd, "description") || null,
    emoji: str(fd, "emoji") || "💬",
    contact_name: str(fd, "contact_name") || null,
    whatsapp: str(fd, "whatsapp").replace(/\D/g, "") || null,
    position: Number(str(fd, "position")) || 0,
    active: fd.get("active") === "on",
  };
  const { error } = id ? await supabase.from("support_topics").update(row).eq("id", id) : await supabase.from("support_topics").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: id ? "Tema guardado ✅" : "Tema creado ✅" };
}

export async function deleteTopic(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("support_topics").delete().eq("id", str(fd, "id"));
  revalidatePath("/", "layout");
}

// =====================================================================
// EVENTOS
// =====================================================================
export async function saveEvent(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireAdmin();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const date = str(fd, "date");
  const time = str(fd, "time");
  const duration = Math.max(15, Number(str(fd, "duration")) || 60);
  if (!title || !date || !time) return { error: "Completa título, fecha y hora." };
  const start = chileToUtc(date, time);
  const row = {
    title: title.slice(0, 140),
    description: str(fd, "description") || null,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + duration * 60000).toISOString(),
    location_url: cleanUrl(str(fd, "location_url")),
    cover_url: cleanUrl(str(fd, "cover_url")),
    plan_id: str(fd, "plan_id") || null,
  };
  const { error } = id
    ? await supabase.from("events").update(row).eq("id", id)
    : await supabase.from("events").insert({ ...row, created_by: user.id });
  if (error) return { error: error.message };
  revalidatePath("/eventos");
  return { ok: id ? "Evento actualizado ✅" : "Evento creado 📆 (se avisó en la campana)" };
}

export async function deleteEvent(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("events").delete().eq("id", str(fd, "id"));
  revalidatePath("/eventos");
}

export async function toggleRsvp(fd: FormData) {
  const { supabase, user } = await requireActive();
  const eventId = str(fd, "event_id");
  if (fd.get("going") === "1") await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
  else await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: user.id }, { ignoreDuplicates: true });
  revalidatePath("/eventos");
}

// =====================================================================
// PREGUNTAS EN CLASES
// =====================================================================
export async function addLessonComment(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireActive();
  const body = str(fd, "body");
  if (!body) return { error: "Escribe tu pregunta o comentario." };
  const { error } = await supabase.from("lesson_comments").insert({
    lesson_id: str(fd, "lesson_id"),
    parent_id: str(fd, "parent_id") || null,
    author_id: user.id,
    body: body.slice(0, 2000),
  });
  if (error) return { error: error.message };
  revalidatePath(`/cursos/${str(fd, "course_id")}/${str(fd, "lesson_id")}`);
  return { ok: "Publicado ✅" };
}

export async function deleteLessonComment(fd: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("lesson_comments").delete().eq("id", str(fd, "id"));
  revalidatePath(`/cursos/${str(fd, "course_id")}/${str(fd, "lesson_id")}`);
}

// =====================================================================
// AVISOS PERSONALES
// =====================================================================
export async function markNotificationsRead(ids: string[] | "all") {
  const { supabase, user } = await requireActive();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (ids !== "all") {
    const clean = ids.filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200);
    if (!clean.length) return;
    q = q.in("id", clean);
  }
  await q;
}

// =====================================================================
// MENSAJES DIRECTOS
// =====================================================================
export async function openDm(fd: FormData) {
  const { supabase } = await requireActive();
  const { data, error } = await supabase.rpc("open_dm", { other: str(fd, "user_id") });
  if (error) throw new Error(error.message);
  redirect(`/mensajes/${data}`);
}
