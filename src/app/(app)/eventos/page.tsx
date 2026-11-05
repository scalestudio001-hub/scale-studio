import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { deleteEvent, saveEvent, toggleRsvp } from "@/app/actions/extras";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, EmptyState, PageHeader, RichText } from "@/components/ui";
import { TZ, chileDateKey, fmtTime, isoFromNow } from "@/lib/time";
import type { Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Eventos" };

type Ev = {
  id: string; title: string; description: string | null; starts_at: string; ends_at: string;
  location_url: string | null; cover_url: string | null; plan_id: string | null;
  event_rsvps: { user_id: string; profile: { full_name: string; avatar_url: string | null } | null }[];
};

const gcal = (e: Ev) => {
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${f(e.starts_at)}/${f(e.ends_at)}`,
    details: `${e.description ?? ""}${e.location_url ? `\n\nLink: ${e.location_url}` : ""}`,
    location: e.location_url ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
};

function EventForm({ plans, e }: { plans: Plan[]; e?: Ev }) {
  const durationMin = e ? Math.round((new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60000) : 60;
  return (
    <ActionForm action={saveEvent} submitLabel={e ? "Guardar evento" : "Crear evento 📆"} className="space-y-3" buttonClassName={e ? "btn-ghost h-10 w-full" : "btn-primary w-full"} resetOnSuccess={!e}>
      {e && <input type="hidden" name="id" value={e.id} />}
      <input name="title" defaultValue={e?.title} className="input" placeholder="Ej: Webinar mensual en vivo" required maxLength={140} />
      <div className="grid grid-cols-3 gap-2">
        <input type="date" name="date" defaultValue={e ? chileDateKey(e.starts_at) : ""} className="input col-span-2 px-2" required />
        <input type="time" name="time" defaultValue={e ? fmtTime(e.starts_at) : "19:00"} className="input px-2" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select name="duration" defaultValue={String(durationMin)} className="input py-2 text-sm">
          {[30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
        <select name="plan_id" defaultValue={e?.plan_id ?? ""} className="input py-2 text-sm">
          <option value="">Todos los alumnos</option>
          {plans.map((p) => <option key={p.id} value={p.id}>Solo {p.name}</option>)}
        </select>
      </div>
      <input name="location_url" defaultValue={e?.location_url ?? ""} className="input" placeholder="Link (Zoom, Meet, YouTube…)" />
      <input name="cover_url" defaultValue={e?.cover_url ?? ""} className="input" placeholder="Imagen de portada (link, opcional)" />
      <textarea name="description" defaultValue={e?.description ?? ""} className="input min-h-20" placeholder="De qué se trata" />
      <p className="text-xs text-muted">Hora de Chile. Al crearlo, se avisa a todos en la campana 🔔.</p>
    </ActionForm>
  );
}

export default async function EventsPage() {
  const { supabase, user, profile } = await requireActive();
  const isAdmin = profile.role === "admin";
  const since = isoFromNow(-60 * 86400000);
  const now = isoFromNow();
  const [{ data }, { data: plans }] = await Promise.all([
    supabase
      .from("events")
      .select("*, event_rsvps(user_id, profile:profiles!event_rsvps_user_id_fkey(full_name, avatar_url))")
      .gt("ends_at", since)
      .order("starts_at"),
    isAdmin ? supabase.from("plans").select("id, name").order("name") : Promise.resolve({ data: [] }),
  ]);
  const events = (data ?? []) as unknown as Ev[];
  const upcoming = events.filter((e) => e.ends_at >= now);
  const past = events.filter((e) => e.ends_at < now).reverse();

  const dayBox = (d: string) => {
    const date = new Date(d);
    return {
      day: date.toLocaleDateString("es-CL", { timeZone: TZ, day: "2-digit" }),
      month: date.toLocaleDateString("es-CL", { timeZone: TZ, month: "short" }).replace(".", ""),
      weekday: date.toLocaleDateString("es-CL", { timeZone: TZ, weekday: "long" }),
    };
  };

  return (
    <>
      <PageHeader eyebrow="Calendario" title="Eventos" subtitle="Clases en vivo, webinars y encuentros de la comunidad." />
      <div className={`grid gap-6 ${isAdmin ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <div className="space-y-4">
          {upcoming.length === 0 && <EmptyState title="No hay eventos próximos" text="Cuando el equipo agende uno, aparecerá aquí y te avisaremos en la campana 🔔." />}
          {upcoming.map((e) => {
            const b = dayBox(e.starts_at);
            const going = e.event_rsvps.some((r) => r.user_id === user.id);
            const live = e.starts_at <= now && e.ends_at >= now;
            return (
              <article key={e.id} className={`card overflow-hidden ${live ? "border-red-500/60" : ""}`}>
                {e.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.cover_url} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="flex gap-5 p-5 sm:p-6">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-brand/50 bg-brand-soft text-center">
                    <div>
                      <p className="font-display text-3xl font-bold leading-none text-brand">{b.day}</p>
                      <p className="text-xs font-semibold uppercase tracking-widest">{b.month}</p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {live && <span className="chip animate-pulse bg-red-500 text-white">● En vivo ahora</span>}
                      <h2 className="font-display text-2xl font-semibold uppercase leading-tight">{e.title}</h2>
                    </div>
                    <p className="mt-1 text-sm capitalize text-brand">
                      {b.weekday} · {fmtTime(e.starts_at)} – {fmtTime(e.ends_at)} hrs
                    </p>
                    {e.description && <RichText text={e.description} className="mt-3 text-sm text-ink/80" />}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <form action={toggleRsvp}>
                        <input type="hidden" name="event_id" value={e.id} />
                        <input type="hidden" name="going" value={going ? "1" : "0"} />
                        <SubmitButton className={going ? "btn-ghost h-10 border-brand text-brand" : "btn-primary h-10"} pendingText="…">
                          {going ? "✓ Voy a asistir" : "Asistiré"}
                        </SubmitButton>
                      </form>
                      {e.location_url && (
                        <a href={e.location_url} target="_blank" rel="noopener noreferrer" className={live ? "btn-primary h-10" : "btn-ghost h-10"}>
                          {live ? "Entrar ahora ↗" : "Link del evento ↗"}
                        </a>
                      )}
                      <a href={gcal(e)} target="_blank" rel="noopener noreferrer" className="btn-ghost h-10 text-xs">+ Google Calendar</a>
                      <a href={`/eventos/ics?id=${e.id}`} className="btn-ghost h-10 text-xs">+ Calendario (.ics)</a>
                    </div>

                    {e.event_rsvps.length > 0 && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {e.event_rsvps.slice(0, 6).map((r) => (
                            <span key={r.user_id} className="rounded-full ring-2 ring-surface">
                              <Avatar name={r.profile?.full_name || "?"} url={r.profile?.avatar_url} size={28} />
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-muted">{e.event_rsvps.length} {e.event_rsvps.length === 1 ? "asistirá" : "asistirán"}</span>
                      </div>
                    )}

                    {isAdmin && (
                      <details className="mt-4 border-t border-line pt-3">
                        <summary className="cursor-pointer list-none text-xs font-semibold text-brand">✏️ Editar evento</summary>
                        <div className="mt-3 max-w-md">
                          <EventForm plans={(plans ?? []) as Plan[]} e={e} />
                          <form action={deleteEvent} className="mt-2">
                            <input type="hidden" name="id" value={e.id} />
                            <ConfirmButton message="¿Eliminar este evento?" className="text-xs text-muted hover:text-red-400">Eliminar evento</ConfirmButton>
                          </form>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {past.length > 0 && (
            <details className="card">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-muted">Eventos pasados ({past.length})</summary>
              <div className="divide-y divide-line border-t border-line">
                {past.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-40 capitalize text-muted">{dayBox(e.starts_at).weekday} {dayBox(e.starts_at).day} {dayBox(e.starts_at).month}</span>
                    <span className="flex-1 font-semibold">{e.title}</span>
                    {e.location_url && <a href={e.location_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand">Ver grabación / link ↗</a>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {isAdmin && (
          <div className="card h-fit p-5">
            <p className="eyebrow mb-4">Nuevo evento</p>
            <EventForm plans={(plans ?? []) as Plan[]} />
          </div>
        )}
      </div>
    </>
  );
}
