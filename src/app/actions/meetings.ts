"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive, requireAdmin } from "@/lib/auth";
import { str } from "@/lib/utils";
import { addDaysKey, chileDateKey, chileToUtc, chileWeekday, fmtDateTime } from "@/lib/time";
import { meetingEmail, sendEmail } from "@/lib/email";

type S = { error?: string; ok?: string } | undefined;

function refresh() {
  revalidatePath("/reuniones", "layout");
  revalidatePath("/admin/reuniones");
}

// ---------- Perfil de coach ----------
export async function saveCoach(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireAdmin();
  const coachId = str(fd, "coach_id") || user.id;
  const url = str(fd, "meeting_url");
  if (url && !/^https:\/\//.test(url)) return { error: "El link de reunión debe empezar con https://" };
  const { error } = await supabase.from("coaches").upsert({
    user_id: coachId,
    specialty: str(fd, "specialty"),
    bio: str(fd, "bio") || null,
    meeting_url: url || null,
    duration_min: Math.min(240, Math.max(15, Number(str(fd, "duration_min")) || 60)),
    active: fd.get("active") === "on",
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: "Perfil de coach guardado ✅" };
}

// ---------- Disponibilidad ----------
export async function addSlots(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireAdmin();
  const coachId = str(fd, "coach_id") || user.id;
  const { data: coach } = await supabase.from("coaches").select("duration_min").eq("user_id", coachId).maybeSingle();
  if (!coach) return { error: "Primero guarda tu perfil de coach." };

  const from = str(fd, "from");
  const until = str(fd, "until") || from;
  const days = fd.getAll("weekday").map(Number);
  const times = str(fd, "times")
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t));
  if (!from) return { error: "Elige la fecha." };
  if (!times.length) return { error: "Escribe al menos una hora, por ejemplo 10:00, 11:30" };
  if (until < from) return { error: "La fecha final debe ser después de la inicial." };

  const rows: { coach_id: string; starts_at: string; ends_at: string }[] = [];
  const now = Date.now();
  for (let key = from, n = 0; key <= until && n < 120; key = addDaysKey(key, 1), n++) {
    if (from !== until && days.length && !days.includes(chileWeekday(key))) continue;
    for (const t of times) {
      const start = chileToUtc(key, t.padStart(5, "0"));
      if (start.getTime() < now) continue;
      rows.push({
        coach_id: coachId,
        starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + coach.duration_min * 60000).toISOString(),
      });
    }
  }
  if (!rows.length) return { error: "No quedó ningún horario futuro con esos datos." };
  if (rows.length > 300) return { error: "Son demasiados horarios de una vez (máx. 300)." };
  const { error } = await supabase.from("coach_slots").upsert(rows, { onConflict: "coach_id,starts_at", ignoreDuplicates: true });
  if (error) return { error: error.message };
  refresh();
  return { ok: `Se agregaron ${rows.length} horarios ✅` };
}

export async function deleteSlot(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const { data: taken } = await supabase.from("meetings").select("id").eq("slot_id", id).neq("status", "cancelada").limit(1);
  if (taken?.length) return; // no se borran horarios con reunión activa
  await supabase.from("coach_slots").delete().eq("id", id);
  refresh();
}

export async function clearFreeSlots(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const coachId = str(fd, "coach_id") || user.id;
  const { data: taken } = await supabase.rpc("taken_slot_ids");
  const takenIds = ((taken ?? []) as string[]).filter(Boolean);
  let q = supabase.from("coach_slots").delete().eq("coach_id", coachId).gt("starts_at", new Date().toISOString());
  if (takenIds.length) q = q.not("id", "in", `(${takenIds.join(",")})`);
  await q;
  refresh();
}

// ---------- Agendar / cancelar ----------
async function notify(meetingId: string, kind: "agendada" | "cancelada") {
  const { supabase } = await requireActive();
  const [{ data: c }, { data: m }] = await Promise.all([
    supabase.rpc("meeting_contacts", { mid: meetingId }),
    supabase.from("meetings").select("starts_at, topic, meeting_url").eq("id", meetingId).maybeSingle(),
  ]);
  const contact = (c ?? [])[0] as { coach_name: string; coach_email: string; student_name: string; student_email: string } | undefined;
  if (!contact || !m) return;
  const when = fmtDateTime(m.starts_at);
  await Promise.all([
    sendEmail({ to: contact.student_email, ...meetingEmail(kind, { forCoach: false, otherName: contact.coach_name, when, topic: m.topic, url: m.meeting_url }) }),
    sendEmail({ to: contact.coach_email, ...meetingEmail(kind, { forCoach: true, otherName: contact.student_name, when, topic: m.topic, url: m.meeting_url }) }),
  ]);
}

export async function bookSlot(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireActive();
  const topic = str(fd, "topic");
  if (!topic) return { error: "Cuéntale al coach de qué quieres hablar." };
  const { data, error } = await supabase.rpc("book_slot", { sid: str(fd, "slot_id"), p_topic: topic });
  if (error) return { error: error.message };
  await notify(data as string, "agendada");
  refresh();
  redirect("/reuniones?agendada=1");
}

export async function cancelMeeting(fd: FormData) {
  const { supabase } = await requireActive();
  const id = str(fd, "id");
  const { error } = await supabase.rpc("cancel_meeting", { mid: id });
  if (!error) await notify(id, "cancelada");
  refresh();
}

// ---------- Registro (coach / equipo) ----------
export async function updateMeeting(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!["agendada", "realizada", "cancelada", "no_asistio"].includes(status)) return { error: "Estado no válido." };
  const url = str(fd, "meeting_url");
  const { error } = await supabase
    .from("meetings")
    .update({
      status,
      coach_notes: str(fd, "coach_notes") || null,
      meeting_url: url || null,
      updated_at: new Date().toISOString(),
      ...(status === "cancelada" ? { cancelled_by: user.id } : {}),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Guardado ✅" };
}

export async function todayKey() {
  return chileDateKey(new Date());
}
