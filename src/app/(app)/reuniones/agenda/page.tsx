import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { addSlots, clearFreeSlots, deleteSlot, saveCoach } from "@/app/actions/meetings";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Avatar, PageHeader } from "@/components/ui";
import { chileDateKey, fmtDay, fmtTime, isoFromNow } from "@/lib/time";
import type { AdminUser } from "@/lib/types";
import { MeetingTabs } from "../tabs";
import { MeetingEditor } from "../meeting-editor";
import { StatusChip } from "../status";

export const metadata: Metadata = { title: "Mi agenda" };

const DAYS = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mié" }, { v: 4, l: "Jue" }, { v: 5, l: "Vie" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];

type Coach = { user_id: string; specialty: string; bio: string | null; meeting_url: string | null; duration_min: number; active: boolean };
type Slot = { id: string; starts_at: string; ends_at: string };
type Meeting = {
  id: string; slot_id: string | null; starts_at: string; topic: string; status: string; meeting_url: string | null; coach_notes: string | null;
  student: { full_name: string; avatar_url: string | null } | null;
};

export default async function AgendaPage({ searchParams }: PageProps<"/reuniones/agenda">) {
  const { supabase, user } = await requireAdmin();
  const sp = await searchParams;

  const { data: users } = await supabase.rpc("admin_list_users");
  const team = ((users ?? []) as AdminUser[]).filter((u) => u.role === "admin");
  const coachId = typeof sp.coach === "string" && team.some((t) => t.id === sp.coach) ? sp.coach : user.id;
  const coachUser = team.find((t) => t.id === coachId);

  const nowIso = isoFromNow();
  const [{ data: coach }, { data: slots }, { data: meetings }] = await Promise.all([
    supabase.from("coaches").select("*").eq("user_id", coachId).maybeSingle<Coach>(),
    supabase.from("coach_slots").select("id, starts_at, ends_at").eq("coach_id", coachId).gt("starts_at", nowIso).order("starts_at").limit(300),
    supabase
      .from("meetings")
      .select("id, slot_id, starts_at, topic, status, meeting_url, coach_notes, student:profiles!meetings_student_id_fkey(full_name, avatar_url)")
      .eq("coach_id", coachId)
      .gt("starts_at", isoFromNow(-7 * 86400000))
      .neq("status", "cancelada")
      .order("starts_at"),
  ]);

  const ms = (meetings ?? []) as unknown as Meeting[];
  const bySlot = new Map(ms.filter((m) => m.slot_id).map((m) => [m.slot_id!, m]));
  const byDay = new Map<string, Slot[]>();
  ((slots ?? []) as Slot[]).forEach((s) => {
    const k = chileDateKey(s.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  });
  const today = chileDateKey(nowIso);
  const pending = ms.filter((m) => m.status === "agendada");

  return (
    <>
      <PageHeader eyebrow="Reuniones" title="Mi agenda de coach" subtitle="Publica tus horarios y registra cómo fue cada reunión." />
      <MeetingTabs isAdmin />

      {team.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Agenda de:</span>
          {team.map((t) => (
            <Link
              key={t.id}
              href={t.id === user.id ? "/reuniones/agenda" : `/reuniones/agenda?coach=${t.id}`}
              className={`chip h-8 border px-3 ${t.id === coachId ? "border-brand bg-brand text-on-brand" : "border-line text-muted hover:border-brand hover:text-brand"}`}
            >
              {t.id === user.id ? "Yo" : t.full_name.split(" ")[0]}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Reuniones por atender */}
          <section className="card p-5 sm:p-6">
            <p className="eyebrow mb-4">Reuniones agendadas ({pending.length})</p>
            {pending.length === 0 && <p className="text-sm text-muted">No hay reuniones agendadas.</p>}
            <div className="space-y-4">
              {pending.map((m) => (
                <div key={m.id} className="rounded-md border border-line p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={m.student?.full_name || "Alumno"} url={m.student?.avatar_url} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{m.student?.full_name}</p>
                      <p className="text-sm capitalize text-brand">{fmtDay(m.starts_at)} · {fmtTime(m.starts_at)}</p>
                    </div>
                    <StatusChip status={m.status} />
                  </div>
                  {m.topic && <p className="mt-2 text-sm text-ink/80">💬 {m.topic}</p>}
                  <MeetingEditor m={m} />
                </div>
              ))}
            </div>
          </section>

          {/* Horarios publicados */}
          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="eyebrow">Horarios publicados</p>
              {byDay.size > 0 && (
                <form action={clearFreeSlots}>
                  <input type="hidden" name="coach_id" value={coachId} />
                  <ConfirmButton message="¿Borrar todos los horarios libres futuros? Las reuniones agendadas no se tocan." className="text-xs text-muted hover:text-red-400">
                    Borrar horarios libres
                  </ConfirmButton>
                </form>
              )}
            </div>
            {byDay.size === 0 && <p className="text-sm text-muted">Aún no hay horarios. Agrégalos en el panel de la derecha →</p>}
            <div className="space-y-4">
              {[...byDay.entries()].map(([day, list]) => (
                <div key={day}>
                  <p className="label capitalize">{fmtDay(list[0].starts_at)}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((s) => {
                      const m = bySlot.get(s.id);
                      return m ? (
                        <span key={s.id} className="rounded-md border border-brand bg-brand-soft px-3 py-1.5 text-sm" title={m.topic}>
                          <b className="text-brand">{fmtTime(s.starts_at)}</b> · {m.student?.full_name?.split(" ")[0]}
                        </span>
                      ) : (
                        <form key={s.id} action={deleteSlot} className="group">
                          <input type="hidden" name="id" value={s.id} />
                          <button className="rounded-md border border-line px-3 py-1.5 text-sm transition hover:border-red-800 hover:text-red-400" title="Clic para borrar este horario">
                            {fmtTime(s.starts_at)} <span className="hidden group-hover:inline">✕</span>
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Agregar horarios */}
          <section className="card p-5">
            <p className="eyebrow mb-4">Agregar horarios</p>
            {!coach ? (
              <p className="text-sm text-muted">Primero guarda el perfil de coach (abajo).</p>
            ) : (
              <ActionForm action={addSlots} submitLabel="Publicar horarios" resetOnSuccess>
                <input type="hidden" name="coach_id" value={coachId} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Desde</label>
                    <input type="date" name="from" min={today} defaultValue={today} className="input" required />
                  </div>
                  <div>
                    <label className="label">Hasta</label>
                    <input type="date" name="until" min={today} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Días (si eliges un rango)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d) => (
                      <label key={d.v} className="cursor-pointer">
                        <input type="checkbox" name="weekday" value={d.v} defaultChecked={d.v >= 1 && d.v <= 5} className="peer sr-only" />
                        <span className="inline-block rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">
                          {d.l}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Horas (hora de Chile)</label>
                  <input name="times" className="input" placeholder="10:00, 11:30, 16:00" required />
                  <p className="mt-1 text-xs text-muted">Cada horario dura {coach.duration_min} min. Si dejas “Hasta” vacío, se crean solo para ese día.</p>
                </div>
              </ActionForm>
            )}
          </section>

          {/* Perfil de coach */}
          <section className="card p-5">
            <p className="eyebrow mb-4">Perfil de coach {coachUser && coachId !== user.id ? `· ${coachUser.full_name}` : ""}</p>
            <ActionForm action={saveCoach} submitLabel="Guardar perfil" buttonClassName="btn-ghost w-full">
              <input type="hidden" name="coach_id" value={coachId} />
              <div>
                <label className="label">Especialidad</label>
                <input name="specialty" defaultValue={coach?.specialty ?? ""} className="input" placeholder="Ej: Meta Ads y tecnología" />
              </div>
              <div>
                <label className="label">Descripción corta</label>
                <textarea name="bio" defaultValue={coach?.bio ?? ""} className="input min-h-20" placeholder="En qué puedo ayudarte en la reunión" />
              </div>
              <div>
                <label className="label">Link fijo de reunión</label>
                <input name="meeting_url" defaultValue={coach?.meeting_url ?? ""} className="input" placeholder="https://meet.google.com/…" />
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <div>
                  <label className="label">Duración (min)</label>
                  <input name="duration_min" type="number" min={15} max={240} step={15} defaultValue={coach?.duration_min ?? 60} className="input" />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm">
                  <input type="checkbox" name="active" defaultChecked={coach?.active ?? true} className="h-4 w-4 accent-[var(--brand)]" />
                  Visible para alumnos
                </label>
              </div>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
