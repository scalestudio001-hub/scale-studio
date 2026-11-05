import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { bookSlot, cancelMeeting } from "@/app/actions/meetings";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { chileDateKey, fmtDay, fmtDateTime, fmtTime, isoFromNow } from "@/lib/time";
import { MeetingTabs } from "./tabs";
import { StatusChip } from "./status";

export const metadata: Metadata = { title: "Reuniones" };

type Coach = {
  user_id: string;
  specialty: string;
  bio: string | null;
  duration_min: number;
  profile: { full_name: string; avatar_url: string | null } | null;
};
type Slot = { id: string; coach_id: string; starts_at: string; ends_at: string };
type Meeting = {
  id: string;
  starts_at: string;
  ends_at: string;
  topic: string;
  status: string;
  meeting_url: string | null;
  coach: { full_name: string; avatar_url: string | null } | null;
};

export default async function MeetingsPage({ searchParams }: PageProps<"/reuniones">) {
  const { supabase, user, profile } = await requireActive();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";
  const coachParam = typeof sp.coach === "string" ? sp.coach : "";
  const slotParam = typeof sp.slot === "string" ? sp.slot : "";

  const nowIso = isoFromNow();
  const in30 = isoFromNow(30 * 86400000);

  const [{ data: coachesRaw }, { data: slotsRaw }, { data: taken }, { data: mine }] = await Promise.all([
    supabase.from("coaches").select("user_id, specialty, bio, duration_min, profile:profiles!coaches_user_id_fkey(full_name, avatar_url)").eq("active", true),
    supabase.from("coach_slots").select("id, coach_id, starts_at, ends_at").gt("starts_at", isoFromNow(3600000)).lt("starts_at", in30).order("starts_at"),
    supabase.rpc("taken_slot_ids"),
    supabase
      .from("meetings")
      .select("id, starts_at, ends_at, topic, status, meeting_url, coach:profiles!meetings_coach_id_fkey(full_name, avatar_url)")
      .eq("student_id", user.id)
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);

  const coaches = ((coachesRaw ?? []) as unknown as Coach[]).filter((c) => c.user_id !== user.id);
  const takenSet = new Set(((taken ?? []) as string[]).filter(Boolean));
  const free = ((slotsRaw ?? []) as Slot[]).filter((s) => !takenSet.has(s.id));
  const freeCount = (id: string) => free.filter((s) => s.coach_id === id).length;

  const coach = coaches.find((c) => c.user_id === coachParam);
  const coachSlots = coach ? free.filter((s) => s.coach_id === coach.user_id) : [];
  const byDay = new Map<string, Slot[]>();
  coachSlots.forEach((s) => {
    const k = chileDateKey(s.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  });
  const selected = coachSlots.find((s) => s.id === slotParam);

  const meetings = (mine ?? []) as unknown as Meeting[];
  const upcoming = meetings.filter((m) => m.status === "agendada" && m.ends_at > nowIso).reverse();
  const history = meetings.filter((m) => !(m.status === "agendada" && m.ends_at > nowIso));

  return (
    <>
      <PageHeader eyebrow="Reuniones" title="Agenda con un coach" subtitle="Elige un coach, un horario y cuéntale de qué quieres hablar." />
      <MeetingTabs isAdmin={isAdmin} />

      {sp.agendada === "1" && (
        <p className="anim-fade-up mb-6 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          ✅ ¡Reunión agendada! Te llegará un correo de confirmación. La encuentras abajo en “Próximas reuniones”.
        </p>
      )}

      {/* Próximas */}
      <section className="mb-10">
        <p className="eyebrow mb-4">Próximas reuniones</p>
        {upcoming.length === 0 ? (
          <p className="card p-5 text-sm text-muted">No tienes reuniones agendadas.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((m) => (
              <div key={m.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={m.coach?.full_name || "Coach"} url={m.coach?.avatar_url} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.coach?.full_name}</p>
                    <p className="text-sm capitalize text-brand">{fmtDateTime(m.starts_at)}</p>
                  </div>
                  <StatusChip status={m.status} />
                </div>
                {m.topic && <p className="mt-3 line-clamp-2 text-sm text-ink/75">{m.topic}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {m.meeting_url ? (
                    <a href={m.meeting_url} target="_blank" rel="noopener noreferrer" className="btn-primary h-10 px-4">Entrar a la reunión ↗</a>
                  ) : (
                    <span className="text-xs text-muted">El coach compartirá el link antes de la reunión.</span>
                  )}
                  <form action={cancelMeeting} className="ml-auto">
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmButton message="¿Cancelar esta reunión? El horario quedará libre para otra persona." className="btn-ghost h-10 px-4 text-xs">
                      Cancelar
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agendar */}
      <section className="mb-10">
        <p className="eyebrow mb-4">Agendar nueva reunión</p>
        {coaches.length === 0 ? (
          <EmptyState title="Aún no hay coaches con agenda" text="Muy pronto el equipo va a publicar sus horarios." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((c) => {
              const active = c.user_id === coachParam;
              const n = freeCount(c.user_id);
              return (
                <Link
                  key={c.user_id}
                  href={active ? "/reuniones" : `/reuniones?coach=${c.user_id}`}
                  scroll={false}
                  className={`card card-hover p-5 ${active ? "border-brand" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={c.profile?.full_name || "Coach"} url={c.profile?.avatar_url} size={48} />
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold uppercase leading-tight">{c.profile?.full_name}</p>
                      <p className="font-serif text-[15px] italic text-brand">{c.specialty || "Coach"}</p>
                    </div>
                  </div>
                  {c.bio && <p className="mt-3 line-clamp-2 text-sm text-muted">{c.bio}</p>}
                  <p className="mt-3 text-xs text-muted">
                    {c.duration_min} min · {n ? `${n} horarios disponibles` : "sin horarios por ahora"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        {coach && (
          <div className="card anim-fade-up mt-5 p-5 sm:p-6">
            <p className="mb-4 font-semibold">
              Horarios de <span className="text-brand">{coach.profile?.full_name}</span> <span className="text-sm font-normal text-muted">(hora de Chile)</span>
            </p>
            {byDay.size === 0 ? (
              <p className="text-sm text-muted">Este coach no tiene horarios libres en los próximos 30 días.</p>
            ) : (
              <div className="space-y-4">
                {[...byDay.entries()].map(([day, list]) => (
                  <div key={day}>
                    <p className="label capitalize">{fmtDay(list[0].starts_at)}</p>
                    <div className="flex flex-wrap gap-2">
                      {list.map((s) => (
                        <Link
                          key={s.id}
                          href={`/reuniones?coach=${coach.user_id}&slot=${s.id}#confirmar`}
                          scroll={false}
                          className={`rounded-md border px-3.5 py-2 text-sm font-semibold transition ${
                            s.id === slotParam ? "border-brand bg-brand text-on-brand" : "border-line hover:border-brand hover:text-brand"
                          }`}
                        >
                          {fmtTime(s.starts_at)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected && (
              <div id="confirmar" className="mt-6 rounded-md border border-brand/50 bg-brand-soft p-5">
                <p className="font-semibold capitalize">📅 {fmtDateTime(selected.starts_at)} · {coach.duration_min} min</p>
                <ActionForm action={bookSlot} submitLabel="Confirmar reunión" pendingText="Agendando…" className="mt-4 space-y-3" buttonClassName="btn-primary">
                  <input type="hidden" name="slot_id" value={selected.id} />
                  <label className="label" htmlFor="topic">¿De qué quieres hablar?</label>
                  <textarea id="topic" name="topic" required maxLength={500} className="input min-h-24" placeholder="Ej: revisar mi landing antes de lanzar campañas" />
                  <p className="text-xs text-muted">El coach te espera máximo 15 minutos. Si no puedes asistir, cancela para liberar el horario.</p>
                </ActionForm>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Historial */}
      {history.length > 0 && (
        <section>
          <p className="eyebrow mb-4">Historial</p>
          <div className="card divide-y divide-line">
            {history.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                <span className="w-56 capitalize text-muted">{fmtDateTime(m.starts_at)}</span>
                <span className="font-semibold">{m.coach?.full_name}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{m.topic}</span>
                <StatusChip status={m.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
